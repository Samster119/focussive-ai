import { Logger } from '@nestjs/common';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const logger = new Logger('GroqHelper');

export function hasGroqKey(): boolean {
  const key = process.env.GROQ_API_KEY;
  return !!key && key !== 'change-me';
}

export async function callGroq(options: {
  messages: any[];
  tools?: any[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}): Promise<any> {
  const body: any = {
    model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 512,
    stream: options.stream ?? false,
  };
  if (options.tools) {
    body.tools = options.tools;
    body.tool_choice = 'auto';
  }
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function streamGroq(options: {
  messages: any[];
  temperature?: number;
  maxTokens?: number;
  onToken: (token: string) => void;
}): Promise<string> {
  const body: any = {
    model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 512,
    stream: true,
  };
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(`Groq ${res.status}`);
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
    for (const l of lines) {
      const t = l.trim();
      if (!t.startsWith('data: ')) continue;
      const p = t.slice(6);
      if (p === '[DONE]') return reply;
      try {
        const j = JSON.parse(p);
        const token = j.choices?.[0]?.delta?.content;
        if (token) {
          reply += token;
          options.onToken(token);
        }
      } catch {}
    }
  }
  return reply;
}