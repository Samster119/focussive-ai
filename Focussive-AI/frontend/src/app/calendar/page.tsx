'use client';

import { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import { useApi } from '@/lib/query';
import { apiFetch } from '@/lib/api';

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

const TYPE_COLORS: Record<string, string> = {
  FOCUS: 'bg-[#633BF3]/15 text-[#4600D7] border-[#633BF3]/30',
  TASK: 'bg-[#4A0EDC]/10 text-[#4A0EDC] border-[#4A0EDC]/20',
  BREAK: 'bg-[#34A853]/15 text-[#137333] border-[#34A853]/30',
  MANUAL: 'bg-[#FF8A65]/20 text-[#B23B0A] border-[#FF8A65]/40',
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
  const [autoScheduling, setAutoScheduling] = useState(false);
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

  async function handleAutoSchedule() {
    setAutoScheduling(true);
    try {
      const result = await apiFetch<{ eventId: string }[]>('/calendar/auto-schedule', {
        method: 'POST',
      });
      refetch();
      showToast(`🗓️ Scheduled ${result.length} event${result.length !== 1 ? 's' : ''}!`);
    } catch (e) {
      showToast('Auto-schedule failed. Add tasks first!');
    } finally {
      setAutoScheduling(false);
    }
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
      <div className="animate-fade-in space-y-lg">
        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-on-surface text-surface px-lg py-sm rounded-xl card-shadow font-body-sm animate-fade-in">
            {toast}
          </div>
        )}

        <PageHeader
          icon="calendar_month"
          title="Calendar"
          subtitle={`Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          actions={
            <div className="flex items-center gap-sm">
              <button
                id="calendar-prev"
                onClick={() => setWeekOffset((o) => o - 1)}
                className="bg-surface-container-lowest w-10 h-10 rounded-xl card-shadow flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <span className="font-title-sm text-on-surface-variant px-sm">{monthLabel}</span>
              <button
                id="calendar-next"
                onClick={() => setWeekOffset((o) => o + 1)}
                className="bg-surface-container-lowest w-10 h-10 rounded-xl card-shadow flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
              <button
                id="calendar-auto-schedule"
                onClick={handleAutoSchedule}
                disabled={autoScheduling}
                className="bg-primary hover:bg-primary-container text-white px-md py-sm rounded-xl font-title-sm transition-all active:scale-95 flex items-center gap-xs disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-lg">auto_fix_high</span>
                {autoScheduling ? 'Scheduling…' : 'Auto-Schedule'}
              </button>
            </div>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-xl">
            <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
          </div>
        ) : (
          <div className="bg-surface-container-lowest p-md rounded-xl card-shadow overflow-x-auto">
            <div className="grid grid-cols-8 gap-px min-w-[700px]">
              <div />
              {DAYS.map((d, di) => {
                const date = new Date(monday);
                date.setDate(monday.getDate() + di);
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={d}
                    className={`text-center pb-sm font-label-caps ${isToday ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
                  >
                    {d}
                    <div className={`text-xs ${isToday ? 'text-primary' : 'text-outline'}`}>
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}

              {HOURS.map((h) => (
                <div key={h} className="contents">
                  <div className="text-outline pr-sm py-md text-right font-mono-sm">
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
                        className="border border-outline-variant/20 min-h-[40px] relative hover:bg-primary-fixed/30 cursor-pointer group/cell transition-colors"
                      >
                        {cellEvents.length === 0 && (
                          <span className="opacity-0 group-hover/cell:opacity-100 absolute inset-0 flex items-center justify-center text-primary font-bold text-xs pointer-events-none transition-opacity">
                            +
                          </span>
                        )}
                        {cellEvents.map((event) => {
                          const dur = eventDuration(event);
                          const color = TYPE_COLORS[event.type] ?? TYPE_COLORS.MANUAL;
                          return (
                            <div
                              key={event.id}
                              className={`absolute inset-x-0.5 top-0.5 rounded-md border px-1 py-0.5 font-label-caps cursor-pointer group ${color}`}
                              style={{ height: `${Math.max(dur, 1) * 40 - 4}px` }}
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
                              <span className="truncate block">{event.type}</span>
                              {/* XAI tooltip */}
                              {tooltip?.id === event.id && (
                                <div className="absolute top-full left-0 z-50 mt-1 w-48 bg-on-surface text-surface text-xs p-sm rounded-lg shadow-lg">
                                  {tooltip.text}
                                  <button
                                    className="block mt-1 text-error/80 hover:text-error"
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
        <div className="flex gap-lg font-body-sm text-on-surface-variant flex-wrap">
          {Object.entries(TYPE_COLORS).map(([type, cls]) => (
            <div key={type} className="flex items-center gap-xs">
              <div className={`w-3 h-3 rounded border ${cls}`} />
              {type}
            </div>
          ))}
        </div>

        {events.length === 0 && !loading && (
          <p className="text-center font-body-md text-on-surface-variant">
            No events this week. Click any slot to schedule an event or use <strong>Auto-Schedule</strong>!
          </p>
        )}

        {/* Quick Schedule Slot Modal */}
        {slotModal?.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-md">
            <div className="bg-surface-container-lowest p-lg rounded-2xl card-shadow w-full max-w-md space-y-md border border-outline-variant/30">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-sm">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary">add_circle</span>
                  <h3 className="font-title-sm text-on-surface font-bold">Quick Schedule Event</h3>
                </div>
                <button
                  onClick={() => setSlotModal(null)}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="font-body-sm text-on-surface-variant bg-surface-container-low p-sm rounded-xl">
                📅 <strong>{slotModal.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong> at <strong>{slotModal.hour}:00</strong>
              </div>

              {/* Event Type selection */}
              <div>
                <label className="font-label-caps text-outline mb-xs block">Event Type</label>
                <div className="grid grid-cols-4 gap-xs">
                  {(['TASK', 'FOCUS', 'BREAK', 'MANUAL'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setModalType(t)}
                      className={`py-1.5 px-xs rounded-lg font-label-caps text-xs transition-colors ${
                        modalType === t
                          ? 'bg-primary text-white font-bold'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Task */}
              <div>
                <label className="font-label-caps text-outline mb-xs block">Associate Task (Optional)</label>
                <select
                  value={modalTaskId}
                  onChange={(e) => setModalTaskId(e.target.value)}
                  className="w-full p-sm rounded-lg bg-surface-container-low border border-outline-variant/50 font-body-md text-sm focus:outline-none focus:border-primary"
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
                <label className="font-label-caps text-outline mb-xs block">Title / Rationale</label>
                <input
                  type="text"
                  placeholder="e.g. Deep Work Session, Team Sync"
                  value={modalRationale}
                  onChange={(e) => setModalRationale(e.target.value)}
                  className="w-full p-sm rounded-lg bg-surface-container-low border border-outline-variant/50 font-body-md text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Duration & Fixed Toggle */}
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="font-label-caps text-outline mb-xs block">Duration</label>
                  <select
                    value={modalDurationHours}
                    onChange={(e) => setModalDurationHours(Number(e.target.value))}
                    className="w-full p-sm rounded-lg bg-surface-container-low border border-outline-variant/50 font-body-md text-sm focus:outline-none focus:border-primary"
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={3}>3 hours</option>
                  </select>
                </div>
                <div>
                  <label className="font-label-caps text-outline mb-xs block">Lock Slot</label>
                  <label className="flex items-center gap-xs cursor-pointer mt-2 text-xs font-body-sm text-on-surface">
                    <input
                      type="checkbox"
                      checked={modalIsFixed}
                      onChange={(e) => setModalIsFixed(e.target.checked)}
                      className="accent-primary"
                    />
                    Is Fixed Event
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-sm pt-sm">
                <button
                  onClick={() => setSlotModal(null)}
                  className="px-md py-sm rounded-xl font-title-sm text-xs bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSlotEvent}
                  disabled={schedulingSlot}
                  className="px-lg py-sm rounded-xl font-title-sm text-xs bg-primary text-white hover:bg-primary-container disabled:opacity-60"
                >
                  {schedulingSlot ? 'Scheduling...' : 'Save Event'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
