'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useAuthStore } from '@/lib/auth.store';
import { useApi } from '@/lib/query';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import AnimatedCounter from './AnimatedCounter';
import BlurText from './BlurText';
import GradientText from './GradientText';
import './dashboard.css';

/* ───────── Types ───────── */
interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
}

interface FocusSession {
  id: string;
  durationMinutes: number;
  xpEarned: number;
  startedAt?: string;
  createdAt?: string;
}

interface Recommendation {
  title: string;
  description: string;
  icon: string;
  actionUrl?: string;
}

/* ───────── Helpers ───────── */
function greet(name: string) {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return `Good morning, ${name}`;
  if (h >= 12 && h < 17) return `Good afternoon, ${name}`;
  if (h >= 17 && h < 21) return `Good evening, ${name}`;
  return `Good night, ${name}`;
}

function priorityTagClass(p: string) {
  const map: Record<string, string> = {
    URGENT: 'urgent',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  };
  return map[p] ?? '';
}

function buildFocusChartData(sessions: FocusSession[]) {
  const days: Record<string, number> = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-US', { weekday: 'short' });
    days[key] = 0;
  }
  sessions.forEach((s) => {
    const dateStr = s.startedAt || s.createdAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) {
      const key = d.toLocaleDateString('en-US', { weekday: 'short' });
      if (key in days) days[key] += s.durationMinutes / 60;
    }
  });
  return Object.entries(days).map(([day, hours]) => ({
    day,
    hours: Math.round(hours * 10) / 10,
  }));
}

/* ───────── Custom Tooltip ───────── */
function ZenTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'rgba(255,255,255,.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,.6)',
        borderRadius: 12,
        padding: '8px 14px',
        boxShadow: '0 8px 28px rgba(40,60,45,.18)',
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, fontSize: 12, color: '#243029' }}>{label}</p>
      <p style={{ margin: '3px 0 0', fontSize: 12, color: '#4f7f66' }}>
        {payload[0].value}h focus
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════
   DASHBOARD PAGE — Zen theme, time-aware
   ═══════════════════════════════════════ */
export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  /* ── Immersive background mode: reveal the time-of-day scene ── */
  useEffect(() => {
    document.body.classList.add('zen-bg-override');
    return () => { document.body.classList.remove('zen-bg-override'); };
  }, []);

  /* ── Live clock (updates every 30s) ── */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  /* ── API Data ── */
  const { data: allTasks, refetch: refetchTasks } = useApi<Task[]>('/tasks', { refetchIntervalMs: 10000 });
  const { data: focusHistory } = useApi<FocusSession[]>('/focus/history', { refetchIntervalMs: 10000 });
  const { data: recData } = useApi<{ recommendations: Recommendation[] }>('/recommendations', { refetchIntervalMs: 10000 });
  const { data: gamificationData } = useApi<{ stats: { currentLevel: number; currentXP: number; streakDays: number }; badges: any[] }>('/auth/gamification', { refetchIntervalMs: 10000 });

  const tasks = allTasks ?? [];
  const pending = tasks.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
  const done = tasks.filter((t) => t.status === 'COMPLETED');
  const overdue = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < new Date(),
  );

  const focusTotalMin = (focusHistory ?? []).reduce((sum, s) => sum + s.durationMinutes, 0);
  const focusHrs = Math.floor(focusTotalMin / 60);
  const focusMins = Math.round(focusTotalMin % 60);

  /* Gamification */
  const stats = gamificationData?.stats;
  const xp = stats?.currentXP ?? user?.gamification?.currentXP ?? 0;
  const level = stats?.currentLevel ?? user?.gamification?.currentLevel ?? 1;
  const streak = stats?.streakDays ?? user?.gamification?.streakDays ?? 0;

  const levelThresholds = [0, 500, 1200, 2500, 5000, 10000];
  const xpNeeded = levelThresholds[level] ?? levelThresholds[levelThresholds.length - 1];
  const xpCurrentInLevel = xp - levelThresholds[level - 1];
  const xpForNextLevel = xpNeeded - levelThresholds[level - 1];

  /* Chart Data */
  const focusChartData = useMemo(() => buildFocusChartData(focusHistory ?? []), [focusHistory]);
  const weeklyTotalHrs = focusChartData.reduce((s, d) => s + d.hours, 0);
  const weeklyH = Math.floor(weeklyTotalHrs);
  const weeklyM = Math.round((weeklyTotalHrs - weeklyH) * 60);

  /* Bar heights for "Tasks Completed" mini chart */
  const barData = useMemo(() => {
    const maxVal = Math.max(...focusChartData.map((d) => d.hours), 0.5);
    return focusChartData.map((d) => ({
      pct: Math.max(10, (d.hours / maxVal) * 100),
      active: d.hours > 0,
    }));
  }, [focusChartData]);

  /* Burnout risk */
  const burnoutLabel = overdue.length >= 3 ? 'High' : overdue.length > 0 ? 'Med' : 'Low';
  const burnoutPct = overdue.length >= 3 ? 75 : overdue.length > 0 ? 40 : 20;
  const burnoutOk = overdue.length === 0;
  const burnoutDash = `${(burnoutPct / 100) * 188} 188`;

  /* Time display */
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

  /* Streak dots (show 7) */
  const streakDots = Array.from({ length: 7 }, (_, i) => i < (streak % 8 || (streak > 0 ? 7 : 0)));

  /* ── Handlers ── */
  function handleLogout() {
    logout();
    router.push('/login');
  }

  function handleStartSession() {
    router.push('/focus');
  }

  async function toggleCompleteTask(task: Task, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    setCompletingIds((prev) => new Set(prev).add(task.id));
    try {
      await apiFetch(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      setToast(`✅ "${task.title}" completed!`);
      setTimeout(() => setToast(null), 3000);
      refetchTasks();
    } catch (err) {
      console.error('Failed to mark task as completed:', err);
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  }

  /* ═════════════ RENDER ═════════════ */
  return (
    <AppLayout>
      <div className="zen-dashboard">
        {/* Toast */}
        {toast && <div className="zen-toast">{toast}</div>}

        {/* ═══════ TOPBAR ═══════ */}
        <div className="topbar zen-fade-in zd-1">
          <div>
            <div className="greet">
              <BlurText
                text={greet(user?.fullName?.split(' ')[0] ?? 'there')}
                delay={80}
                animateBy="words"
                direction="top"
                className="display font-medium tracking-tight"
              />
              <GradientText
                colors={["#5c8a72", "#9ed3b1", "#4f7f66"]}
                animationSpeed={8}
                showBorder={false}
                className="live-pill"
              >
                <span className="live-dot" style={{ marginRight: '6px' }} />
                LIVE
              </GradientText>
            </div>
            <div className="subline">
              <span suppressHydrationWarning>{dateStr}</span>
              <span>·</span>
              <span suppressHydrationWarning>{timeStr}</span>
            </div>
          </div>
          <div className="top-actions">
            <button
              id="dashboard-start-session"
              className="btn-zen-primary"
              onClick={handleStartSession}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>
              Start Session
            </button>
            <button
              id="dashboard-logout"
              className="icon-btn"
              onClick={handleLogout}
              title="Sign out"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            </button>
            <div className="icon-btn" aria-hidden="true">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person</span>
            </div>
          </div>
        </div>

        {/* ═══════ STAT ROW ═══════ */}
        <div className="stat-row">
          {/* Card 1: Tasks Completed — dark glass */}
          <div className="glass glass-dark stat-card zen-fade-in zd-2">
            <div className="stat-top">
              <span className="stat-label">Tasks Completed</span>
              <span className="pill-tag">Weekly</span>
            </div>
            <div className="stat-big">
              <AnimatedCounter target={done.length} duration={1000} />
              {done.length > 0 && (
                <small>+{Math.min(done.length, 5)}</small>
              )}
            </div>
            <div className="bars">
              {barData.map((b, i) => (
                <i
                  key={i}
                  className={b.active ? 'on' : ''}
                  style={{ height: `${b.pct}%` }}
                />
              ))}
            </div>
          </div>

          {/* Card 2: Daily Focus */}
          <div className="glass stat-card zen-fade-in zd-3">
            <div className="stat-top">
              <span className="stat-label">Daily Focus</span>
            </div>
            <div className="stat-big">
              <AnimatedCounter target={focusHrs} duration={800} />
              <small>h</small>
              <AnimatedCounter target={focusMins} duration={800} />
              <small>m</small>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${Math.min(100, Math.round((focusTotalMin / 480) * 100))}%` }}
              />
            </div>
            <div className="legend-row">
              <span><i style={{ background: 'var(--sage)' }} />Active</span>
              <span><i style={{ background: 'var(--gold)' }} />Pause</span>
            </div>
          </div>

          {/* Card 3: Burnout Risk */}
          <div className="glass stat-card zen-fade-in zd-4" style={{ textAlign: 'center' }}>
            <div className="stat-top" style={{ textAlign: 'left' }}>
              <span className="stat-label">Burnout Risk</span>
            </div>
            <div className="ring-mini">
              <svg viewBox="0 0 74 74" width="74" height="74">
                <circle
                  className="ring-track"
                  cx="37" cy="37" r="30"
                  fill="none"
                  strokeWidth="7"
                />
                <circle
                  cx="37" cy="37" r="30"
                  fill="none"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={burnoutDash}
                  style={{
                    stroke: burnoutOk ? 'var(--sage)' : 'var(--rose)',
                    transform: 'rotate(-90deg)',
                    transformOrigin: 'center',
                  }}
                />
              </svg>
              <div className="val display">{burnoutLabel}</div>
            </div>
            {burnoutOk ? (
              <div className="ok-line">✓ Looking good</div>
            ) : (
              <div className="warn-line">⚠ Take a break</div>
            )}
          </div>

          {/* Card 4: Streak */}
          <div className="glass stat-card zen-fade-in zd-5">
            <div className="stat-top">
              <span className="stat-label">Streak</span>
            </div>
            <div className="stat-big">
              <AnimatedCounter target={streak} duration={1000} />
              <small>days</small>
            </div>
            <div className="streak-dots">
              {streakDots.map((on, i) => (
                <i key={i} className={on ? 'on' : ''} />
              ))}
            </div>
            <div className="stat-sub">
              Level {level} · {xpForNextLevel - xpCurrentInLevel} XP to next
            </div>
          </div>
        </div>

        {/* ═══════ MID GRID ═══════ */}
        <div className="mid-grid">
          {/* ── Left: Working Time Analysis ── */}
          <div className="glass panel zen-fade-in zd-5">
            <div className="panel-head">
              <h2>Working Time Analysis</h2>
              <Link href="/focus">Details →</Link>
            </div>
            <span className="panel-tag">Weekly</span>
            <div className="panel-big">
              {weeklyH}h {weeklyM}m
            </div>
            {focusChartData.some((d) => d.hours > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={focusChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="zenAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5c8a72" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#5c8a72" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#66766c' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#66766c' }}
                    width={35}
                  />
                  <Tooltip content={<ZenTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#4c6a56"
                    strokeWidth={3}
                    fill="url(#zenAreaFill)"
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-zen">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  self_improvement
                </span>
                <p>Begin your journey — start a focus session to see your weekly analysis</p>
              </div>
            )}
            <div className="legend-row" style={{ marginTop: 6 }}>
              <span><i style={{ background: 'var(--sage)' }} />Active time</span>
              <span><i style={{ background: 'var(--gold)' }} />Pause time</span>
            </div>
          </div>

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Quick Actions */}
            <div className="glass panel zen-fade-in zd-6" style={{ padding: 22 }}>
              <div className="panel-head" style={{ marginBottom: 14 }}>
                <h2 style={{ fontSize: 16 }}>Quick Actions</h2>
              </div>
              <div className="qa-grid">
                <Link href="/" className="qa">
                  <div className="qicon tint-plum">
                    <span className="material-symbols-outlined">smart_toy</span>
                  </div>
                  <span>AI Chat</span>
                </Link>
                <Link href="/focus" className="qa">
                  <div className="qicon tint-rose">
                    <span className="material-symbols-outlined">timer</span>
                  </div>
                  <span>Focus</span>
                </Link>
                <Link href="/tasks" className="qa">
                  <div className="qicon tint-sage">
                    <span className="material-symbols-outlined">checklist</span>
                  </div>
                  <span>Tasks</span>
                </Link>
                <Link href="/calendar" className="qa">
                  <div className="qicon tint-gold">
                    <span className="material-symbols-outlined">calendar_month</span>
                  </div>
                  <span>Calendar</span>
                </Link>
              </div>
            </div>

            {/* AI Wisdom / Recommendations */}
            <div className="glass panel zen-fade-in zd-7" style={{ padding: 22, flex: 1 }}>
              <div className="panel-head">
                <GradientText
                  colors={["#8577a8", "#c9a2d8", "#5c8a72"]}
                  animationSpeed={6}
                  showBorder={false}
                  className="!mx-0"
                >
                  <h2 style={{ fontSize: 16 }}>
                    {(recData?.recommendations ?? []).length > 0 ? 'AI Wisdom' : 'Today\u2019s Flow'}
                  </h2>
                </GradientText>
                <Link href="/story">Story →</Link>
              </div>
              {(recData?.recommendations ?? []).length > 0 ? (
                <div className="journey-list">
                  {recData!.recommendations.slice(0, 4).map((rec, i) => {
                    const promptText = `Can you help me implement this recommendation: \"${rec.title}\" — ${rec.description}? Please update my schedule or tasks as required.`;
                    const stateClass = i === 0 ? 'done' : i === 1 ? 'current' : '';
                    return (
                      <Link
                        key={i}
                        href={`/?prompt=${encodeURIComponent(promptText)}`}
                        className={`jrow ${stateClass}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <div className="jdot">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            {rec.icon}
                          </span>
                        </div>
                        <div className="jtitle">{rec.title}</div>
                        <div className="jtime" style={{ fontSize: 11 }}>Ask AI</div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="journey-list">
                  <Link href="/focus" className="jrow done" style={{ textDecoration: 'none' }}>
                    <div className="jdot">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>self_improvement</span>
                    </div>
                    <div className="jtitle">Deep Work</div>
                    <div className="jtime">Focus</div>
                  </Link>
                  <Link href="/tasks" className="jrow current" style={{ textDecoration: 'none' }}>
                    <div className="jdot">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>checklist</span>
                    </div>
                    <div className="jtitle">Review Tasks</div>
                    <div className="jtime">Tasks</div>
                  </Link>
                  <Link href="/diary" className="jrow" style={{ textDecoration: 'none' }}>
                    <div className="jdot">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit_note</span>
                    </div>
                    <div className="jtitle">Reflect</div>
                    <div className="jtime">Diary</div>
                  </Link>
                  <Link href="/story" className="jrow" style={{ textDecoration: 'none' }}>
                    <div className="jdot">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_stories</span>
                    </div>
                    <div className="jtitle">Story Mode</div>
                    <div className="jtime">Explore</div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════ TASKS PANEL ═══════ */}
        <div className="glass tasks-panel zen-fade-in zd-8">
          <div className="panel-head">
            <h2>Tasks</h2>
            <Link href="/tasks">View all →</Link>
          </div>

          {pending.length === 0 && done.length === 0 ? (
            <div className="empty-zen" style={{ paddingTop: 20 }}>
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <p>No tasks yet — create some to get started 🧘</p>
            </div>
          ) : (
            <>
              {/* Show completed tasks (up to 2) */}
              {done.slice(0, 2).map((task) => (
                <div
                  key={task.id}
                  className="task-item"
                  onClick={() => router.push('/tasks')}
                >
                  <div className="task-check on">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <div className="task-name is-done">
                    {task.title}
                  </div>
                  <span className="task-tag">Done</span>
                </div>
              ))}

              {/* Show pending tasks (up to 5) */}
              {pending.slice(0, 5).map((task) => {
                const isCompleting = completingIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    className="task-item"
                    onClick={() => router.push('/tasks')}
                  >
                    <button
                      className={`task-check ${isCompleting ? 'completing' : ''}`}
                      onClick={(e) => toggleCompleteTask(task, e)}
                      disabled={isCompleting}
                      title="Mark as complete"
                    >
                      {isCompleting && (
                        <span className="material-symbols-outlined" style={{ fontSize: 12, color: 'var(--sage)' }}>
                          progress_activity
                        </span>
                      )}
                    </button>
                    <div className="task-name">{task.title}</div>
                    <span className={`task-tag ${priorityTagClass(task.priority)}`}>
                      {task.status === 'IN_PROGRESS' ? 'In progress' : task.priority.toLowerCase()}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
