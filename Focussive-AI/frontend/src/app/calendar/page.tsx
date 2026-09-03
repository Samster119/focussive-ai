'use client';

import { useState, useMemo, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useApi } from '@/lib/query';
import { apiFetch } from '@/lib/api';
import '../zen-pages.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

interface CalendarEvent {
  id: string;
  startTime: string;
  endTime: string;
  type: string;
  rationale?: string;
  isFixed: boolean;
  taskId?: string;
}

const TYPE_CLASS: Record<string, string> = {
  FOCUS: 'cal-evt-focus',
  TASK: 'cal-evt-task',
  BREAK: 'cal-evt-break',
  MANUAL: 'cal-evt-manual',
};

function getWeekBounds(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

interface Task {
  id: string;
  title: string;
}

export default function CalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [tooltip, setTooltip] = useState<{ id: string; text: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Quick Schedule Modal state
  const [slotModal, setSlotModal] = useState<{
    open: boolean;
    dayIdx: number;
    hour: number;
    date: Date;
  } | null>(null);
  const [modalType, setModalType] = useState<'TASK' | 'FOCUS' | 'BREAK' | 'MANUAL'>('TASK');
  const [modalTaskId, setModalTaskId] = useState<string>('');
  const [modalRationale, setModalRationale] = useState<string>('');
  const [modalDurationHours, setModalDurationHours] = useState<number>(1);
  const [modalIsFixed, setModalIsFixed] = useState<boolean>(false);
  const [schedulingSlot, setSchedulingSlot] = useState(false);

  /* ── Immersive background: show the time-of-day scene ── */
  useEffect(() => {
    document.body.classList.add('zen-bg-override');
    return () => { document.body.classList.remove('zen-bg-override'); };
  }, []);

  const { monday, sunday } = getWeekBounds(weekOffset);

  const { data: pendingTasks } = useApi<Task[]>('/tasks?filter=pending');

  const { data, loading, refetch } = useApi<CalendarEvent[]>(
    `/calendar?start=${monday.toISOString()}&end=${sunday.toISOString()}`,
  );

  const events = data ?? [];

  // Build a grid: for each day-index and hour, find matching events
  const eventGrid = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      const d = new Date(e.startTime);
      const dayIdx = (d.getDay() + 6) % 7; // Mon=0
      const hour = d.getHours();
      const key = `${dayIdx}-${hour}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  function eventDuration(e: CalendarEvent) {
    const start = new Date(e.startTime).getTime();
    const end = new Date(e.endTime).getTime();
    return Math.round((end - start) / 3600000);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }



  function openSlotModal(dayIdx: number, hour: number) {
    const slotDate = new Date(monday);
    slotDate.setDate(monday.getDate() + dayIdx);
    slotDate.setHours(hour, 0, 0, 0);

    setSlotModal({
      open: true,
      dayIdx,
      hour,
      date: slotDate,
    });
    setModalType('TASK');
    setModalTaskId('');
    setModalRationale('');
    setModalDurationHours(1);
    setModalIsFixed(false);
  }

  async function handleCreateSlotEvent() {
    if (!slotModal) return;
    setSchedulingSlot(true);
    try {
      const startTime = slotModal.date.toISOString();
      const endDate = new Date(slotModal.date);
      endDate.setHours(endDate.getHours() + modalDurationHours);
      const endTime = endDate.toISOString();

      const selectedTask = (pendingTasks ?? []).find((t) => t.id === modalTaskId);
      const rationale = modalRationale.trim() || selectedTask?.title || `${modalType} block`;

      await apiFetch('/calendar', {
        method: 'POST',
        body: JSON.stringify({
          startTime,
          endTime,
          type: modalType,
          taskId: modalTaskId || undefined,
          rationale,
          isFixed: modalIsFixed,
        }),
      });
      refetch();
      setSlotModal(null);
      showToast('✨ Event scheduled!');
    } catch {
      showToast('Failed to schedule event');
    } finally {
      setSchedulingSlot(false);
    }
  }

  async function deleteEvent(id: string) {
    try {
      await apiFetch(`/calendar/${id}`, { method: 'DELETE' });
      refetch();
      showToast('Event removed');
    } catch {
      showToast('Failed to remove event');
    }
  }

  const monthLabel = monday.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <AppLayout>
      <div className="zen-page zen-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Toast */}
        {toast && <div className="zen-toast">{toast}</div>}

        {/* ═══════ HEADER ═══════ */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="zen-header-icon" style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined">calendar_month</span>
            </div>
            <div>
              <h1 className="zen-text-primary" style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Calendar</h1>
              <p className="zen-text-muted" style={{ fontSize: 14, margin: 0 }}>
                Week of {monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              id="calendar-prev"
              onClick={() => setWeekOffset((o) => o - 1)}
              className="zen-icon-btn"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="zen-text-secondary" style={{ fontSize: 14, fontWeight: 600, padding: '0 8px' }}>{monthLabel}</span>
            <button
              id="calendar-next"
              onClick={() => setWeekOffset((o) => o + 1)}
              className="zen-icon-btn"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>

          </div>
        </header>

        {/* ═══════ CALENDAR GRID ═══════ */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--sage)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
          </div>
        ) : (
          <div className="zen-glass zen-fade-in zd-2" style={{ padding: 20, overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: 1, minWidth: 700 }}>
              <div />
              {DAYS.map((d, di) => {
                const date = new Date(monday);
                date.setDate(monday.getDate() + di);
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={d}
                    style={{ textAlign: 'center', paddingBottom: 10, fontWeight: isToday ? 700 : 600 }}
                    className={isToday ? 'zen-text-accent' : 'zen-text-secondary'}
                  >
                    <div className="zen-label" style={{ letterSpacing: '0.06em' }}>{d}</div>
                    <div style={{ fontSize: 12, marginTop: 2, color: isToday ? 'var(--sage)' : 'var(--text-2)' }}>
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}

              {HOURS.map((h) => (
                <div key={h} style={{ display: 'contents' }}>
                  <div className="zen-text-muted" style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', paddingRight: 10, paddingTop: 10 }}>
                    {h}:00
                  </div>
                  {DAYS.map((d, di) => {
                    const key = `${di}-${h}`;
                    const cellEvents = eventGrid[key] ?? [];
                    return (
                      <div
                        key={`${d}-${h}`}
                        onClick={(e) => {
                          if (e.target === e.currentTarget) {
                            openSlotModal(di, h);
                          }
                        }}
                        className="cal-cell"
                        style={{ position: 'relative' }}
                      >
                        {cellEvents.length === 0 && (
                          <span style={{ opacity: 0, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--sage)', pointerEvents: 'none', transition: 'opacity 0.15s ease' }}
                            className="cal-cell-plus"
                          >
                            +
                          </span>
                        )}
                        {cellEvents.map((event) => {
                          const dur = eventDuration(event);
                          const colorClass = TYPE_CLASS[event.type] ?? TYPE_CLASS.MANUAL;
                          return (
                            <div
                              key={event.id}
                              className={`${colorClass}`}
                              style={{
                                position: 'absolute',
                                insetInline: 2,
                                top: 2,
                                borderRadius: 8,
                                padding: '2px 6px',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                height: `${Math.max(dur, 1) * 40 - 4}px`,
                              }}
                              onClick={(evt) => {
                                evt.stopPropagation();
                                setTooltip(
                                  tooltip?.id === event.id
                                    ? null
                                    : {
                                        id: event.id,
                                        text: event.rationale ?? event.type,
                                      },
                                );
                              }}
                            >
                              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.type}</span>
                              {/* XAI tooltip */}
                              {tooltip?.id === event.id && (
                                <div style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  zIndex: 50,
                                  marginTop: 4,
                                  width: 192,
                                  background: 'var(--glass-dark)',
                                  backdropFilter: 'blur(20px)',
                                  WebkitBackdropFilter: 'blur(20px)',
                                  color: 'var(--text-0)',
                                  fontSize: 12,
                                  padding: '10px 14px',
                                  borderRadius: 14,
                                  border: '1px solid var(--border-dark)',
                                  boxShadow: 'var(--shadow-2)',
                                }}>
                                  {tooltip.text}
                                  <button
                                    style={{
                                      display: 'block',
                                      marginTop: 6,
                                      color: 'var(--rose)',
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      fontFamily: 'inherit',
                                      padding: 0,
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteEvent(event.id);
                                      setTooltip(null);
                                    }}
                                  >
                                    Remove event
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="zen-fade-in zd-3" style={{ display: 'flex', gap: 20, fontSize: 13, flexWrap: 'wrap', color: 'var(--text-2)', fontWeight: 500 }}>
          {Object.entries(TYPE_CLASS).map(([type, cls]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className={cls} style={{ width: 12, height: 12, borderRadius: 4 }} />
              {type}
            </div>
          ))}
        </div>

        {events.length === 0 && !loading && (
          <p className="zen-text-muted" style={{ textAlign: 'center', fontSize: 14, fontStyle: 'italic' }}>
            No events this week. Click any slot to schedule an event!
          </p>
        )}

        {/* Quick Schedule Slot Modal */}
        {slotModal?.open && (
          <div className="zen-modal-backdrop">
            <div className="zen-modal" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--divider)', paddingBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--sage)' }}>add_circle</span>
                  <h3 className="zen-text-primary" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Quick Schedule Event</h3>
                </div>
                <button
                  onClick={() => setSlotModal(null)}
                  className="zen-icon-btn"
                  style={{ width: 32, height: 32 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              <div className="zen-chip" style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-1)' }}>
                📅 <strong>{slotModal.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong> at <strong>{slotModal.hour}:00</strong>
              </div>

              {/* Event Type selection */}
              <div>
                <label className="zen-label" style={{ display: 'block', marginBottom: 8 }}>Event Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {(['TASK', 'FOCUS', 'BREAK', 'MANUAL'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setModalType(t)}
                      className={modalType === t ? 'zen-btn-primary' : 'zen-chip'}
                      style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, justifyContent: 'center', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Task */}
              <div>
                <label className="zen-label" style={{ display: 'block', marginBottom: 8 }}>Associate Task (Optional)</label>
                <select
                  value={modalTaskId}
                  onChange={(e) => setModalTaskId(e.target.value)}
                  className="zen-select"
                >
                  <option value="">-- No specific task --</option>
                  {(pendingTasks ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Title/Rationale */}
              <div>
                <label className="zen-label" style={{ display: 'block', marginBottom: 8 }}>Title / Rationale</label>
                <input
                  type="text"
                  placeholder="e.g. Deep Work Session, Team Sync"
                  value={modalRationale}
                  onChange={(e) => setModalRationale(e.target.value)}
                  className="zen-input"
                />
              </div>

              {/* Duration & Fixed Toggle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="zen-label" style={{ display: 'block', marginBottom: 8 }}>Duration</label>
                  <select
                    value={modalDurationHours}
                    onChange={(e) => setModalDurationHours(Number(e.target.value))}
                    className="zen-select"
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={3}>3 hours</option>
                  </select>
                </div>
                <div>
                  <label className="zen-label" style={{ display: 'block', marginBottom: 8 }}>Lock Slot</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8, fontSize: 13, color: 'var(--text-1)' }}>
                    <input
                      type="checkbox"
                      checked={modalIsFixed}
                      onChange={(e) => setModalIsFixed(e.target.checked)}
                      style={{ accentColor: 'var(--sage)' }}
                    />
                    Is Fixed Event
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
                <button
                  onClick={() => setSlotModal(null)}
                  className="zen-btn-secondary"
                  style={{ fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSlotEvent}
                  disabled={schedulingSlot}
                  className="zen-btn-primary"
                  style={{ fontSize: 13 }}
                >
                  {schedulingSlot ? 'Scheduling...' : 'Save Event'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS to show + on hover */}
      <style>{`
        .cal-cell:hover .cal-cell-plus { opacity: 1 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AppLayout>
  );
}
