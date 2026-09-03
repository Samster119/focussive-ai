import { Logger } from '@nestjs/common';

const logger = new Logger('GeminiHelper');

const API_KEY = () => process.env.GEMINI_API_KEY ?? '';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// ---------------------------------------------------------------------------
// Auto model detection
// ---------------------------------------------------------------------------

/** Cached resolved model name so we only call the list API once per process */
let _resolvedModel: string | null = null;

/**
 * Priority-ordered list of preferred flash model name fragments.
 * The first match found in the API's model list wins.
 */
const MODEL_PREFERENCE = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-flash',
  'gemini-pro',
];

/**
 * Fetch the list of available models from the Gemini API and pick
 * the best one according to MODEL_PREFERENCE priority.
 * Falls back to the GEMINI_MODEL env var (or gemini-3.6-flash) on error.
 */
async function detectBestModel(): Promise<string> {
  const envModel = process.env.GEMINI_MODEL;

  // If caller pinned a model in .env, respect that and skip detection
  if (envModel && envModel !== 'auto') {
    return envModel;
  }

  try {
    const url = `${BASE_URL}?key=${API_KEY()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`List models failed: ${res.status}`);

    const data: any = await res.json();
    const names: string[] = (data.models ?? [])
      .filter((m: any) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent'),
      )
      .map((m: any) => (m.name as string).replace(/^models\//, ''));

    for (const preferred of MODEL_PREFERENCE) {
      // Exact match first
      if (names.includes(preferred)) {
        logger.log(`Auto-detected Gemini model: ${preferred}`);
        return preferred;
      }
      // Prefix match (handles dated variants like gemini-3.6-flash-001)
      const match = names.find((n) => n.startsWith(preferred));
      if (match) {
        logger.log(`Auto-detected Gemini model: ${match}`);
        return match;
      }
    }

    // Nothing matched preferences — fall back to first available model
    if (names.length) {
      logger.warn(`No preferred model found; falling back to: ${names[0]}`);
      return names[0];
    }
  } catch (err) {
    logger.warn(`Model auto-detection failed (${(err as Error).message}); using fallback.`);
  }

  return 'gemini-3.6-flash';
}

/**
 * Returns the resolved model name, running auto-detection on first call
 * and caching the result for the lifetime of the process.
 */
async function getModel(): Promise<string> {
  if (_resolvedModel) return _resolvedModel;
  _resolvedModel = await detectBestModel();
  return _resolvedModel;
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export function hasGeminiKey(): boolean {
  const key = API_KEY();
  return !!key && key !== 'change-me';
}

/** Convert OpenAI-style messages to Gemini contents format */
function toGeminiContents(messages: any[]): { systemInstruction?: any; contents: any[] } {
  let systemInstruction: any;
  const contents: any[] = [];

  for (const m of messages) {
    if (m.role === 'system') {
      systemInstruction = { parts: [{ text: m.content ?? '' }] };
    } else if (m.role === 'tool') {
      // Function response — wrap in user turn
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: m.name ?? 'tool', response: { content: m.content } } }],
      });
    } else {
      const role = m.role === 'assistant' ? 'model' : 'user';
      const parts: any[] = [];

      // Handle assistant tool_calls
      if (m.tool_calls?.length) {
        for (const tc of m.tool_calls) {
          let args: any = {};
          try { args = JSON.parse(tc.function.arguments); } catch { /* empty */ }
          parts.push({ functionCall: { name: tc.function.name, args } });
        }
      } else {
        parts.push({ text: m.content ?? '' });
      }

      contents.push({ role, parts });
    }
  }

  return { systemInstruction, contents };
}

/** Convert OpenAI-style tools to Gemini function declarations */
function toGeminiTools(tools: any[]): any[] {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    },
  ];
}

/** Convert Gemini response back to OpenAI-style for easy reuse */
function fromGeminiResponse(data: any): any {
  const candidate = data.candidates?.[0];
  const parts: any[] = candidate?.content?.parts ?? [];
  const text = parts.filter((p: any) => p.text).map((p: any) => p.text).join('');
  const functionCalls = parts.filter((p: any) => p.functionCall);

  if (functionCalls.length) {
    return {
      choices: [{
        message: {
          role: 'assistant',
          content: text || null,
          tool_calls: functionCalls.map((p: any, i: number) => ({
            id: `gemini-tc-${i}`,
            type: 'function',
            function: {
              name: p.functionCall.name,
              arguments: JSON.stringify(p.functionCall.args ?? {}),
            },
          })),
        },
      }],
    };
  }

  return { choices: [{ message: { role: 'assistant', content: text } }] };
}

/** Non-streaming call with optional function calling */
export async function callGemini(options: {
  messages: any[];
  tools?: any[];
  temperature?: number;
  maxTokens?: number;
}): Promise<any> {
  const model = await getModel();
  const { systemInstruction, contents } = toGeminiContents(options.messages);

  const body: any = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 1024,
    },
  };

  if (systemInstruction) body.systemInstruction = systemInstruction;
  if (options.tools?.length) body.tools = toGeminiTools(options.tools);

  const url = `${BASE_URL}/${model}:generateContent?key=${API_KEY()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // If this model became unavailable, clear cache so next call retries detection
    _resolvedModel = null;
    throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return fromGeminiResponse(data);
}

/** Streaming call — emits tokens via onToken callback, returns full reply */
export async function streamGemini(options: {
  messages: any[];
  temperature?: number;
  maxTokens?: number;
  onToken: (token: string) => void;
}): Promise<string> {
  const model = await getModel();
  const { systemInstruction, contents } = toGeminiContents(options.messages);

  const body: any = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 1024,
    },
  };

  if (systemInstruction) body.systemInstruction = systemInstruction;

  const url = `${BASE_URL}/${model}:streamGenerateContent?alt=sse&key=${API_KEY()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    _resolvedModel = null; // clear cache on error so next attempt re-detects
    throw new Error(`Gemini stream ${res.status}: ${await res.text()}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let reply = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data: ')) continue;
      const payload = t.slice(6).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const parts: any[] = json.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.text) {
            reply += part.text;
            options.onToken(part.text);
          }
        }
      } catch { /* ignore malformed chunks */ }
    }
  }

  return reply;
}
