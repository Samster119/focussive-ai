'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import { useApi } from '@/lib/query';
import { apiFetch } from '@/lib/api';

type EnergyLevel = 'LOW' | 'MEDIUM' | 'HIGH';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface Task {
  id: string;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  priority: Priority;
  estimatedMinutes?: number;
  dueDate?: string;
  parentTaskId?: string;
}

interface TimetableBlock {
  id: string;
  startTime: string;
  endTime: string;
  activityType: string;
  dayOfWeek: number;
  title?: string;
  priority?: Priority;
  taskId?: string;
  task?: Task;
}

const ENERGY_CONFIG = {
  LOW:    { label: 'Low Energy',  icon: 'battery_2_bar',  desc: 'Pomodoro: 25m focus / 5m break',    color: 'text-[#FBBC04] bg-[#FFF8E1]' },
  MEDIUM: { label: 'Medium',      icon: 'battery_3_bar',  desc: 'Standard: 60m focus / 10m break',   color: 'text-primary bg-primary-fixed' },
  HIGH:   { label: 'High Energy', icon: 'battery_full',   desc: 'Deep Work: 90m focus / 15m break',  color: 'text-[#34A853] bg-[#E6F4EA]' },
};

const PRIORITY_BADGE: Record<Priority, string> = {
  URGENT: 'bg-error-container text-on-error-container font-bold',
  HIGH: 'bg-[#FFE0B2] text-[#8A4B08] font-semibold',
  MEDIUM: 'bg-secondary-container text-on-secondary-container',
  LOW: 'bg-surface-container-high text-on-surface-variant',
};

const TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  FOCUS: { bg: 'bg-[#E6DEFF] border-l-[#633BF3]', text: 'text-[#4600D7]', icon: 'self_improvement' },
  BREAK: { bg: 'bg-[#E6F4EA] border-l-[#34A853]', text: 'text-[#137333]', icon: 'coffee' },
  TASK:  { bg: 'bg-[#FFF8E1] border-l-[#FBBC04]', text: 'text-[#8A4B08]', icon: 'task_alt' },
};

function parseDuration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const totalMin = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMin <= 0) return '0m';
  return totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60 > 0 ? `${totalMin % 60}m` : ''}`.trim() : `${totalMin}m`;
}

function formatDurationMin(minutes?: number): string {
  if (!minutes || minutes <= 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export default function TimetablePage() {
  const [energy, setEnergy] = useState<EnergyLevel>('MEDIUM');
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [date] = useState(() => new Date().toISOString().split('T')[0]);

  // Edit / Add Block Modal state
  const [editBlock, setEditBlock] = useState<TimetableBlock | null>(null);
  const [isNewBlock, setIsNewBlock] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStartTime, setEditStartTime] = useState('09:00');
  const [editEndTime, setEditEndTime] = useState('10:00');
  const [editType, setEditType] = useState('FOCUS');
  const [editPriority, setEditPriority] = useState<Priority>('MEDIUM');
  const [savingBlock, setSavingBlock] = useState(false);

  const { data: blocksData, loading, refetch } = useApi<TimetableBlock[]>(`/timetable?date=${date}`);
  const { data: tasksData, refetch: refetchTasks } = useApi<Task[]>('/tasks');

  const blocks = blocksData ?? [];
  const allTasks = tasksData ?? [];
  const pendingOrOverdueTasks = allTasks.filter(
    (t) => (t.status === 'PENDING' || t.status === 'IN_PROGRESS') && !t.parentTaskId,
  );

  const now = new Date();
  const sortedPendingTasks = [...pendingOrOverdueTasks].sort((a, b) => {
    const aOverdue = a.dueDate && new Date(a.dueDate) < now ? 1000 : 0;
    const bOverdue = b.dueDate && new Date(b.dueDate) < now ? 1000 : 0;
    const scoreMap: Record<Priority, number> = { URGENT: 400, HIGH: 300, MEDIUM: 200, LOW: 100 };
    return (bOverdue + scoreMap[b.priority]) - (aOverdue + scoreMap[a.priority]);
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function openEditModal(b: TimetableBlock) {
    setEditBlock(b);
    setIsNewBlock(false);
    setEditTitle(b.title || (b.activityType === 'FOCUS' ? 'Focus Session' : b.activityType === 'BREAK' ? 'Break' : 'Task'));
    setEditStartTime(b.startTime);
    setEditEndTime(b.endTime);
    setEditType(b.activityType);
    setEditPriority(b.priority || 'MEDIUM');
  }

  function openAddModal() {
    const lastBlock = blocks[blocks.length - 1];
    const defaultStart = lastBlock ? lastBlock.endTime : '09:00';
    const [h, m] = defaultStart.split(':').map(Number);
    const endH = Math.min(23, h + 1);
    const defaultEnd = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    setEditBlock({ id: '', startTime: defaultStart, endTime: defaultEnd, activityType: 'FOCUS', dayOfWeek: new Date(date).getDay() });
    setIsNewBlock(true);
    setEditTitle('');
    setEditStartTime(defaultStart);
    setEditEndTime(defaultEnd);
    setEditType('FOCUS');
    setEditPriority('MEDIUM');
  }

  async function handleSaveBlock() {
    if (!editBlock) return;
    setSavingBlock(true);
    try {
      if (isNewBlock) {
        await apiFetch('/timetable/block', {
          method: 'POST',
          body: JSON.stringify({
            dayOfWeek: new Date(date).getDay(),
            startTime: editStartTime,
            endTime: editEndTime,
            activityType: editType,
            title: editTitle.trim() || undefined,
            priority: editPriority,
          }),
        });
        showToast('✨ Timetable block added!');
      } else {
        await apiFetch(`/timetable/block/${editBlock.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            startTime: editStartTime,
            endTime: editEndTime,
            activityType: editType,
            title: editTitle.trim() || undefined,
            priority: editPriority,
          }),
        });
        showToast('✏️ Block updated!');
      }
      refetch();
      setEditBlock(null);
    } catch {
      showToast('Failed to save block');
    } finally {
      setSavingBlock(false);
    }
  }

  async function handleDeleteBlock() {
    if (!editBlock || isNewBlock) return;
    setSavingBlock(true);
    try {
      await apiFetch(`/timetable/block/${editBlock.id}`, {
        method: 'DELETE',
      });
      refetch();
      setEditBlock(null);
      showToast('🗑️ Block removed!');
    } catch {
      showToast('Failed to remove block');
    } finally {
      setSavingBlock(false);
    }
  }

  async function handleRegenerate() {
    setGenerating(true);
    try {
      await apiFetch('/timetable/regenerate', {
        method: 'POST',
        body: JSON.stringify({ date, energyLevel: energy }),
      });
      await refetch();
      showToast(`✨ Timetable generated based on pending & overdue tasks!`);
    } catch {
      showToast('Failed to generate timetable');
    } finally {
      setGenerating(false);
    }
  }

  async function moveBlock(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;

    const blockIds = newBlocks.map((b) => b.id);
    try {
      await apiFetch('/timetable/reorder', {
        method: 'POST',
        body: JSON.stringify({ date, blockIds }),
      });
      refetch();
      showToast('↕️ Timetable order & times adjusted!');
    } catch {
      showToast('Failed to reorder blocks');
    }
  }

  async function addTaskToTimetable(task: Task) {
    const lastBlock = blocks[blocks.length - 1];
    const defaultStart = lastBlock ? lastBlock.endTime : '09:00';
    const [h, m] = defaultStart.split(':').map(Number);
    const duration = task.estimatedMinutes && task.estimatedMinutes > 0 ? task.estimatedMinutes : 45;
    const totalEndMin = (h * 60 + m) + duration;
    const endH = Math.floor(totalEndMin / 60) % 24;
    const endM = totalEndMin % 60;
    const defaultEnd = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    try {
      await apiFetch('/timetable/block', {
        method: 'POST',
        body: JSON.stringify({
          dayOfWeek: new Date(date).getDay(),
          startTime: defaultStart,
          endTime: defaultEnd,
          activityType: 'FOCUS',
          title: task.title,
          taskId: task.id,
          priority: task.priority,
        }),
      });
      refetch();
      showToast(`➕ "${task.title}" added to timetable!`);
    } catch {
      showToast('Failed to add task to timetable');
    }
  }

  // Calculate stats
  const focusBlocks = blocks.filter((b) => b.activityType === 'FOCUS');
  const breakBlocks = blocks.filter((b) => b.activityType === 'BREAK');

  function totalMins(bks: TimetableBlock[]): number {
    return bks.reduce((acc, b) => {
      const [sh, sm] = b.startTime.split(':').map(Number);
      const [eh, em] = b.endTime.split(':').map(Number);
      return acc + Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
    }, 0);
  }

  const focusMins = totalMins(focusBlocks);
  const breakMins = totalMins(breakBlocks);

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-lg">
        {/* Toast */}
        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-on-surface text-surface px-lg py-sm rounded-xl card-shadow font-body-sm animate-fade-in">
            {toast}
          </div>
        )}

        <PageHeader
          icon="view_timeline"
          title="Adaptive Timetable"
          subtitle={`Today — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
          actions={
            <div className="flex items-center gap-sm">
              <button
                onClick={openAddModal}
                className="bg-surface-container-lowest text-on-surface hover:bg-surface-container-low px-md py-sm rounded-xl font-title-sm card-shadow transition-all flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Add Custom Block
              </button>
              <button
                id="timetable-regenerate"
                onClick={handleRegenerate}
                disabled={generating}
                className="bg-primary hover:bg-primary-container text-white px-lg py-sm rounded-xl font-title-sm transition-all active:scale-95 flex items-center gap-sm disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-lg">{generating ? 'hourglass_top' : 'auto_awesome'}</span>
                {generating ? 'Scheduling…' : 'Generate from Tasks'}
              </button>
            </div>
          }
        />

        {/* Energy level selector */}
        <div className="bg-surface-container-lowest p-lg rounded-xl card-shadow">
          <div className="flex items-center justify-between mb-md">
            <div>
              <p className="font-label-caps text-outline">Energy-Aware Scheduling</p>
              <h3 className="font-title-sm font-bold text-on-surface">Select Today&apos;s Energy Level</h3>
            </div>
            <span className="text-xs text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full font-title-sm">
              Auto-schedules pending & overdue tasks
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
            {(Object.entries(ENERGY_CONFIG) as [EnergyLevel, typeof ENERGY_CONFIG.LOW][]).map(([level, cfg]) => (
              <button
                key={level}
                id={`energy-${level.toLowerCase()}`}
                onClick={() => setEnergy(level)}
                className={`p-md rounded-xl border-2 transition-all text-left ${
                  energy === level
                    ? 'border-primary bg-primary-fixed'
                    : 'border-outline-variant/30 hover:border-primary/40 bg-surface-container-low'
                }`}
              >
                <span className={`material-symbols-outlined text-2xl ${energy === level ? 'text-primary' : 'text-outline'}`}>
                  {cfg.icon}
                </span>
                <p className={`font-title-sm mt-xs ${energy === level ? 'text-primary' : 'text-on-surface'}`}>
                  {cfg.label}
                </p>
                <p className="font-body-sm text-on-surface-variant mt-base">{cfg.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Layout Grid: Timetable Timeline + Tasks Queue Side Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
          {/* Main Timetable Timeline */}
          <div className="lg:col-span-2 space-y-md">
            {/* Stats Bar */}
            {blocks.length > 0 && (
              <div className="grid grid-cols-3 gap-sm">
                {[
                  { label: 'Scheduled Blocks', value: blocks.length, icon: 'format_list_bulleted', color: 'text-primary' },
                  { label: 'Focus Time', value: focusMins >= 60 ? `${Math.floor(focusMins / 60)}h ${focusMins % 60}m` : `${focusMins}m`, icon: 'timer', color: 'text-primary' },
                  { label: 'Break Time', value: breakMins >= 60 ? `${Math.floor(breakMins / 60)}h ${breakMins % 60}m` : `${breakMins}m`, icon: 'coffee', color: 'text-[#34A853]' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-surface-container-lowest p-md rounded-xl card-shadow flex items-center gap-sm">
                    <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
                    <div>
                      <p className="font-headline-sm text-on-surface font-bold">{stat.value}</p>
                      <p className="font-body-sm text-on-surface-variant text-xs">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline Blocks */}
            <div className="bg-surface-container-lowest p-md rounded-2xl card-shadow space-y-sm">
              <div className="flex items-center justify-between px-xs pb-xs border-b border-outline-variant/20 mb-xs">
                <h3 className="font-title-sm font-bold text-on-surface flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                  Today&apos;s Schedule & Reorderable Timeline
                </h3>
                <span className="text-xs text-on-surface-variant">Use ↑ ↓ arrows to rearrange order</span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-xl">
                  <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                </div>
              ) : blocks.length === 0 ? (
                <div className="py-xl text-center">
                  <span className="material-symbols-outlined text-4xl text-outline">view_timeline</span>
                  <p className="font-body-md text-on-surface-variant mt-sm font-bold">
                    No timetable generated yet.
                  </p>
                  <p className="font-body-sm text-on-surface-variant/70 mt-xs mb-lg max-w-md mx-auto">
                    Click <strong>Generate from Tasks</strong> to auto-schedule your pending and overdue tasks ordered by priority!
                  </p>
                  <button
                    onClick={handleRegenerate}
                    disabled={generating}
                    className="bg-primary text-white px-xl py-sm rounded-xl font-title-sm hover:bg-primary-container transition-all"
                  >
                    Auto-Generate Timetable
                  </button>
                </div>
              ) : (
                <div className="space-y-sm">
                  {blocks.map((block, i) => {
                    const style = TYPE_COLORS[block.activityType] ?? TYPE_COLORS.FOCUS;
                    const duration = parseDuration(block.startTime, block.endTime);
                    const isOverdue = block.title?.includes('[OVERDUE]');
                    return (
                      <div
                        key={block.id}
                        className={`${style.bg} border-l-4 rounded-xl p-md flex items-center gap-md card-shadow transition-all group relative hover:shadow-md`}
                      >
                        {/* Up / Down Reordering Controls */}
                        <div className="flex flex-col gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={() => moveBlock(i, 'up')}
                            disabled={i === 0}
                            title="Move Block Up"
                            className="text-on-surface-variant hover:text-primary disabled:opacity-20 p-0.5"
                          >
                            <span className="material-symbols-outlined text-sm font-bold">keyboard_arrow_up</span>
                          </button>
                          <button
                            onClick={() => moveBlock(i, 'down')}
                            disabled={i === blocks.length - 1}
                            title="Move Block Down"
                            className="text-on-surface-variant hover:text-primary disabled:opacity-20 p-0.5"
                          >
                            <span className="material-symbols-outlined text-sm font-bold">keyboard_arrow_down</span>
                          </button>
                        </div>

                        {/* Start - End Time */}
                        <div className="font-mono-sm font-bold text-on-surface w-28 shrink-0">
                          {block.startTime} – {block.endTime}
                        </div>

                        {/* Activity Icon */}
                        <span className={`material-symbols-outlined shrink-0 ${style.text}`}>
                          {style.icon}
                        </span>

                        {/* Title & Priority Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-xs flex-wrap">
                            <p className={`font-title-sm ${style.text} truncate`}>
                              {block.title || (block.activityType === 'FOCUS' ? 'Focus Session' : block.activityType === 'BREAK' ? 'Break' : 'Task')}
                            </p>
                            {isOverdue && (
                              <span className="bg-error-container text-on-error-container text-[10px] px-2 py-0.5 rounded-full font-bold">
                                OVERDUE
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-sm text-xs text-on-surface-variant mt-xs">
                            <span>⏱️ {duration}</span>
                            {block.priority && (
                              <span className={`${PRIORITY_BADGE[block.priority]} text-[10px] px-2 py-0.5 rounded-full`}>
                                {block.priority}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => openEditModal(block)}
                            title="Edit Block Time & Title"
                            className="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Side Panel: Tasks Included & Pending Tasks Queue */}
          <div className="space-y-md">
            <div className="bg-surface-container-lowest p-md rounded-2xl card-shadow space-y-md border border-outline-variant/30">
              <div className="border-b border-outline-variant/20 pb-sm flex items-center justify-between">
                <h3 className="font-title-sm font-bold text-on-surface flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary text-lg">format_list_bulleted</span>
                  Tasks Pending & Overdue
                </h3>
                <span className="text-xs text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-full">
                  {sortedPendingTasks.length} total
                </span>
              </div>

              {sortedPendingTasks.length === 0 ? (
                <p className="text-xs text-on-surface-variant text-center py-md">
                  🎉 No pending or overdue tasks!
                </p>
              ) : (
                <div className="space-y-xs max-h-[500px] overflow-y-auto pr-xs">
                  {sortedPendingTasks.map((t) => {
                    const isOverdue = t.dueDate && new Date(t.dueDate) < now;
                    const isScheduled = blocks.some((b) => b.taskId === t.id || b.title?.includes(t.title));
                    return (
                      <div
                        key={t.id}
                        className={`p-sm rounded-xl border flex items-center justify-between gap-sm transition-all ${
                          isOverdue
                            ? 'border-error/40 bg-error-container/10'
                            : isScheduled
                            ? 'border-primary/30 bg-primary-fixed/20'
                            : 'border-outline-variant/40 bg-surface-container-low'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-xs flex-wrap">
                            <p className="font-title-sm text-xs text-on-surface truncate font-semibold">
                              {t.title}
                            </p>
                            {isOverdue && (
                              <span className="text-[9px] bg-error text-white font-bold px-1.5 py-0.2 rounded">
                                OVERDUE
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-xs text-[11px] text-on-surface-variant mt-0.5">
                            <span className={`${PRIORITY_BADGE[t.priority]} text-[9px] px-1.5 py-0.2 rounded-full`}>
                              {t.priority}
                            </span>
                            {t.estimatedMinutes && (
                              <span>⏱️ {formatDurationMin(t.estimatedMinutes)}</span>
                            )}
                          </div>
                        </div>

                        {isScheduled ? (
                          <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-1 rounded-lg shrink-0 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                            In Schedule
                          </span>
                        ) : (
                          <button
                            onClick={() => addTaskToTimetable(t)}
                            title="Add to Timetable"
                            className="bg-primary hover:bg-primary-container text-white text-[11px] font-title-sm px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-0.5 transition-all"
                          >
                            <span className="material-symbols-outlined text-xs">add</span>
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit / Add Block Modal */}
        {editBlock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-md">
            <div className="bg-surface-container-lowest p-lg rounded-2xl card-shadow w-full max-w-md space-y-md border border-outline-variant/30">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-sm">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary">
                    {isNewBlock ? 'add_circle' : 'edit_calendar'}
                  </span>
                  <h3 className="font-title-sm text-on-surface font-bold">
                    {isNewBlock ? 'Add Timetable Block' : 'Edit Timetable Block'}
                  </h3>
                </div>
                <button
                  onClick={() => setEditBlock(null)}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Title & Task Selection */}
              <div>
                <label className="font-label-caps text-outline mb-xs block text-xs">Block Title *</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Focus block or task title…"
                  className="w-full p-sm rounded-lg bg-surface-container-low border border-outline-variant/50 font-body-md text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Activity Type Selection */}
              <div>
                <label className="font-label-caps text-outline mb-xs block text-xs">Activity Type</label>
                <div className="grid grid-cols-3 gap-xs">
                  {['FOCUS', 'BREAK', 'TASK'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setEditType(t)}
                      className={`py-2 px-sm rounded-lg font-title-sm text-xs transition-colors flex items-center justify-center gap-xs ${
                        editType === t
                          ? 'bg-primary text-white font-bold'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {TYPE_COLORS[t]?.icon ?? 'schedule'}
                      </span>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Selection */}
              <div>
                <label className="font-label-caps text-outline mb-xs block text-xs">Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as Priority)}
                  className="w-full p-sm rounded-lg bg-surface-container-low border border-outline-variant/50 font-body-sm text-sm focus:outline-none focus:border-primary"
                >
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="font-label-caps text-outline mb-xs block text-xs">Start Time *</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full p-sm rounded-lg bg-surface-container-low border border-outline-variant/50 font-mono-sm text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-label-caps text-outline mb-xs block text-xs">End Time *</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full p-sm rounded-lg bg-surface-container-low border border-outline-variant/50 font-mono-sm text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-sm">
                {!isNewBlock ? (
                  <button
                    onClick={handleDeleteBlock}
                    disabled={savingBlock}
                    className="text-error hover:text-error/80 font-title-sm text-xs flex items-center gap-xs"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Delete Block
                  </button>
                ) : <div />}

                <div className="flex gap-sm">
                  <button
                    onClick={() => setEditBlock(null)}
                    className="px-md py-sm rounded-xl font-title-sm text-xs bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBlock}
                    disabled={savingBlock}
                    className="px-lg py-sm rounded-xl font-title-sm text-xs bg-primary text-white hover:bg-primary-container disabled:opacity-60"
                  >
                    {savingBlock ? 'Saving…' : 'Save Block'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
