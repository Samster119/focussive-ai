'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useApi } from '@/lib/query';
import { apiFetch } from '@/lib/api';
import './tasks.css';

/* ─── Types ─── */
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type Status   = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
type Filter   = 'all' | 'pending' | 'done' | 'overdue' | 'archived';

interface Task {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  estimatedMinutes?: number;
  dueDate?: string;
  parentTaskId?: string;
  subTasks?: Task[];
  schedulingRationale?: string;
}

/* ─── Helpers ─── */
function priorityClass(p: Priority) {
  return { URGENT: 'urgent', HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }[p];
}

function formatDatetimeLocal(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return '';
  const hrs  = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

const TABS: { label: string; value: Filter }[] = [
  { label: 'All',          value: 'all'      },
  { label: 'Pending',      value: 'pending'  },
  { label: 'Done',         value: 'done'     },
  { label: 'Overdue',      value: 'overdue'  },
  { label: 'History',      value: 'archived' },
];

/* ─── Checkmark SVG ─── */
function Checkmark() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/* ══════════════════════════════════════
   TASKS PAGE
   ══════════════════════════════════════ */
export default function TasksPage() {
  const [filter,      setFilter]      = useState<Filter>('all');
  const [adding,      setAdding]      = useState(false);
  const [newTitle,    setNewTitle]    = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('MEDIUM');
  const [newDue,      setNewDue]      = useState('');
  const [newHours,    setNewHours]    = useState<number | ''>(0);
  const [newMinutes,  setNewMinutes]  = useState<number | ''>(30);

  const [editingTask,   setEditingTask]   = useState<Task | null>(null);
  const [editTitle,     setEditTitle]     = useState('');
  const [editPriority,  setEditPriority]  = useState<Priority>('MEDIUM');
  const [editDue,       setEditDue]       = useState('');
  const [editHours,     setEditHours]     = useState<number | ''>(0);
  const [editMinutes,   setEditMinutes]   = useState<number | ''>(30);

  const [expanded,     setExpanded]     = useState<Set<string>>(new Set());
  const [microstepping, setMicrostepping] = useState<Set<string>>(new Set());
  const [reverting,    setReverting]    = useState<Set<string>>(new Set());
  const [toast,        setToast]        = useState<string | null>(null);

  /* ── Body override ── */
  useEffect(() => {
    document.body.classList.add('zen-tasks-bg');
    return () => { document.body.classList.remove('zen-tasks-bg'); };
  }, []);

  const { data, loading, refetch } = useApi<Task[]>(
    filter === 'all' ? '/tasks' : `/tasks?filter=${filter}`,
  );

  const tasks     = data ?? [];
  const rootTasks = tasks.filter((t) => !t.parentTaskId);
  const pending   = tasks.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
  const done      = tasks.filter((t) => t.status === 'COMPLETED');
  const overdue   = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.status !== 'ARCHIVED' && t.dueDate && new Date(t.dueDate) < new Date(),
  );

  /* ── Toast ── */
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  /* ── Due date formatting ── */
  function formatDue(dateStr?: string): React.ReactNode {
    if (!dateStr) return null;
    const d    = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const now  = new Date();
    const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    if (diff < 0)  return <span className="meta-overdue">Overdue ({date}, {time})</span>;
    if (diff === 0) return <span className="meta-today">Today at {time}</span>;
    if (diff === 1) return `Tomorrow at ${time}`;
    return `${date} at ${time}`;
  }

  /* ── API actions ── */
  async function toggleComplete(task: Task) {
    const newStatus: Status = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await apiFetch(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      refetch();
      if (newStatus === 'COMPLETED') showToast(`✅ "${task.title}" completed!`);
    } catch { showToast('Failed to update task'); }
  }

  async function restoreTask(task: Task) {
    try {
      await apiFetch(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'PENDING' }) });
      refetch();
      showToast(`♻️ "${task.title}" restored!`);
    } catch { showToast('Failed to restore task'); }
  }

  async function createTask() {
    if (!newTitle.trim())      { showToast('⚠️ Task title is required!'); return; }
    if (!newDue)               { showToast('⚠️ Due date & time is required!'); return; }
    const totalMinutes = (Number(newHours || 0) * 60) + Number(newMinutes || 0);
    if (totalMinutes <= 0)     { showToast('⚠️ Estimated duration is required!'); return; }
    try {
      await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim(), priority: newPriority, dueDate: newDue, estimatedMinutes: totalMinutes }),
      });
      setNewTitle(''); setNewDue(''); setNewPriority('MEDIUM'); setNewHours(0); setNewMinutes(30); setAdding(false);
      refetch();
      showToast('✨ Task created!');
    } catch (e) {
      showToast(`❌ ${(e as { message?: string })?.message ?? 'Failed to create task'}`);
    }
  }

  function startEdit(task: Task) {
    const total = task.estimatedMinutes ?? 30;
    setEditingTask(task);
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditDue(formatDatetimeLocal(task.dueDate));
    setEditHours(Math.floor(total / 60));
    setEditMinutes(total % 60);
  }

  async function saveEdit() {
    if (!editingTask)         return;
    if (!editTitle.trim())    { showToast('⚠️ Title cannot be blank!'); return; }
    if (!editDue)             { showToast('⚠️ Due date cannot be blank!'); return; }
    const totalMinutes = (Number(editHours || 0) * 60) + Number(editMinutes || 0);
    if (totalMinutes <= 0)    { showToast('⚠️ Duration must be greater than 0!'); return; }
    try {
      await apiFetch(`/tasks/${editingTask.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: editTitle.trim(), priority: editPriority, dueDate: editDue, estimatedMinutes: totalMinutes }),
      });
      setEditingTask(null);
      refetch();
      showToast(`✏️ "${editTitle.trim()}" updated!`);
    } catch (e) {
      showToast(`❌ ${(e as { message?: string })?.message ?? 'Failed to update task'}`);
    }
  }

  async function deleteTask(id: string) {
    try {
      await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
      refetch();
      showToast('📦 Task archived');
    } catch { showToast('Failed to archive task'); }
  }

  async function doMicroStep(task: Task) {
    setMicrostepping((p) => new Set(p).add(task.id));
    try {
      await apiFetch(`/tasks/${task.id}/micro-step`, { method: 'POST' });
      refetch();
      setExpanded((p) => new Set(p).add(task.id));
      showToast('🔬 Micro-steps generated!');
    } catch (e) {
      showToast((e as { message?: string })?.message ?? 'Failed to micro-step');
    } finally {
      setMicrostepping((p) => { const n = new Set(p); n.delete(task.id); return n; });
    }
  }

  async function revertMicroStep(task: Task) {
    setReverting((p) => new Set(p).add(task.id));
    try {
      await apiFetch(`/tasks/${task.id}/revert-micro-step`, { method: 'POST' });
      refetch();
      setExpanded((p) => { const n = new Set(p); n.delete(task.id); return n; });
      showToast('↩️ Micro-steps reverted!');
    } catch (e) {
      showToast((e as { message?: string })?.message ?? 'Failed to revert');
    } finally {
      setReverting((p) => { const n = new Set(p); n.delete(task.id); return n; });
    }
  }

  function toggleExpand(id: string) {
    setExpanded((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  /* ═══════ RENDER ═══════ */
  return (
    <AppLayout>
      <div className="zen-tasks">
        {/* Toast */}
        {toast && <div className="toast">{toast}</div>}

        {/* Edit Modal */}
        {editingTask && (
          <div className="modal-overlay" onClick={() => setEditingTask(null)}>
            <div className="modal-box glass" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--sage)' }}>edit</span>
                  Edit Task
                </div>
                <button className="modal-close" onClick={() => setEditingTask(null)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label">Task Title *</label>
                  <input
                    className="form-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Task title…"
                    autoFocus
                  />
                </div>
                <div className="form-grid-4">
                  <div>
                    <label className="form-label">Priority *</label>
                    <select className="form-select" value={editPriority} onChange={(e) => setEditPriority(e.target.value as Priority)}>
                      {(['LOW','MEDIUM','HIGH','URGENT'] as Priority[]).map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Due Date & Time *</label>
                    <input className="form-input" type="datetime-local" value={editDue} onChange={(e) => setEditDue(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Est. Hours *</label>
                    <input className="form-input" type="number" min={0} value={editHours}
                      onChange={(e) => setEditHours(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} placeholder="0" />
                  </div>
                  <div>
                    <label className="form-label">Est. Minutes *</label>
                    <input className="form-input" type="number" min={0} max={59} step={5} value={editMinutes}
                      onChange={(e) => setEditMinutes(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} placeholder="30" />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setEditingTask(null)}>Cancel</button>
                <button className="btn-save" onClick={saveEdit}>Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="tasks-header zen-tasks zd-1" style={{ animationName: 'ztasks-fadeUp' }}>
          <div>
            <h1 className="tasks-title">Tasks</h1>
            <div className="tasks-subtitle">Manage your work & tasks</div>
          </div>
          <button id="tasks-add-btn" className="btn-add" onClick={() => setAdding(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Add Task
          </button>
        </div>

        {/* ── Stats Row ── */}
        <div className="stats-row">
          <div className="glass stat-card">
            <div className="stat-label">Pending</div>
            <div className="stat-number pending">{pending.length}</div>
          </div>
          <div className="glass stat-card">
            <div className="stat-label">Completed</div>
            <div className="stat-number done">{done.length}</div>
          </div>
          <div className="glass stat-card">
            <div className="stat-label">Overdue</div>
            <div className={`stat-number ${overdue.length > 0 ? 'overdue' : ''}`}>{overdue.length}</div>
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="filter-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              id={`tasks-tab-${tab.value}`}
              className={`filter-tab ${filter === tab.value ? 'active' : ''}`}
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Add Task Form ── */}
        {adding && (
          <div className="glass add-form">
            <div className="form-title">Create New Task</div>
            <div className="form-grid">
              <div>
                <label className="form-label">Task Title *</label>
                <input
                  id="tasks-new-title"
                  autoFocus
                  className="form-input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  onKeyDown={(e) => { if (e.key === 'Enter') createTask(); if (e.key === 'Escape') setAdding(false); }}
                />
              </div>
              <div className="form-grid-4">
                <div>
                  <label className="form-label">Priority *</label>
                  <select className="form-select" value={newPriority} onChange={(e) => setNewPriority(e.target.value as Priority)}>
                    {(['LOW','MEDIUM','HIGH','URGENT'] as Priority[]).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Due Date & Time *</label>
                  <input className="form-input" type="datetime-local" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Est. Hours *</label>
                  <input className="form-input" type="number" min={0} value={newHours}
                    onChange={(e) => setNewHours(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} placeholder="0" />
                </div>
                <div>
                  <label className="form-label">Est. Minutes *</label>
                  <input className="form-input" type="number" min={0} max={59} step={5} value={newMinutes}
                    onChange={(e) => setNewMinutes(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} placeholder="30" />
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => { setAdding(false); setNewTitle(''); }}>Cancel</button>
              <button className="btn-save" onClick={createTask}>Create Task</button>
            </div>
          </div>
        )}

        {/* ── Task List Scroll Area ── */}
        <div className="task-content-area">
          {loading ? (
            /* Skeleton */
            <div className="task-list">
              {[1,2,3,4].map((i) => (
                <div key={i} className="glass task-card" style={{ opacity: 1 - i * 0.15 }}>
                  <div className="task-inner">
                    <div className="skeleton" style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="skeleton" style={{ height: 16, width: `${70 - i * 8}%` }} />
                      <div className="skeleton" style={{ height: 12, width: '35%' }} />
                    </div>
                    <div className="skeleton" style={{ height: 22, width: 64, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : rootTasks.length === 0 ? (
            <div className="glass empty-state">
              <span className="material-symbols-outlined empty-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
                task_alt
              </span>
              <div className="empty-text">
                {filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
              </div>
              <div className="empty-sub">
                {filter === 'all'
                  ? 'Click "Add Task" above to create your first task 🌿'
                  : 'Try switching to a different filter'}
              </div>
            </div>
          ) : (
            <div className="task-list">
              {rootTasks.map((task, idx) => {
                const isExpanded = expanded.has(task.id);
                const subs       = task.subTasks ?? [];
                const subsDone   = subs.filter((s) => s.status === 'COMPLETED').length;
                const subsTotal  = subs.length;
                const pct        = subsTotal > 0 ? Math.round((subsDone / subsTotal) * 100) : 0;
                const pClass     = priorityClass(task.priority);
                const delayClass = `zd-${Math.min(idx + 1, 10)}`;

                return (
                  <div key={task.id} className={delayClass}>
                    <div
                      className={`glass task-card priority-${pClass}`}
                      style={{ animationName: 'ztasks-fadeUp', animationDuration: '0.4s', animationFillMode: 'both' }}
                    >
                      <div className="task-inner">
                        {/* Checkbox */}
                        <button
                          id={`task-toggle-${task.id}`}
                          className={`task-check ${task.status === 'COMPLETED' ? 'checked' : ''} ${task.status === 'ARCHIVED' ? 'archived-check' : ''}`}
                          onClick={() => toggleComplete(task)}
                          title={task.status === 'COMPLETED' ? 'Mark as pending' : 'Mark as completed'}
                        >
                          {task.status === 'COMPLETED' && <Checkmark />}
                        </button>

                        {/* Task body */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className={`task-title ${task.status === 'COMPLETED' ? 'done-title' : ''}`}>
                            {task.title}
                          </div>

                          {/* Subtask progress */}
                          {subsTotal > 0 && (
                            <div className="subtask-progress">
                              <div className="subtask-progress-track">
                                <div className="subtask-progress-fill" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="subtask-progress-text">{subsDone}/{subsTotal} steps</span>
                            </div>
                          )}

                          {/* Meta row */}
                          <div className="task-meta">
                            {task.dueDate && (
                              <span className="task-meta-item">
                                <span className="material-symbols-outlined">event</span>
                                {formatDue(task.dueDate)}
                              </span>
                            )}
                            {task.estimatedMinutes && (
                              <span className="task-meta-item">
                                <span className="material-symbols-outlined">schedule</span>
                                {formatDuration(task.estimatedMinutes)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Priority badge */}
                        <span className={`priority-badge ${pClass}`}>{task.priority}</span>

                        {/* Actions */}
                        <div className="task-actions">
                          {task.status === 'ARCHIVED' ? (
                            <button
                              id={`task-restore-${task.id}`}
                              className="act-btn-label restore"
                              onClick={() => restoreTask(task)}
                              title="Restore to active tasks"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>unarchive</span>
                              Restore
                            </button>
                          ) : (
                            <>
                              <button
                                id={`task-edit-${task.id}`}
                                className="act-btn"
                                onClick={() => startEdit(task)}
                                title="Edit task"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                              </button>

                              {subs.length === 0 && task.status !== 'COMPLETED' && (
                                <button
                                  id={`task-microstep-${task.id}`}
                                  className="act-btn"
                                  onClick={() => doMicroStep(task)}
                                  disabled={microstepping.has(task.id)}
                                  title="Break into micro-steps"
                                >
                                  <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: 16, animation: microstepping.has(task.id) ? 'spin 1s linear infinite' : 'none' }}
                                  >
                                    {microstepping.has(task.id) ? 'progress_activity' : 'splitscreen'}
                                  </span>
                                </button>
                              )}

                              {subs.length > 0 && (
                                <>
                                  <button
                                    id={`task-revert-${task.id}`}
                                    className="act-btn-label"
                                    onClick={() => revertMicroStep(task)}
                                    disabled={reverting.has(task.id)}
                                    title="Revert micro-steps"
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                      {reverting.has(task.id) ? 'progress_activity' : 'merge_type'}
                                    </span>
                                    Revert
                                  </button>
                                  <button
                                    className="act-btn"
                                    onClick={() => toggleExpand(task.id)}
                                    title={isExpanded ? 'Collapse steps' : 'Expand steps'}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                      {isExpanded ? 'expand_less' : 'expand_more'}
                                    </span>
                                  </button>
                                </>
                              )}

                              <button
                                id={`task-delete-${task.id}`}
                                className="act-btn danger"
                                onClick={() => deleteTask(task.id)}
                                title="Archive task"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>archive</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Micro-steps */}
                    {isExpanded && subs.length > 0 && (
                      <div className="subtask-list zen-tasks">
                        {subs.map((sub) => (
                          <div key={sub.id} className="subtask-card">
                            <button
                              className={`subtask-check ${sub.status === 'COMPLETED' ? 'checked' : ''}`}
                              onClick={() => toggleComplete(sub)}
                            >
                              {sub.status === 'COMPLETED' && <Checkmark />}
                            </button>
                            <span className={`subtask-title ${sub.status === 'COMPLETED' ? 'done' : ''}`}>
                              {sub.title}
                            </span>
                            {sub.estimatedMinutes && (
                              <span className="subtask-dur">{sub.estimatedMinutes}m</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
