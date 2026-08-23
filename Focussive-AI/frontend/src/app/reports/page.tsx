'use client';

import { useState } from 'react';
import AppLayout from "@/components/AppLayout";
import { useApi } from '@/lib/query';

interface DailyData {
  date: string;
  tasksCompleted: number;
  focusMinutes: number;
}

interface WeeklyReport {
  dateRange: { start: string, end: string };
  dailyData: DailyData[];
  totalTasks: number;
  totalFocusMinutes: number;
}

type ChartMetric = 'focus' | 'tasks';

export default function ReportsPage() {
  const { data: report } = useApi<WeeklyReport>('/reports/weekly');
  const [metric, setMetric] = useState<ChartMetric>('focus');
  const [hoveredDay, setHoveredDay] = useState<DailyData | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalFocusMin = report?.totalFocusMinutes ?? 0;
  const focusHours = Math.floor(totalFocusMin / 60);
  const focusMins = totalFocusMin % 60;
  const focusStr = `${focusHours}h ${focusMins}m`;

  const totalTasks = report?.totalTasks ?? 0;
  const dailyData = report?.dailyData ?? [];
  const activeDaysCount = dailyData.filter((d) => d.focusMinutes > 0 || d.tasksCompleted > 0).length;
  const avgFocusPerActiveDay = activeDaysCount > 0 ? Math.round(totalFocusMin / activeDaysCount) : 0;

  const weeklyStats = [
    { label: "Total Focus Time", value: focusStr, delta: `${activeDaysCount} Active Days`, icon: "timelapse", positive: true },
    { label: "Tasks Completed", value: String(totalTasks), delta: totalTasks > 0 ? "Productive" : "No tasks", icon: "task_alt", positive: true },
    { label: "Avg Active Focus", value: `${avgFocusPerActiveDay}m/day`, delta: "Steady", icon: "speed", positive: true },
    { label: "Productivity Index", value: totalTasks > 5 || focusHours > 3 ? "Optimal" : "Building", delta: "Good", icon: "psychology", positive: true },
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartItems = dailyData.map((d) => {
    const dateObj = new Date(d.date);
    const dayName = daysOfWeek[dateObj.getDay()];
    const val = metric === 'focus' ? +(d.focusMinutes / 60).toFixed(1) : d.tasksCompleted;
    return {
      dateStr: d.date,
      day: dayName,
      val,
      tasks: d.tasksCompleted,
      minutes: d.focusMinutes,
      raw: d,
    };
  });

  const maxVal = Math.max(1, ...chartItems.map((d) => d.val));

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-lg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              Weekly Report & Analytics
            </h1>
            <p className="font-body-sm text-on-surface-variant">
              Deep work metrics, task completion rate, and focus trends
            </p>
          </div>
          <div className="flex items-center gap-sm">
            <button className="bg-surface-container-lowest w-10 h-10 rounded-xl card-shadow flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="font-title-sm text-on-surface-variant px-sm">
              This Week
            </span>
            <button className="bg-surface-container-lowest w-10 h-10 rounded-xl card-shadow flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
          {weeklyStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-container-lowest p-md rounded-xl card-shadow"
            >
              <div className="flex items-center justify-between mb-md">
                <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">{stat.icon}</span>
                </div>
                <span className="font-label-caps text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-bold">
                  {stat.delta}
                </span>
              </div>
              <span className="font-headline-md text-headline-md font-bold text-on-surface block tabular-nums">
                {stat.value}
              </span>
              <span className="font-body-sm text-on-surface-variant">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Main Analytics Chart Card */}
        <div className="bg-surface-container-lowest p-lg rounded-xl card-shadow space-y-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md border-b border-outline-variant/20 pb-md">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">bar_chart</span>
              <span className="font-title-sm text-on-surface font-bold">
                {metric === 'focus' ? 'Focus Hours Trend' : 'Tasks Completed Trend'}
              </span>
            </div>

            {/* Metric Toggle Tabs */}
            <div className="flex bg-surface-container-low p-1 rounded-xl gap-1">
              <button
                onClick={() => setMetric('focus')}
                className={`px-md py-1.5 rounded-lg font-title-sm text-xs transition-colors ${
                  metric === 'focus'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Focus Hours
              </button>
              <button
                onClick={() => setMetric('tasks')}
                className={`px-md py-1.5 rounded-lg font-title-sm text-xs transition-colors ${
                  metric === 'tasks'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Tasks Completed
              </button>
            </div>
          </div>

          {/* Interactive Chart Container */}
          <div className="relative pt-xl pb-md">
            <div className="flex items-end justify-between gap-md h-48 px-2">
              {chartItems.map((d, index) => {
                const heightPct = Math.max(8, Math.round((d.val / maxVal) * 100));
                const isHovered = hoveredIndex === index;
                return (
                  <div
                    key={d.dateStr}
                    onMouseEnter={() => { setHoveredDay(d.raw); setHoveredIndex(index); }}
                    onMouseLeave={() => { setHoveredDay(null); setHoveredIndex(null); }}
                    className="flex flex-col items-center gap-sm flex-1 group cursor-pointer relative"
                  >
                    {/* Tooltip - absolutely positioned above the bar */}
                    {isHovered && hoveredDay && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 
                        bg-surface-container-highest text-on-surface text-xs font-body-sm 
                        py-1.5 px-2.5 rounded-lg shadow-lg card-shadow whitespace-nowrap 
                        animate-fade-in border border-outline-variant/20">
                        <div className="font-label-caps text-primary mb-0.5">
                          {new Date(hoveredDay.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-x-3 text-on-surface-variant text-xs">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">timelapse</span>
                            {hoveredDay.focusMinutes}m
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">task_alt</span>
                            {hoveredDay.tasksCompleted}
                          </span>
                        </div>
                      </div>
                    )}
                    <span className="font-mono-sm text-xs text-on-surface-variant group-hover:text-primary transition-colors tabular-nums font-bold">
                      {metric === 'focus' ? `${d.val}h` : d.val}
                    </span>
                    <div className="w-full max-w-[36px] bg-surface-container-low rounded-t-lg h-36 flex items-end p-1 overflow-hidden">
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          d.val > 0
                            ? 'bg-gradient-to-t from-primary to-tertiary shadow-sm'
                            : 'bg-outline-variant/30'
                        } group-hover:brightness-110`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="font-label-caps text-xs text-on-surface-variant group-hover:text-on-surface font-bold">
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Daily Breakdown Table */}
        <div className="bg-surface-container-lowest p-lg rounded-xl card-shadow space-y-md">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">calendar_view_week</span>
            <h3 className="font-title-sm text-on-surface font-bold">Daily Activity Breakdown</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm text-on-surface border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/20 text-on-surface-variant font-label-caps text-xs">
                  <th className="py-sm px-md">Date</th>
                  <th className="py-sm px-md">Focus Duration</th>
                  <th className="py-sm px-md">Tasks Completed</th>
                  <th className="py-sm px-md text-right">Daily Progress</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map((d) => {
                  const dObj = new Date(d.date);
                  const dayLabel = dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  const pct = Math.min(100, Math.round((d.focusMinutes / 180) * 100));

                  return (
                    <tr key={d.date} className="border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-sm px-md font-title-sm text-sm">{dayLabel}</td>
                      <td className="py-sm px-md font-mono-sm text-sm">
                        {d.focusMinutes >= 60 ? `${(d.focusMinutes / 60).toFixed(1)}h` : `${d.focusMinutes}m`}
                      </td>
                      <td className="py-sm px-md">
                        <span className="inline-flex items-center gap-1 font-title-sm text-xs px-2 py-0.5 rounded-full bg-primary-fixed text-primary">
                          <span className="material-symbols-outlined text-xs">check</span>
                          {d.tasksCompleted}
                        </span>
                      </td>
                      <td className="py-sm px-md text-right">
                        <div className="w-28 bg-surface-container h-2 rounded-full overflow-hidden inline-block align-middle ml-auto">
                          <div className="bg-primary h-full rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insight banner */}
        <div className="bg-primary-container text-white p-lg rounded-xl flex items-start gap-md shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">auto_awesome</span>
          </div>
          <div>
            <h4 className="font-title-sm font-bold text-white mb-xs">Smart AI Summary</h4>
            <p className="font-body-md opacity-90 leading-relaxed">
              {totalFocusMin > 0
                ? `Great job! You logged ${focusStr} of deep focus and completed ${totalTasks} task${totalTasks !== 1 ? 's' : ''} this week. Your peak focus times are consistent!`
                : 'Start a focus session or complete tasks to unlock personalized weekly productivity insights.'}
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

