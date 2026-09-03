'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useApi } from '@/lib/query';
import '../zen-pages.css';

interface DailyData {
  date: string;
  tasksCompleted: number;
  focusMinutes: number;
}

interface WeeklyReport {
  dateRange: { start: string; end: string };
  dailyData: DailyData[];
  totalTasks: number;
  totalFocusMinutes: number;
}

type ChartMetric = 'focus' | 'tasks';

export default function ReportsPage() {
  const { data: report } = useApi<WeeklyReport>('/reports/weekly', { refetchIntervalMs: 10000 });
  const [metric, setMetric] = useState<ChartMetric>('focus');
  const [hoveredDay, setHoveredDay] = useState<DailyData | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  /* ── Immersive background ── */
  useEffect(() => {
    document.body.classList.add('zen-bg-override');
    return () => { document.body.classList.remove('zen-bg-override'); };
  }, []);

  const totalFocusMin = report?.totalFocusMinutes ?? 0;
  const focusHours = Math.floor(totalFocusMin / 60);
  const focusMins = totalFocusMin % 60;
  const focusStr = `${focusHours}h ${focusMins}m`;

  const totalTasks = report?.totalTasks ?? 0;
  const dailyData = report?.dailyData ?? [];
  const activeDaysCount = dailyData.filter((d) => d.focusMinutes > 0 || d.tasksCompleted > 0).length;
  const avgFocusPerActiveDay = activeDaysCount > 0 ? Math.round(totalFocusMin / activeDaysCount) : 0;

  const weeklyStats = [
    { label: 'Total Focus Time', value: focusStr, delta: `${activeDaysCount} Active Days`, icon: 'timelapse' },
    { label: 'Tasks Completed', value: String(totalTasks), delta: totalTasks > 0 ? 'Productive' : 'No tasks', icon: 'task_alt' },
    { label: 'Avg Active Focus', value: `${avgFocusPerActiveDay}m/day`, delta: 'Steady', icon: 'speed' },
    { label: 'Productivity Index', value: totalTasks > 5 || focusHours > 3 ? 'Optimal' : 'Building', delta: 'Good', icon: 'psychology' },
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartItems = dailyData.map((d) => {
    const dateObj = new Date(d.date);
    const dayName = daysOfWeek[dateObj.getDay()];
    const val = metric === 'focus' ? +(d.focusMinutes / 60).toFixed(1) : d.tasksCompleted;
    return { dateStr: d.date, day: dayName, val, tasks: d.tasksCompleted, minutes: d.focusMinutes, raw: d };
  });

  const maxVal = Math.max(1, ...chartItems.map((d) => d.val));

  return (
    <AppLayout>
      <div className="zen-page zen-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ═══════ HEADER ═══════ */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="zen-header-icon" style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined">bar_chart</span>
            </div>
            <div>
              <h1 className="zen-text-primary" style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Weekly Report &amp; Analytics</h1>
              <p className="zen-text-muted" style={{ fontSize: 14, margin: 0 }}>Deep work metrics, task completion rate, and focus trends</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="zen-icon-btn">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="zen-text-secondary" style={{ fontSize: 14, fontWeight: 600, padding: '0 8px' }}>This Week</span>
            <button className="zen-icon-btn">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </header>

        {/* ═══════ STATS GRID ═══════ */}
        <div className="zen-fade-in zd-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {weeklyStats.map((stat) => (
            <div key={stat.label} className="zen-glass" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(79, 127, 102, 0.14)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--sage)' }}>{stat.icon}</span>
                </div>
                <span className="zen-pill" style={{ fontSize: 10 }}>{stat.delta}</span>
              </div>
              <span className="zen-text-primary" style={{ fontSize: 24, fontWeight: 700, display: 'block', fontVariantNumeric: 'tabular-nums' }}>
                {stat.value}
              </span>
              <span className="zen-text-muted" style={{ fontSize: 12 }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ═══════ CHART CARD ═══════ */}
        <div className="zen-glass zen-fade-in zd-3" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--divider)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--sage)' }}>bar_chart</span>
              <span className="zen-text-primary" style={{ fontSize: 15, fontWeight: 700 }}>
                {metric === 'focus' ? 'Focus Hours Trend' : 'Tasks Completed Trend'}
              </span>
            </div>
            {/* Metric toggle */}
            <div style={{ display: 'flex', background: 'var(--chip)', borderRadius: 12, padding: 3, gap: 3 }}>
              <button
                onClick={() => setMetric('focus')}
                className={metric === 'focus' ? 'zen-btn-primary' : ''}
                style={{
                  padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: 'none', fontFamily: 'inherit',
                  background: metric === 'focus' ? undefined : 'transparent',
                  color: metric === 'focus' ? '#fff' : 'var(--text-2)',
                  transition: 'all 0.2s ease',
                }}
              >
                Focus Hours
              </button>
              <button
                onClick={() => setMetric('tasks')}
                className={metric === 'tasks' ? 'zen-btn-primary' : ''}
                style={{
                  padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: 'none', fontFamily: 'inherit',
                  background: metric === 'tasks' ? undefined : 'transparent',
                  color: metric === 'tasks' ? '#fff' : 'var(--text-2)',
                  transition: 'all 0.2s ease',
                }}
              >
                Tasks Completed
              </button>
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, height: 200, padding: '0 8px' }}>
            {chartItems.map((d, index) => {
              const heightPct = Math.max(8, Math.round((d.val / maxVal) * 100));
              const isHovered = hoveredIndex === index;
              return (
                <div
                  key={d.dateStr}
                  onMouseEnter={() => { setHoveredDay(d.raw); setHoveredIndex(index); }}
                  onMouseLeave={() => { setHoveredDay(null); setHoveredIndex(null); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer', position: 'relative' }}
                >
                  {/* Tooltip */}
                  {isHovered && hoveredDay && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                      marginBottom: 8, zIndex: 10, whiteSpace: 'nowrap',
                      background: 'var(--glass-dark)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid var(--border-dark)',
                      padding: '8px 14px', borderRadius: 12, fontSize: 12,
                      boxShadow: 'var(--shadow-2)',
                      animation: 'zen-page-fadeIn 0.15s ease',
                    }}>
                      <div className="zen-label" style={{ color: 'var(--sage)', marginBottom: 4 }}>
                        {new Date(hoveredDay.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="zen-text-primary" style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>timelapse</span>
                          {hoveredDay.focusMinutes}m
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>task_alt</span>
                          {hoveredDay.tasksCompleted}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Value label */}
                  <span className="zen-text-muted" style={{
                    fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                    fontFamily: "'JetBrains Mono', monospace",
                    color: isHovered ? 'var(--sage)' : undefined,
                    transition: 'color 0.2s ease',
                  }}>
                    {metric === 'focus' ? `${d.val}h` : d.val}
                  </span>

                  {/* Bar */}
                  <div style={{
                    width: '100%', maxWidth: 36, height: 160,
                    background: 'var(--chip)', borderRadius: '8px 8px 4px 4px',
                    display: 'flex', alignItems: 'flex-end', padding: 3, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: '100%', borderRadius: '6px 6px 2px 2px',
                      height: `${heightPct}%`,
                      background: d.val > 0
                        ? 'linear-gradient(to top, var(--sage), var(--sage-deep))'
                        : 'var(--track)',
                      transition: 'height 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
                      filter: isHovered ? 'brightness(1.15)' : 'none',
                    }} />
                  </div>

                  {/* Day label */}
                  <span className="zen-label" style={{
                    color: isHovered ? 'var(--text-0)' : undefined,
                    transition: 'color 0.2s ease',
                  }}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════ DAILY BREAKDOWN TABLE ═══════ */}
        <div className="zen-glass zen-fade-in zd-4" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--sage)' }}>calendar_view_week</span>
            <span className="zen-text-primary" style={{ fontSize: 15, fontWeight: 700 }}>Daily Activity Breakdown</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                  <th className="zen-label" style={{ padding: '10px 14px', textAlign: 'left' }}>Date</th>
                  <th className="zen-label" style={{ padding: '10px 14px', textAlign: 'left' }}>Focus Duration</th>
                  <th className="zen-label" style={{ padding: '10px 14px', textAlign: 'left' }}>Tasks Completed</th>
                  <th className="zen-label" style={{ padding: '10px 14px', textAlign: 'right' }}>Daily Progress</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map((d) => {
                  const dObj = new Date(d.date);
                  const dayLabel = dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  const pct = Math.min(100, Math.round((d.focusMinutes / 180) * 100));

                  return (
                    <tr key={d.date} style={{ borderBottom: '1px solid var(--divider)', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(79, 127, 102, 0.06)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="zen-text-primary" style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{dayLabel}</td>
                      <td className="zen-text-secondary" style={{ padding: '12px 14px', fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>
                        {d.focusMinutes >= 60 ? `${(d.focusMinutes / 60).toFixed(1)}h` : `${d.focusMinutes}m`}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                          background: 'rgba(79, 127, 102, 0.12)', color: 'var(--sage)',
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check</span>
                          {d.tasksCompleted}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{
                          width: 110, height: 6, borderRadius: 999, overflow: 'hidden',
                          background: 'var(--track)', display: 'inline-block', verticalAlign: 'middle',
                        }}>
                          <div style={{
                            height: '100%', borderRadius: 999,
                            background: 'linear-gradient(90deg, var(--sage), var(--gold))',
                            width: `${pct}%`,
                            transition: 'width 0.7s ease',
                          }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══════ AI INSIGHT BANNER ═══════ */}
        <div className="zen-fade-in zd-5" style={{
          padding: 24, borderRadius: 'var(--radius)',
          background: 'linear-gradient(135deg, var(--sage), var(--sage-deep))',
          display: 'flex', alignItems: 'flex-start', gap: 16,
          boxShadow: '0 16px 40px -12px rgba(50, 82, 64, 0.45)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.16)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#fff' }}>auto_awesome</span>
          </div>
          <div>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 6px 0' }}>Smart AI Summary</h4>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 1.6, margin: 0 }}>
              {totalFocusMin > 0
                ? `Great job! You logged ${focusStr} of deep focus and completed ${totalTasks} task${totalTasks !== 1 ? 's' : ''} this week. Your peak focus times are consistent!`
                : 'Start a focus session or complete tasks to unlock personalized weekly productivity insights.'}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .zen-page > div:first-of-type[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </AppLayout>
  );
}
