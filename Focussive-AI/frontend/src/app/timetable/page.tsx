'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useApi } from '@/lib/query';
import { apiFetch } from '@/lib/api';
import '../zen-pages.css';

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
  LOW: { label: 'Low Energy', icon: 'battery_2_bar', desc: 'Pomodoro: 25m focus / 5m break' },
  MEDIUM: { label: 'Medium', icon: 'battery_3_bar', desc: 'Standard: 60m focus / 10m break' },
  HIGH: { label: 'High Energy', icon: 'battery_full', desc: 'Deep Work: 90m focus / 15m break' },
};

const PRIORITY_CLASS: Record<Priority, string> = {
  URGENT: 'priority-urgent',
  HIGH: 'priority-high',
  MEDIUM: 'priority-medium',
  LOW: 'priority-low',
};

const TYPE_CONFIG: Record<string, { cssClass: string; icon: string }> = {
  FOCUS: { cssClass: 'tt-focus', icon: 'self_improvement' },
  BREAK: { cssClass: 'tt-break', icon: 'coffee' },
  TASK: { cssClass: 'tt-task', icon: 'task_alt' },
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

  /* ── Immersive background: show the time-of-day scene ── */
  useEffect(() => {
    document.body.classList.add('zen-bg-override');
    return () => { document.body.classList.remove('zen-bg-override'); };
  }, []);

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
      <div className="zen-page zen-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Toast */}
        {toast && <div className="zen-toast">{toast}</div>}

        {/* ═══════ HEADER ═══════ */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="zen-header-icon" style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined">view_timeline</span>
            </div>
            <div>
              <h1 className="zen-text-primary" style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Adaptive Timetable</h1>
              <p className="zen-text-muted" style={{ fontSize: 14, margin: 0 }}>
                Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={openAddModal}
              className="zen-btn-secondary"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              Add Custom Block
            </button>
            <button
              id="timetable-regenerate"
              onClick={handleRegenerate}
              disabled={generating}
              className="zen-btn-primary"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{generating ? 'hourglass_top' : 'auto_awesome'}</span>
              {generating ? 'Scheduling…' : 'Generate from Tasks'}
            </button>
          </div>
        </header>

        {/* Energy level selector */}
        <div className="zen-glass zen-fade-in zd-2" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <p className="zen-label" style={{ marginBottom: 4 }}>Energy-Aware Scheduling</p>
              <h3 className="zen-text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Select Today&apos;s Energy Level</h3>
            </div>
            <span className="zen-pill">Auto-schedules pending & overdue tasks</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {(Object.entries(ENERGY_CONFIG) as [EnergyLevel, typeof ENERGY_CONFIG.LOW][]).map(([level, cfg]) => (
              <button
                key={level}
                id={`energy-${level.toLowerCase()}`}
                onClick={() => setEnergy(level)}
                className={energy === level ? '' : 'zen-chip'}
                style={{
                  padding: 18,
                  borderRadius: 16,
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: energy === level ? '2px solid var(--sage)' : undefined,
                  background: energy === level ? 'rgba(79, 127, 102, 0.12)' : undefined,
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: energy === level ? 'var(--sage)' : 'var(--text-2)', display: 'block' }}>
                  {cfg.icon}
                </span>
                <p style={{ fontSize: 14, fontWeight: 600, marginTop: 8, color: energy === level ? 'var(--sage-deep)' : 'var(--text-0)' }}>
                  {cfg.label}
                </p>
                <p className="zen-text-muted" style={{ fontSize: 12, marginTop: 4 }}>{cfg.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Layout Grid: Timetable Timeline + Tasks Queue Side Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          {/* Main Timetable Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stats Bar */}
            {blocks.length > 0 && (
              <div className="zen-fade-in zd-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Scheduled Blocks', value: blocks.length, icon: 'format_list_bulleted' },
                  { label: 'Focus Time', value: focusMins >= 60 ? `${Math.floor(focusMins / 60)}h ${focusMins % 60}m` : `${focusMins}m`, icon: 'timer' },
                  { label: 'Break Time', value: breakMins >= 60 ? `${Math.floor(breakMins / 60)}h ${breakMins % 60}m` : `${breakMins}m`, icon: 'coffee' },
                ].map((stat) => (
                  <div key={stat.label} className="zen-glass" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--sage)' }}>{stat.icon}</span>
                    <div>
                      <p className="zen-text-primary" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{stat.value}</p>
                      <p className="zen-text-muted" style={{ fontSize: 12, margin: 0 }}>{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline Blocks */}
            <div className="zen-glass zen-fade-in zd-4" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--divider)', marginBottom: 14 }}>
                <h3 className="zen-text-primary" style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--sage)', fontSize: 18 }}>schedule</span>
                  Today&apos;s Schedule & Reorderable Timeline
                </h3>
                <span className="zen-text-muted" style={{ fontSize: 12 }}>Use ↑ ↓ arrows to rearrange order</span>
              </div>

              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--sage)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                </div>
              ) : blocks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-2)', opacity: 0.5, display: 'block', marginBottom: 12 }}>view_timeline</span>
                  <p className="zen-text-secondary" style={{ fontWeight: 700, marginBottom: 8 }}>
                    No timetable generated yet.
                  </p>
                  <p className="zen-text-muted" style={{ fontSize: 13, marginBottom: 20, maxWidth: 400, marginInline: 'auto' }}>
                    Click <strong>Generate from Tasks</strong> to auto-schedule your pending and overdue tasks ordered by priority!
                  </p>
                  <button
                    onClick={handleRegenerate}
                    disabled={generating}
                    className="zen-btn-primary"
                    style={{ margin: '0 auto' }}
                  >
                    Auto-Generate Timetable
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {blocks.map((block, i) => {
                    const style = TYPE_CONFIG[block.activityType] ?? TYPE_CONFIG.FOCUS;
                    const duration = parseDuration(block.startTime, block.endTime);
                    const isOverdue = block.title?.includes('[OVERDUE]');
                    return (
                      <div
                        key={block.id}
                        className={style.cssClass}
                        style={{
                          borderRadius: 16,
                          padding: 16,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          position: 'relative',
                          transition: 'all 0.2s ease',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                        }}
                      >
                        {/* Up / Down Reordering Controls */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                          <button
                            onClick={() => moveBlock(i, 'up')}
                            disabled={i === 0}
                            title="Move Block Up"
                            style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: 'var(--text-2)', opacity: i === 0 ? 0.2 : 0.7, padding: 2, fontFamily: 'inherit', transition: 'opacity 0.2s' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16, fontWeight: 700 }}>keyboard_arrow_up</span>
                          </button>
                          <button
                            onClick={() => moveBlock(i, 'down')}
                            disabled={i === blocks.length - 1}
                            title="Move Block Down"
                            style={{ background: 'none', border: 'none', cursor: i === blocks.length - 1 ? 'default' : 'pointer', color: 'var(--text-2)', opacity: i === blocks.length - 1 ? 0.2 : 0.7, padding: 2, fontFamily: 'inherit', transition: 'opacity 0.2s' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16, fontWeight: 700 }}>keyboard_arrow_down</span>
                          </button>
                        </div>

                        {/* Start - End Time */}
                        <div className="zen-text-primary" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, width: 110, flexShrink: 0 }}>
                          {block.startTime} – {block.endTime}
                        </div>

                        {/* Activity Icon */}
                        <span className="material-symbols-outlined" style={{ flexShrink: 0 }}>{style.icon}</span>

                        {/* Title & Priority Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <p style={{ fontSize: 14, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {block.title || (block.activityType === 'FOCUS' ? 'Focus Session' : block.activityType === 'BREAK' ? 'Break' : 'Task')}
                            </p>
                            {isOverdue && (
                              <span className="priority-urgent" style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>
                                OVERDUE
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, marginTop: 4 }} className="zen-text-muted">
                            <span>⏱️ {duration}</span>
                            {block.priority && (
                              <span className={PRIORITY_CLASS[block.priority]} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>
                                {block.priority}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <button
                          onClick={() => openEditModal(block)}
                          title="Edit Block Time & Title"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 4, borderRadius: 8, transition: 'color 0.2s', fontFamily: 'inherit', opacity: 0.7 }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--sage)'; e.currentTarget.style.opacity = '1'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.opacity = '0.7'; }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Side Panel: Tasks Pending & Overdue */}
          <div>
            <div className="zen-glass zen-fade-in zd-5" style={{ padding: 20 }}>
              <div style={{ borderBottom: '1px solid var(--divider)', paddingBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 className="zen-text-primary" style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--sage)', fontSize: 18 }}>format_list_bulleted</span>
                  Tasks Pending & Overdue
                </h3>
                <span className="zen-pill" style={{ fontSize: 11 }}>
                  {sortedPendingTasks.length} total
                </span>
              </div>

              {sortedPendingTasks.length === 0 ? (
                <p className="zen-text-muted" style={{ textAlign: 'center', padding: '24px 0', fontSize: 13 }}>
                  🎉 No pending or overdue tasks!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto', paddingRight: 4 }}>
                  {sortedPendingTasks.map((t) => {
                    const isOverdue = t.dueDate && new Date(t.dueDate) < now;
                    const isScheduled = blocks.some((b) => b.taskId === t.id || b.title?.includes(t.title));
                    return (
                      <div
                        key={t.id}
                        className="zen-chip"
                        style={{
                          padding: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          borderColor: isOverdue ? 'var(--rose)' : isScheduled ? 'var(--sage)' : undefined,
                          background: isOverdue ? 'rgba(178, 95, 82, 0.08)' : isScheduled ? 'rgba(79, 127, 102, 0.08)' : undefined,
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <p className="zen-text-primary" style={{ fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.title}
                            </p>
                            {isOverdue && (
                              <span style={{ fontSize: 9, background: 'var(--rose)', color: '#fff', fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>
                                OVERDUE
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginTop: 4 }} className="zen-text-muted">
                            <span className={PRIORITY_CLASS[t.priority]} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 999 }}>
                              {t.priority}
                            </span>
                            {t.estimatedMinutes && (
                              <span>⏱️ {formatDurationMin(t.estimatedMinutes)}</span>
                            )}
                          </div>
                        </div>

                        {isScheduled ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sage)', background: 'rgba(79, 127, 102, 0.12)', padding: '4px 10px', borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check_circle</span>
                            In Schedule
                          </span>
                        ) : (
                          <button
                            onClick={() => addTaskToTimetable(t)}
                            title="Add to Timetable"
                            className="zen-btn-primary"
                            style={{ fontSize: 11, padding: '5px 12px', flexShrink: 0, gap: 4 }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>add</span>
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
          <div className="zen-modal-backdrop">
            <div className="zen-modal" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--divider)', paddingBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--sage)' }}>
                    {isNewBlock ? 'add_circle' : 'edit_calendar'}
                  </span>
                  <h3 className="zen-text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                    {isNewBlock ? 'Add Timetable Block' : 'Edit Timetable Block'}
                  </h3>
                </div>
                <button
                  onClick={() => setEditBlock(null)}
                  className="zen-icon-btn"
                  style={{ width: 32, height: 32 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              {/* Title & Task Selection */}
              <div>
                <label className="zen-label" style={{ display: 'block', marginBottom: 8 }}>Block Title *</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Focus block or task title…"
                  className="zen-input"
                />
              </div>

              {/* Activity Type Selection */}
              <div>
                <label className="zen-label" style={{ display: 'block', marginBottom: 8 }}>Activity Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {['FOCUS', 'BREAK', 'TASK'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setEditType(t)}
                      className={editType === t ? 'zen-btn-primary' : 'zen-chip'}
                      style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', letterSpacing: '0.06em' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        {TYPE_CONFIG[t]?.icon ?? 'schedule'}
                      </span>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Selection */}
              <div>
                <label className="zen-label" style={{ display: 'block', marginBottom: 8 }}>Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as Priority)}
                  className="zen-select"
                >
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Time Range */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="zen-label" style={{ display: 'block', marginBottom: 8 }}>Start Time *</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="zen-input"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
                <div>
                  <label className="zen-label" style={{ display: 'block', marginBottom: 8 }}>End Time *</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="zen-input"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
                {!isNewBlock ? (
                  <button
                    onClick={handleDeleteBlock}
                    disabled={savingBlock}
                    style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                    Delete Block
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setEditBlock(null)}
                    className="zen-btn-secondary"
                    style={{ fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBlock}
                    disabled={savingBlock}
                    className="zen-btn-primary"
                    style={{ fontSize: 13 }}
                  >
                    {savingBlock ? 'Saving…' : 'Save Block'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .zen-page > div:last-of-type[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </AppLayout>
  );
}
