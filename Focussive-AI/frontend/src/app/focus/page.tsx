'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';

import { useApi } from '@/lib/query';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { requestPermission, notifyFocusBreak } from '@/lib/notifications';
import { useAuthStore } from '@/lib/auth.store';
import '../zen-pages.css';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface FocusSession {
  id: string;
  durationMinutes: number;
  xpEarned: number;
}

const DURATIONS = [25, 45, 90];

type SessionState = 'idle' | 'running' | 'paused' | 'break' | 'done';

const STORAGE_KEY = 'focussive-focus-session';

interface StoredSession {
  sessionId: string | null;
  state: SessionState;
  selectedTask: string;
  duration: number;
  secondsLeft: number;
  elapsed: number;
  startedAt: number | null; // timestamp when running
  completedAt: number | null;
}

function loadStored(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function saveStored(data: StoredSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearStored() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export default function FocusPage() {
  const router = useRouter();
  const { data: tasks } = useApi<Task[]>('/tasks?filter=pending');
  const { data: history, refetch: refetchHistory } = useApi<FocusSession[]>('/focus/history');

  const [selectedTask, setSelectedTask] = useState<string>('');
  const [duration, setDuration] = useState(25);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<SessionState>('idle');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [elapsed, setElapsed] = useState(0);
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const completeRef = useRef<() => Promise<void>>(async () => {});

  /* ── Immersive background: show the time-of-day scene ── */
  useEffect(() => {
    document.body.classList.add('zen-bg-override');
    return () => { document.body.classList.remove('zen-bg-override'); };
  }, []);

  // Initialize from localStorage
  useEffect(() => {
    const stored = loadStored();
    if (stored && stored.state !== 'idle' && stored.state !== 'done') {
      setSessionId(stored.sessionId);
      setState(stored.state);
      setSelectedTask(stored.selectedTask);
      setDuration(stored.duration);

      // If was running, calculate actual elapsed time since startedAt
      if (stored.state === 'running' && stored.startedAt) {
        const now = Date.now();
        const extraElapsed = Math.floor((now - stored.startedAt) / 1000);
        const newElapsed = stored.elapsed + extraElapsed;
        const totalSecs = stored.duration * 60;
        const newSecondsLeft = Math.max(0, totalSecs - newElapsed);
        setElapsed(newElapsed);
        setSecondsLeft(newSecondsLeft);
        startedAtRef.current = now; // reset start reference to now for future ticks
        // If timer already finished while away, auto-complete
        if (newSecondsLeft <= 0) {
          completeRef.current();
          return;
        }
      } else {
        setSecondsLeft(stored.secondsLeft);
        setElapsed(stored.elapsed);
        if (stored.startedAt) startedAtRef.current = stored.startedAt;
      }
    }
  }, []);

  // Persist to localStorage on changes
  const persist = useCallback(() => {
    saveStored({
      sessionId,
      state,
      selectedTask,
      duration,
      secondsLeft,
      elapsed,
      startedAt: startedAtRef.current,
      completedAt: state === 'done' ? Date.now() : null,
    });
  }, [sessionId, state, selectedTask, duration, secondsLeft, elapsed]);

  useEffect(() => { persist(); }, [persist]);

  // Live countdown with background support
  useEffect(() => {
    if (state === 'running') {
      if (!startedAtRef.current) startedAtRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setState('break');
            notifyFocusBreak('work_complete');
            handleComplete();
            return 0;
          }
          return s - 1;
        });
        setElapsed((e) => e + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      startedAtRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state]);

  // Handle page visibility change - timer keeps running in background
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden && state === 'running') {
        // Timer continues via interval, nothing to do
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [state]);

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.code === 'Space' && state === 'running') {
        e.preventDefault();
        handlePause();
      } else if (e.code === 'Space' && state === 'paused') {
        e.preventDefault();
        handleResume();
      } else if (e.code === 'Escape') {
        router.push('/dashboard');
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state, sessionId, router]);

  async function handleStart() {
    requestPermission();
    setSecondsLeft(duration * 60);
    setElapsed(0);
    setSessionId('local-' + Date.now());
    setState('running');
  }

  function handlePause() {
    setState('paused');
  }

  function handleResume() {
    setState('running');
  }

  async function handleComplete() {
    const elapsedMs = elapsed * 1000;
    try {
      const res = await apiFetch<{ xpEarned: number }>('/focus/complete', {
        method: 'POST',
        body: JSON.stringify({
          elapsedMs,
          taskId: selectedTask || undefined,
        }),
      });
      if (res.xpEarned > 0) {
        setXpToast(res.xpEarned);
        setToast(`🎉 +${res.xpEarned} XP earned!`);
      } else {
        setToast('0 XP — focus 1+ min to earn XP (2 XP/min)');
      }
      setTimeout(() => { setXpToast(null); setToast(null); }, 4000);
      useAuthStore.getState().refreshMe();
      refetchHistory();
    } catch {
      setToast('Failed to complete session');
      setTimeout(() => setToast(null), 3000);
    }
    setState('done');
    setSessionId(null);
    clearStored();
  }

  // Expose handleComplete to ref for use in initialization effect
  completeRef.current = handleComplete;

  function handleReset() {
    setState('idle');
    setSessionId(null);
    setSecondsLeft(duration * 60);
    setElapsed(0);
    clearStored();
  }

  const totalSeconds = duration * 60;
  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference * (1 - progress);

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  const totalFocusMin = (history ?? []).reduce((s, h) => s + h.durationMinutes, 0);
  const totalXP = (history ?? []).reduce((s, h) => s + h.xpEarned, 0);

  return (
    <AppLayout>
      <div className="zen-page zen-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Toast */}
        {(xpToast || toast) && (
          <div className="zen-toast">
            {xpToast ? `🎉 +${xpToast} XP earned!` : toast}
          </div>
        )}

        {/* ═══════ HEADER ═══════ */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="zen-header-icon" style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined">timer</span>
          </div>
          <div>
            <h1 className="zen-text-primary" style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Focus Session</h1>
            <p className="zen-text-muted" style={{ fontSize: 14, margin: 0 }}>Deep work, distraction free</p>
          </div>
        </header>

        {/* Task + Duration picker (idle only) */}
        {state === 'idle' && (
          <div className="zen-glass zen-fade-in zd-2" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="zen-label" style={{ display: 'block', marginBottom: 8 }}>Task (optional)</label>
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="zen-select"
              >
                <option value="">— Free focus —</option>
                {(tasks ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="zen-label" style={{ display: 'block', marginBottom: 8 }}>Duration</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDuration(d); setSecondsLeft(d * 60); }}
                    className={duration === d ? 'zen-btn-primary' : 'zen-chip'}
                    style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Timer ring */}
        <div className="zen-glass zen-fade-in zd-3" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 256, height: 256 }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle
                cx="50" cy="50" r="42"
                fill="none" strokeWidth="8"
                className="focus-ring-track"
              />
              <circle
                cx="50" cy="50" r="42"
                fill="none" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="focus-ring-fill"
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span className="zen-text-primary" style={{ fontSize: 42, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontFamily: "'Fraunces', serif" }}>
                {fmt(secondsLeft)}
              </span>
              <span className="zen-text-muted" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>
                {state === 'idle' && 'Ready'}
                {state === 'running' && `Focusing • ${fmt(elapsed)} elapsed`}
                {state === 'paused' && `Paused • ${fmt(elapsed)} elapsed`}
                {state === 'break' && 'Time for a break!'}
                {state === 'done' && '✅ Done!'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 32 }}>
            {state === 'idle' && (
              <button
                id="focus-start"
                onClick={handleStart}
                className="zen-btn-primary"
                style={{ width: 80, height: 80, borderRadius: '50%', padding: 0, justifyContent: 'center', boxShadow: '0 16px 40px -10px rgba(50, 82, 64, 0.6)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 36 }}>play_arrow</span>
              </button>
            )}
            {state === 'running' && (
              <>
                <button
                  id="focus-pause"
                  onClick={handlePause}
                  className="zen-btn-primary"
                  style={{ width: 80, height: 80, borderRadius: '50%', padding: 0, justifyContent: 'center', boxShadow: '0 16px 40px -10px rgba(50, 82, 64, 0.6)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 36 }}>pause</span>
                </button>
                <button
                  onClick={handleComplete}
                  className="zen-icon-btn"
                  style={{ width: 48, height: 48 }}
                  title="End session"
                >
                  <span className="material-symbols-outlined">stop</span>
                </button>
              </>
            )}
            {state === 'paused' && (
              <>
                <button
                  id="focus-resume"
                  onClick={handleResume}
                  className="zen-btn-primary"
                  style={{ width: 80, height: 80, borderRadius: '50%', padding: 0, justifyContent: 'center', boxShadow: '0 16px 40px -10px rgba(50, 82, 64, 0.6)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 36 }}>play_arrow</span>
                </button>
                <button
                  onClick={handleComplete}
                  className="zen-icon-btn"
                  style={{ width: 48, height: 48 }}
                  title="End session"
                >
                  <span className="material-symbols-outlined">stop</span>
                </button>
              </>
            )}
            {(state === 'break' || state === 'done') && (
              <button
                onClick={handleReset}
                className="zen-btn-primary"
                style={{ padding: '12px 40px' }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Session stats */}
        <div className="zen-glass zen-fade-in zd-4" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--sage)' }}>bolt</span>
            <span className="zen-text-primary" style={{ fontSize: 16, fontWeight: 600 }}>All-Time Stats</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { icon: 'timelapse', value: totalFocusMin >= 60 ? `${(totalFocusMin / 60).toFixed(1)}h` : `${totalFocusMin}m`, label: 'Focused' },
              { icon: 'repeat', value: (history ?? []).length, label: 'Sessions' },
              { icon: 'auto_awesome', value: totalXP, label: 'XP Earned' },
            ].map((stat) => (
              <div key={stat.label} className="zen-chip" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 18, borderRadius: 16 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--sage)', marginBottom: 6 }}>{stat.icon}</span>
                <span className="zen-text-primary" style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {stat.value}
                </span>
                <span className="zen-label" style={{ marginTop: 4 }}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>


      </div>
    </AppLayout>
  );
}