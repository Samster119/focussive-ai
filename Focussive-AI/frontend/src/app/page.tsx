'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuthStore } from '@/lib/auth.store';
import { useApi } from '@/lib/query';
import { parseFile } from '@/lib/fileParser';
import ZenBackground from './dashboard/ZenBackground';
import './assistant.css';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/* ─── Types ─── */
interface Message {
  id: string;
  sender: 'USER' | 'AI';
  content: string;
  attachments?: { name: string; type: 'image' | 'file'; size: string; dataUrl?: string }[];
  createdAt?: string;
}

interface Attachment {
  name: string;
  type: 'image' | 'file';
  size: string;
  dataUrl?: string;
  textContent?: string;
}

/* ─── Auth token ─── */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('focussive-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string } };
    return parsed?.state?.accessToken ?? null;
  } catch { return null; }
}

/* ─── Browser capability helpers ─── */
declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}
function hasSpeechRecognition() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
function hasSpeechSynthesis() {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}

/* ─── Suggestion chips ─── */
const SUGGESTIONS = [
  { icon: 'add_task', text: 'Add a task for tomorrow', sub: 'Quickly create a new task' },
  { icon: 'lightbulb', text: 'What should I focus on today?', sub: 'Get AI-powered priorities' },
  { icon: 'account_tree', text: 'Break down my biggest task', sub: 'Turn it into micro-steps' },
  { icon: 'calendar_today', text: 'Schedule my day automatically', sub: 'Optimise your timetable' },
];

/* ══════════════════════════════════════════
   ASSISTANT PAGE
   ══════════════════════════════════════════ */
export default function AssistantPage() {
  const user = useAuthStore((s) => s.user);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const { data: history } = useApi<Message[]>('/assistant/history');

  /* ── Override body background ── */
  useEffect(() => {
    document.body.classList.add('zen-assistant-bg');
    return () => { document.body.classList.remove('zen-assistant-bg'); };
  }, []);

  /* ── Load prompt from URL query ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search).get('prompt');
    if (p) {
      setInput(p);
      setTimeout(() => textareaRef.current?.focus(), 100);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  /* ── Load chat history ── */
  useEffect(() => {
    if (history && history.length > 0 && messages.length === 0) {
      setMessages(history);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  /* ── Scroll to bottom on new messages ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  /* ── Auto-resize textarea ── */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  /* ── Cleanup speech on unmount ── */
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  /* ── File handling ── */
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setParsing(true);
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/');
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
      if (isImage) {
        const dataUrl = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = (ev) => res(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
        setAttachments((prev) => [...prev, { name: file.name, type: 'image', size: sizeStr, dataUrl }]);
      } else {
        const textContent = await parseFile(file);
        setAttachments((prev) => [...prev, { name: file.name, type: 'file', size: sizeStr, textContent }]);
      }
    }
    setParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  /* ── Voice: Speech-to-Text ── */
  const startListening = useCallback(() => {
    if (!hasSpeechRecognition()) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) setInput((prev) => prev + t + ' ');
        else interim += t;
      }
      setInterimTranscript(interim);
    };
    recognition.onerror = () => { setIsListening(false); setInterimTranscript(''); };
    recognition.onend = () => { setIsListening(false); setInterimTranscript(''); };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  /* ── Voice: Text-to-Speech ── */
  function speakMessage(msgId: string, text: string) {
    if (!hasSpeechSynthesis()) return;
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => v.lang.startsWith('en') && v.name.includes('Google'))
      || voices.find((v) => v.lang.startsWith('en') && !v.localService)
      || voices.find((v) => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  }

  /* ── Send message ── */
  async function sendMessage(text: string) {
    if ((!text.trim() && attachments.length === 0) || streaming) return;
    if (isListening) stopListening();

    const currentAttachments = [...attachments];
    const userDisplayContent = text.trim() || (currentAttachments.length === 1
      ? `Attached file: ${currentAttachments[0].name}`
      : `Attached ${currentAttachments.length} files`);

    let payloadText = text.trim();
    if (currentAttachments.length > 0) {
      const summary = currentAttachments.map((att) =>
        att.type === 'image'
          ? `📷 [Attached Image: "${att.name}" (${att.size})]\nData: ${att.dataUrl?.slice(0, 1000)}...`
          : `📄 [Attached File: "${att.name}" (${att.size})]\nExtracted Content:\n${att.textContent ?? '(empty)'}`
      ).join('\n\n');
      payloadText = payloadText
        ? `${payloadText}\n\n--- ATTACHMENTS ---\n${summary}`
        : `Please inspect and analyze the following attachments:\n\n${summary}`;
    }

    setAttachments([]);
    setInput('');

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'USER',
      content: userDisplayContent,
      attachments: currentAttachments.map((a) => ({ name: a.name, type: a.type, size: a.size, dataUrl: a.dataUrl })),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);

    const aiMsgId = `ai-${Date.now()}`;
    setMessages((prev) => [...prev, { id: aiMsgId, sender: 'AI', content: '' }]);

    try {
      const token = getToken();
      const res = await fetch(`${BASE}/assistant/converse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: payloadText, conversationId }),
      });
      if (!res.ok || !res.body) throw new Error('Stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accum = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(trimmed.slice(6)) as { token?: string; done?: boolean; conversationId?: string };
            if (json.conversationId) setConversationId(json.conversationId);
            if (json.done) { streamDone = true; break; }
            if (json.token) {
              accum += json.token;
              setMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...m, content: accum } : m));
            }
          } catch { /* skip bad chunks */ }
        }
      }
    } catch {
      setMessages((prev) => prev.map((m) =>
        m.id === aiMsgId ? { ...m, content: 'Sorry, I had trouble connecting. Please try again.' } : m
      ));
    } finally {
      setStreaming(false);
    }
  }

  const showMic = hasSpeechRecognition();
  const showTTS = hasSpeechSynthesis();
  const hasAbove = attachments.length > 0 || parsing || isListening;

  /* ════════════ RENDER ════════════ */
  return (
    <AppLayout>
      <div className="zen-assistant">
        {/* Zen nature background */}
        <ZenBackground />

        {/* ── HEADER ── */}
        <div className="asst-header">
          <div className="asst-brand">
            <div className="asst-avatar">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 24, color: '#fff', fontVariationSettings: "'FILL' 1" }}
              >
                smart_toy
              </span>
            </div>
            <div>
              <div className="asst-title">Focussive AI</div>
              <div className="asst-subtitle">Your zen productivity companion</div>
            </div>
          </div>
          <div className="asst-header-actions">
            <span className="model-pill">
              <span className="model-dot" />
              Focussive v1
            </span>
            {messages.length > 0 && (
              <button
                className="header-btn"
                onClick={() => { setMessages([]); setConversationId(undefined); }}
                title="Clear conversation"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                New chat
              </button>
            )}
          </div>
        </div>

        {/* ── MESSAGES ── */}
        <div className="asst-messages">
          {messages.length === 0 ? (
            /* Welcome screen — Gemini style */
            <div className="asst-welcome">
              <div className="asst-welcome-avatar">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 36, color: '#5c8a72', fontVariationSettings: "'FILL' 1" }}
                >
                  self_improvement
                </span>
              </div>
              <div>
                <div className="asst-welcome-heading">
                  Hello{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''} 🌿
                </div>
                <div className="asst-welcome-sub">
                  How can I help you stay focused and organised today? Upload documents, ask questions, or plan your day.
                </div>
              </div>
              <div className="asst-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    className="suggestion-chip"
                    onClick={() => sendMessage(s.text)}
                  >
                    <div className="suggestion-chip-icon">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{s.icon}</span>
                    </div>
                    <div>
                      <div className="suggestion-chip-text">{s.text}</div>
                      <div className="suggestion-chip-sub">{s.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Chat messages */
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`msg-row ${msg.sender === 'USER' ? 'user' : 'ai'}`}
                >
                  {/* AI avatar */}
                  {msg.sender === 'AI' && (
                    <div className="msg-avatar">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 16, color: '#fff', fontVariationSettings: "'FILL' 1" }}
                      >
                        smart_toy
                      </span>
                    </div>
                  )}

                  <div>
                    {/* Bubble */}
                    <div className={`msg-bubble ${msg.sender === 'AI' ? 'ai' : 'user'}`}>
                      {/* Attachment badges in user bubbles */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="bubble-attachments">
                          {msg.attachments.map((att, i) => (
                            <div key={i} className="bubble-attachment-badge">
                              {att.type === 'image' && att.dataUrl
                                ? <img src={att.dataUrl} alt={att.name} />
                                : <span className="material-symbols-outlined" style={{ fontSize: 13 }}>description</span>
                              }
                              <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {att.name}
                              </span>
                              <span style={{ opacity: 0.65, fontSize: 11 }}>({att.size})</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Message text or typing dots */}
                      {msg.content ? (
                        msg.content
                      ) : (
                        <div className="typing-dots">
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                        </div>
                      )}
                    </div>

                    {/* TTS button for AI messages */}
                    {msg.sender === 'AI' && msg.content && showTTS && msg.id !== 'welcome' && (
                      <button
                        className={`msg-tts ${speakingMsgId === msg.id ? 'speaking' : ''}`}
                        onClick={() => speakMessage(msg.id, msg.content)}
                        title={speakingMsgId === msg.id ? 'Stop reading' : 'Read aloud'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {speakingMsgId === msg.id ? 'stop_circle' : 'volume_up'}
                        </span>
                        {speakingMsgId === msg.id ? 'Stop' : 'Listen'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* ── INPUT AREA ── */}
        <div className="asst-input-wrap">
          {/* Parsing indicator */}
          {parsing && (
            <div className="asst-parsing-bar">
              <span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'asst-pulse 1s infinite' }}>
                progress_activity
              </span>
              Parsing document…
            </div>
          )}

          {/* Voice listening bar */}
          {isListening && (
            <div className="asst-voice-bar">
              <div className="voice-pulse">
                <div className="voice-pulse-ring" />
                <div className="voice-pulse-dot" />
              </div>
              <span>Listening…</span>
              {interimTranscript && (
                <span style={{ color: 'var(--text-1)', fontStyle: 'italic', fontWeight: 400 }}>
                  &ldquo;{interimTranscript}&rdquo;
                </span>
              )}
              <button className="voice-stop-btn" onClick={stopListening}>Stop</button>
            </div>
          )}

          {/* Attachment preview strip */}
          {attachments.length > 0 && (
            <div className="asst-attachment-strip">
              {attachments.map((att, idx) => (
                <div key={idx} className="attachment-badge">
                  {att.type === 'image' && att.dataUrl
                    ? <img src={att.dataUrl} alt={att.name} />
                    : <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--sage)' }}>description</span>
                  }
                  <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                    {att.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-2)' }}>({att.size})</span>
                  <button
                    className="remove-btn"
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    title="Remove"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept="image/*,.txt,.pdf,.md,.json,.csv,.js,.ts,.py,.html,.css,.doc,.docx,.pptx,.ppt,.xls,.xlsx"
            className="hidden"
            style={{ display: 'none' }}
          />

          {/* Input bar */}
          <div className={`asst-input-bar ${hasAbove ? 'has-above' : ''}`}>
            {/* Attach button */}
            <button
              type="button"
              className="input-icon-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file (PDF, Word, PowerPoint, images)"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>attach_file</span>
            </button>

            {/* Mic button */}
            {showMic && (
              <button
                type="button"
                className={`input-icon-btn ${isListening ? 'active-mic' : ''}`}
                onClick={isListening ? stopListening : startListening}
                disabled={streaming}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {isListening ? 'mic_off' : 'mic'}
                </span>
              </button>
            )}

            {/* Textarea */}
            <textarea
              id="assistant-input"
              ref={textareaRef}
              className="asst-textarea"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={
                streaming
                  ? 'AI is thinking…'
                  : isListening
                  ? 'Speak now…'
                  : 'Ask anything — or attach a document…'
              }
              disabled={streaming}
            />

            {/* Send button */}
            <button
              id="assistant-send"
              className="send-btn"
              onClick={() => sendMessage(input)}
              disabled={streaming || (!input.trim() && attachments.length === 0)}
              title="Send message"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {streaming ? 'stop' : 'arrow_upward'}
              </span>
            </button>
          </div>

          <div className="asst-input-hint">
            Press <strong>Enter</strong> to send · <strong>Shift+Enter</strong> for new line · Supports PDF, Word, PowerPoint
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
