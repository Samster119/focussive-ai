'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import { useApi } from '@/lib/query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth.store';
import { getPermission, requestPermission, notify, PermissionStatus } from '@/lib/notifications';

interface Settings {
  id: string;
  assistantPersonality: string;
  burnoutThresholdScore: number;
  workStartHour: number;
  workEndHour: number;
  enablePushNotifications?: boolean;
  breakReminders?: boolean;
  burnoutAlerts?: boolean;
  eventReminders?: boolean;
}

const PERSONALITIES = ['balanced', 'friendly', 'formal', 'motivational'];

export default function SettingsPage() {
  const { user, refreshMe } = useAuthStore();
  const { data: settings, loading, refetch } = useApi<Settings>('/settings');

  const [personality, setPersonality] = useState('balanced');
  const [workStart, setWorkStart] = useState(9);
  const [workEnd, setWorkEnd] = useState(18);
  const [burnout, setBurnout] = useState(75);
  
  // Notification states
  const [enablePush, setEnablePush] = useState(true);
  const [breakReminders, setBreakReminders] = useState(true);
  const [burnoutAlerts, setBurnoutAlerts] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('default');

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setPermissionStatus(getPermission());
  }, []);

  useEffect(() => {
    if (settings) {
      setPersonality(settings.assistantPersonality);
      setWorkStart(settings.workStartHour);
      setWorkEnd(settings.workEndHour);
      setBurnout(settings.burnoutThresholdScore);
      if (settings.enablePushNotifications !== undefined) setEnablePush(settings.enablePushNotifications);
      if (settings.breakReminders !== undefined) setBreakReminders(settings.breakReminders);
      if (settings.burnoutAlerts !== undefined) setBurnoutAlerts(settings.burnoutAlerts);
      if (settings.eventReminders !== undefined) setEventReminders(settings.eventReminders);
    }
  }, [settings]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleRequestPermission() {
    const res = await requestPermission();
    setPermissionStatus(res);
    if (res === 'granted') {
      showToast('🎉 Notification permission granted!');
    } else if (res === 'denied') {
      showToast('⚠️ Notification permission denied in browser settings.');
    }
  }

  async function handleTestNotification() {
    if (permissionStatus !== 'granted') {
      const res = await requestPermission();
      setPermissionStatus(res);
      if (res !== 'granted') {
        showToast('Please allow browser notifications first.');
        return;
      }
    }
    const success = await notify('🔔 Focussive AI Test Notification', {
      body: 'Notifications are setup and working cleanly on your device!',
      tag: 'test-notification',
    });
    if (success) {
      showToast('Test notification dispatched!');
    } else {
      showToast('Could not trigger notification.');
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          assistantPersonality: personality,
          workStartHour: workStart,
          workEndHour: workEnd,
          burnoutThresholdScore: burnout,
          enablePushNotifications: enablePush,
          breakReminders,
          burnoutAlerts,
          eventReminders,
        }),
      });
      await refreshMe();
      refetch();
      showToast('✅ Settings saved!');
    } catch {
      showToast('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-lg">
        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-on-surface text-surface px-lg py-sm rounded-xl card-shadow font-body-sm animate-fade-in">
            {toast}
          </div>
        )}

        <PageHeader icon="settings" title="Settings" subtitle="Preferences and account" />

        {loading ? (
          <div className="flex items-center justify-center py-xl">
            <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
          </div>
        ) : (
          <>
            {/* Profile */}
            <section className="bg-surface-container-lowest p-lg rounded-xl card-shadow space-y-md">
              <div className="flex items-center gap-sm mb-sm">
                <span className="material-symbols-outlined text-primary">person</span>
                <h2 className="font-title-sm text-on-surface font-semibold">Profile</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div>
                  <label className="font-label-caps text-outline mb-xs block">Full Name</label>
                  <input
                    id="settings-fullname"
                    type="text"
                    value={user?.fullName ?? ''}
                    readOnly
                    className="w-full p-sm rounded-lg bg-surface-container-low border border-outline-variant/50 font-body-md opacity-70"
                  />
                </div>
                <div>
                  <label className="font-label-caps text-outline mb-xs block">Email</label>
                  <input
                    id="settings-email"
                    type="email"
                    value={user?.email ?? ''}
                    readOnly
                    className="w-full p-sm rounded-lg bg-surface-container-low border border-outline-variant/50 font-body-md opacity-70"
                  />
                </div>
              </div>
            </section>

            {/* Notifications Section */}
            <section className="bg-surface-container-lowest p-lg rounded-xl card-shadow space-y-md">
              <div className="flex items-center justify-between mb-sm">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary">notifications_active</span>
                  <h2 className="font-title-sm text-on-surface font-semibold">Desktop & Web Notifications</h2>
                </div>
                <div className="flex items-center gap-xs">
                  <span
                    className={`px-sm py-xs text-xs font-semibold rounded-full capitalize ${
                      permissionStatus === 'granted'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : permissionStatus === 'denied'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    Permission: {permissionStatus}
                  </span>
                </div>
              </div>

              {permissionStatus !== 'granted' && (
                <div className="p-md rounded-xl bg-surface-container-low border border-outline-variant/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-md">
                  <div>
                    <p className="font-title-sm text-on-surface font-medium">Enable Desktop Notifications</p>
                    <p className="font-body-sm text-on-surface-variant">
                      Receive instant break alerts, burnout warnings, and calendar event reminders on your desktop.
                    </p>
                  </div>
                  <button
                    id="settings-request-permission"
                    onClick={handleRequestPermission}
                    className="bg-primary hover:bg-primary-container text-white px-md py-xs rounded-lg font-title-sm transition-all text-nowrap"
                  >
                    Grant Permission
                  </button>
                </div>
              )}

              <div className="space-y-sm pt-xs">
                {/* Master Push Toggle */}
                <div className="flex items-center justify-between py-xs border-b border-outline-variant/20">
                  <div>
                    <span className="font-body-md font-medium text-on-surface">Master Push Notifications</span>
                    <p className="font-body-sm text-on-surface-variant">Master switch for all system desktop notifications</p>
                  </div>
                  <input
                    id="settings-toggle-enable-push"
                    type="checkbox"
                    checked={enablePush}
                    onChange={(e) => setEnablePush(e.target.checked)}
                    className="w-5 h-5 accent-primary cursor-pointer"
                  />
                </div>

                {/* Break Reminders Toggle */}
                <div className="flex items-center justify-between py-xs border-b border-outline-variant/20">
                  <div>
                    <span className="font-body-md font-medium text-on-surface">Focus & Break Reminders</span>
                    <p className="font-body-sm text-on-surface-variant">Alert when focus sessions or rest breaks end</p>
                  </div>
                  <input
                    id="settings-toggle-break-reminders"
                    type="checkbox"
                    checked={breakReminders}
                    onChange={(e) => setBreakReminders(e.target.checked)}
                    className="w-5 h-5 accent-primary cursor-pointer"
                  />
                </div>

                {/* Burnout Alerts Toggle */}
                <div className="flex items-center justify-between py-xs border-b border-outline-variant/20">
                  <div>
                    <span className="font-body-md font-medium text-on-surface">Burnout Risk Warnings</span>
                    <p className="font-body-sm text-on-surface-variant">Alert when workload density exceeds healthy thresholds</p>
                  </div>
                  <input
                    id="settings-toggle-burnout-alerts"
                    type="checkbox"
                    checked={burnoutAlerts}
                    onChange={(e) => setBurnoutAlerts(e.target.checked)}
                    className="w-5 h-5 accent-primary cursor-pointer"
                  />
                </div>

                {/* Event Reminders Toggle */}
                <div className="flex items-center justify-between py-xs">
                  <div>
                    <span className="font-body-md font-medium text-on-surface">Calendar Event Pre-reminders</span>
                    <p className="font-body-sm text-on-surface-variant">5-minute advance notification before scheduled events</p>
                  </div>
                  <input
                    id="settings-toggle-event-reminders"
                    type="checkbox"
                    checked={eventReminders}
                    onChange={(e) => setEventReminders(e.target.checked)}
                    className="w-5 h-5 accent-primary cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-xs">
                <button
                  id="settings-test-notification"
                  onClick={handleTestNotification}
                  className="bg-surface-container-low hover:bg-surface-container-high text-on-surface font-title-sm px-md py-xs rounded-lg transition-colors flex items-center gap-xs"
                >
                  <span className="material-symbols-outlined text-sm">notifications</span>
                  Send Test Notification
                </button>
              </div>
            </section>

            {/* AI Personality */}
            <section className="bg-surface-container-lowest p-lg rounded-xl card-shadow space-y-md">
              <div className="flex items-center gap-sm mb-sm">
                <span className="material-symbols-outlined text-primary">smart_toy</span>
                <h2 className="font-title-sm text-on-surface font-semibold">AI Assistant</h2>
              </div>
              <div>
                <label className="font-label-caps text-outline mb-xs block">Personality</label>
                <div className="flex flex-wrap gap-sm">
                  {PERSONALITIES.map((p) => (
                    <button
                      key={p}
                      id={`settings-personality-${p}`}
                      onClick={() => setPersonality(p)}
                      className={`px-md py-sm rounded-lg font-title-sm capitalize transition-colors ${
                        personality === p
                          ? 'bg-primary text-white'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Work Hours */}
            <section className="bg-surface-container-lowest p-lg rounded-xl card-shadow space-y-md">
              <div className="flex items-center gap-sm mb-sm">
                <span className="material-symbols-outlined text-primary">schedule</span>
                <h2 className="font-title-sm text-on-surface font-semibold">Work Hours</h2>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="font-label-caps text-outline mb-xs block">Start Hour</label>
                  <input
                    id="settings-work-start"
                    type="number"
                    min={0}
                    max={23}
                    value={workStart}
                    onChange={(e) => setWorkStart(Number(e.target.value))}
                    className="w-full p-sm rounded-lg bg-surface-container-low border border-outline-variant/50 font-body-md focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-label-caps text-outline mb-xs block">End Hour</label>
                  <input
                    id="settings-work-end"
                    type="number"
                    min={0}
                    max={23}
                    value={workEnd}
                    onChange={(e) => setWorkEnd(Number(e.target.value))}
                    className="w-full p-sm rounded-lg bg-surface-container-low border border-outline-variant/50 font-body-md focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <p className="font-body-sm text-on-surface-variant">
                Working hours: {workStart}:00 — {workEnd}:00
              </p>
            </section>

            {/* Burnout Threshold */}
            <section className="bg-surface-container-lowest p-lg rounded-xl card-shadow space-y-md">
              <div className="flex items-center gap-sm mb-sm">
                <span className="material-symbols-outlined text-error">local_fire_department</span>
                <h2 className="font-title-sm text-on-surface font-semibold">Burnout Sensitivity</h2>
              </div>
              <div>
                <label className="font-label-caps text-outline mb-xs block">
                  Alert Threshold: <strong>{burnout}</strong>
                </label>
                <input
                  id="settings-burnout"
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={burnout}
                  onChange={(e) => setBurnout(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between font-body-sm text-on-surface-variant mt-xs">
                  <span>More sensitive (50)</span>
                  <span>Less sensitive (100)</span>
                </div>
              </div>
            </section>

            {/* Save / Reset */}
            <div className="flex gap-md">
              <button
                id="settings-save"
                onClick={handleSave}
                disabled={saving}
                className="bg-primary hover:bg-primary-container text-white px-xl py-sm rounded-xl font-title-sm transition-all active:scale-95 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
              <button
                onClick={refetch}
                className="bg-surface-container-low text-on-surface-variant px-xl py-sm rounded-xl font-title-sm hover:bg-surface-container-high transition-colors"
              >
                Reset
              </button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
