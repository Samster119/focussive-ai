export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.register('/sw.js'); } catch { return null; }
}

export type PermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function getPermission(): PermissionStatus {
  return typeof window !== 'undefined' && 'Notification' in window
    ? Notification.permission as PermissionStatus
    : 'unsupported';
}

export async function requestPermission(): Promise<PermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try { return await Notification.requestPermission() as PermissionStatus; } catch { return 'denied'; }
}

export async function notify(title: string, options?: NotificationOptions): Promise<boolean> {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return false;
  try {
    const n = new Notification(title, { icon: '/favicon.ico', ...options });
    n.onclick = () => { window.focus(); n.close(); };
    return true;
  } catch { return false; }
}

export function notifyFocusBreak(type: 'work_complete' | 'break_complete') {
  notify(
    type === 'work_complete' ? '🎯 Focus Session Complete!' : '⚡ Break Finished!',
    { body: type === 'work_complete' ? 'Great job! Time to take a break.' : 'Ready for the next session?', tag: 'focussive-focus' }
  );
}

export function notifyBurnoutAlert(score: number, threshold = 75) {
  notify('⚠️ Burnout Risk High', {
    body: `Burnout score ${score.toFixed(1)} (threshold ${threshold}). Consider a break.`,
    tag: 'focussive-burnout',
    requireInteraction: true,
  });
}

export function notifyUpcomingEvent(title: string, minutesLeft: number) {
  notify(`⏰ ${title} in ${minutesLeft}m`, { body: `"${title}" starts soon.`, tag: `focussive-event-${title}` });
}