/**
 * push-service.ts — APNs (iOS) / FCM (Android) push notification service.
 *
 * Permission is requested just-in-time when the user explicitly enables
 * push notifications in Settings › Notifications.  It is NOT requested on
 * first launch.
 *
 * Flow:
 *   1. User taps "Enable push notifications" in the notifications settings.
 *   2. requestAndRegister() is called.
 *   3. Native OS permission dialog appears (just-in-time).
 *   4. On grant: token is obtained and POSTed to /api/push/register.
 *   5. App listens for foreground notifications and notification taps.
 *
 * On web: all functions are safe no-ops that return gracefully.
 */

import { isNative } from './native';
import { apiRequest } from '@/lib/queryClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PushPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

export interface PushNotificationPayload {
  id: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

type ForegroundHandler = (notification: PushNotificationPayload) => void;
type TapHandler       = (notification: PushNotificationPayload) => void;

const _foregroundHandlers: ForegroundHandler[] = [];
const _tapHandlers: TapHandler[] = [];

// ── Plugin getter ─────────────────────────────────────────────────────────────

async function getPlugin() {
  if (!isNative()) return null;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    return PushNotifications;
  } catch {
    return null;
  }
}

// ── Permission status ─────────────────────────────────────────────────────────

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  const plugin = await getPlugin();
  if (!plugin) return 'unavailable';
  try {
    const result = await plugin.checkPermissions();
    if (result.receive === 'granted')  return 'granted';
    if (result.receive === 'denied')   return 'denied';
    return 'prompt';
  } catch {
    return 'unavailable';
  }
}

// ── JIT registration ──────────────────────────────────────────────────────────

/**
 * Request push permission and, if granted, register for a token.
 * Returns the final permission status.
 */
export async function requestAndRegister(): Promise<PushPermissionStatus> {
  const plugin = await getPlugin();
  if (!plugin) return 'unavailable';

  try {
    // Request OS permission (JIT — user must have explicitly triggered this)
    const result = await plugin.requestPermissions();
    if (result.receive !== 'granted') return 'denied';

    // Register to get device token
    await plugin.register();

    // Set up listeners (idempotent — Capacitor deduplicates)
    _setupListeners(plugin);

    return 'granted';
  } catch {
    return 'denied';
  }
}

// ── Listeners ─────────────────────────────────────────────────────────────────

let _listenersSetUp = false;

function _setupListeners(plugin: Awaited<ReturnType<typeof getPlugin>>) {
  if (!plugin || _listenersSetUp) return;
  _listenersSetUp = true;

  // Token received — send to server
  plugin.addListener('registration', async (token: { value: string }) => {
    try {
      await apiRequest('/api/push/register', 'POST', {
        token: token.value,
        platform: 'ios',
      });
    } catch {}
  });

  // Registration error
  plugin.addListener('registrationError', (err: unknown) => {
    console.warn('[push] Registration error:', err);
  });

  // Foreground notification received
  plugin.addListener('pushNotificationReceived', (notification: any) => {
    const payload: PushNotificationPayload = {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      data: notification.data,
    };
    _foregroundHandlers.forEach(h => h(payload));
  });

  // User tapped a notification (app was backgrounded / closed)
  plugin.addListener('pushNotificationActionPerformed', (action: any) => {
    const payload: PushNotificationPayload = {
      id: action.notification?.id ?? '',
      title: action.notification?.title,
      body: action.notification?.body,
      data: action.notification?.data,
    };
    _tapHandlers.forEach(h => h(payload));
  });
}

// ── Re-register on startup ────────────────────────────────────────────────────

/**
 * Call on app startup (after the user has already granted permission in a
 * previous session).  Refreshes the token silently and re-attaches listeners.
 */
export async function reRegisterIfGranted() {
  const status = await getPushPermissionStatus();
  if (status !== 'granted') return;
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.register();
    _setupListeners(plugin);
  } catch {}
}

// ── Unregister ────────────────────────────────────────────────────────────────

export async function unregisterPush() {
  try {
    await apiRequest('/api/push/unregister', 'DELETE', {});
  } catch {}
}

// ── Subscription helpers ──────────────────────────────────────────────────────

export function onForegroundNotification(handler: ForegroundHandler): () => void {
  _foregroundHandlers.push(handler);
  return () => {
    const i = _foregroundHandlers.indexOf(handler);
    if (i !== -1) _foregroundHandlers.splice(i, 1);
  };
}

export function onNotificationTap(handler: TapHandler): () => void {
  _tapHandlers.push(handler);
  return () => {
    const i = _tapHandlers.indexOf(handler);
    if (i !== -1) _tapHandlers.splice(i, 1);
  };
}
