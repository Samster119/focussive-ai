'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import FocusMusicPlayer from '@/components/FocusMusicPlayer';
import { useApi } from '@/lib/query';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { requestPermission, notifyFocusBreak } from '@/lib/notifications';
import { useAuthStore } from '@/lib/auth.store';

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
      <div className="animate-fade-in space-y-lg">
        {(xpToast || toast) && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-white px-lg py-sm rounded-xl card-shadow font-title-sm animate-fade-in text-center">
            {xpToast ? `🎉 +${xpToast} XP earned!` : toast}
          </div>
        )}

        <PageHeader icon="timer" title="Focus Session" subtitle="Deep work, distraction free" />

        {/* Task + Duration picker (idle only) */}
        {state === 'idle' && (
          <div className="bg-surface-container-lowest p-lg rounded-xl card-shadow space-y-md">
            <div>
              <label className="font-label-caps text-outline mb-xs block">Task (optional)</label>
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full p-sm rounded-lg bg-surface-container-low border border-outline-variant/50 font-body-md focus:outline-none focus:border-primary"
              >
                <option value="">— Free focus —</option>
                {(tasks ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-label-caps text-outline mb-xs block">Duration</label>
              <div className="flex gap-sm">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDuration(d); setSecondsLeft(d * 60); }}
                    className={`px-md py-sm rounded-lg font-title-sm transition-colors ${
                      duration === d
                        ? 'bg-primary text-white'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Timer ring */}
        <div className="bg-surface-container-lowest rounded-xl card-shadow p-xl flex flex-col items-center animate-fade-in">
          <div className="relative w-64 h-64">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle
                cx="50" cy="50" r="42"
                fill="none" strokeWidth="8"
                className="stroke-surface-container-high"
              />
              <circle
                cx="50" cy="50" r="42"
                fill="none" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="stroke-primary transition-[stroke-dashoffset] duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display-lg text-display-lg font-bold text-on-surface tabular-nums text-4xl">
                {fmt(secondsLeft)}
              </span>
              <span className="font-label-caps text-on-surface-variant mt-xs">
                {state === 'idle' && 'Ready'}
                {state === 'running' && `Focusing • ${fmt(elapsed)} elapsed`}
                {state === 'paused' && `Paused • ${fmt(elapsed)} elapsed`}
                {state === 'break' && 'Time for a break!'}
                {state === 'done' && '✅ Done!'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-lg mt-xl">
            {state === 'idle' && (
              <button
                id="focus-start"
                onClick={handleStart}
                className="bg-primary hover:bg-primary-container text-white w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg"
              >
                <span className="material-symbols-outlined text-4xl">play_arrow</span>
              </button>
            )}
            {state === 'running' && (
              <>
                <button
                  id="focus-pause"
                  onClick={handlePause}
                  className="bg-primary hover:bg-primary-container text-white w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg"
                >
                  <span className="material-symbols-outlined text-4xl">pause</span>
                </button>
                <button
                  onClick={handleComplete}
                  className="bg-surface-container-low w-12 h-12 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
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
                  className="bg-primary hover:bg-primary-container text-white w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg"
                >
                  <span className="material-symbols-outlined text-4xl">play_arrow</span>
                </button>
                <button
                  onClick={handleComplete}
                  className="bg-surface-container-low w-12 h-12 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  title="End session"
                >
                  <span className="material-symbols-outlined">stop</span>
                </button>
              </>
            )}
            {(state === 'break' || state === 'done') && (
              <button
                onClick={handleReset}
                className="bg-primary hover:bg-primary-container text-white px-lg py-sm rounded-xl font-title-sm transition-all active:scale-95 w-full max-w-xs"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Session stats */}
        <div className="bg-surface-container-lowest p-lg rounded-xl card-shadow">
          <div className="flex items-center gap-sm mb-md">
            <span className="material-symbols-outlined text-primary">bolt</span>
            <span className="font-title-sm text-on-surface">All-Time Stats</span>
          </div>
          <div className="grid grid-cols-3 gap-md">
            <div className="flex flex-col items-center p-md bg-surface-container-low rounded-xl">
              <span className="material-symbols-outlined text-primary mb-xs">timelapse</span>
              <span className="font-headline-md text-headline-md font-bold text-on-surface tabular-nums">
                {totalFocusMin >= 60 ? `${(totalFocusMin / 60).toFixed(1)}h` : `${totalFocusMin}m`}
              </span>
              <span className="font-label-caps text-on-surface-variant mt-xs">Focused</span>
            </div>
            <div className="flex flex-col items-center p-md bg-surface-container-low rounded-xl">
              <span className="material-symbols-outlined text-primary mb-xs">repeat</span>
              <span className="font-headline-md text-headline-md font-bold text-on-surface tabular-nums">
                {(history ?? []).length}
              </span>
              <span className="font-label-caps text-on-surface-variant mt-xs">Sessions</span>
            </div>
            <div className="flex flex-col items-center p-md bg-surface-container-low rounded-xl">
              <span className="material-symbols-outlined text-primary mb-xs">auto_awesome</span>
              <span className="font-headline-md text-headline-md font-bold text-on-surface tabular-nums">
                {totalXP}
              </span>
              <span className="font-label-caps text-on-surface-variant mt-xs">XP Earned</span>
            </div>
          </div>
        </div>

        {/* Focus Music Integration */}
        <FocusMusicPlayer />
      </div>
    </AppLayout>
  );
}