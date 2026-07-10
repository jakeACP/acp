/**
 * useHaptics — Capacitor haptic feedback hook.
 *
 * All methods are safe no-ops on web / when haptics are unavailable.
 *
 * Usage:
 *   const { impact, notification, selection } = useHaptics();
 *   <button onPointerDown={() => impact('light')} />
 */

import { Capacitor } from '@capacitor/core';
import { useCallback } from 'react';

type ImpactStyle      = 'heavy' | 'medium' | 'light';
type NotificationKind = 'success' | 'warning' | 'error';

// Lazy import — returns null on web
async function getHaptics() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import('@capacitor/haptics');
    return mod;
  } catch {
    return null;
  }
}

export function useHaptics() {
  /**
   * Physical impact feedback.  style: 'light' (default), 'medium', 'heavy'.
   * Use for: like/unlike taps, button presses, item selection.
   */
  const impact = useCallback(async (style: ImpactStyle = 'light') => {
    const mod = await getHaptics();
    if (!mod) return;
    try {
      const { Haptics, ImpactStyle: IS } = mod;
      const styleMap = { light: IS.Light, medium: IS.Medium, heavy: IS.Heavy };
      await Haptics.impact({ style: styleMap[style] });
    } catch {}
  }, []);

  /**
   * Notification feedback.  kind: 'success' (default), 'warning', 'error'.
   * Use for: successful post, failed action, warning dialog.
   */
  const notification = useCallback(async (kind: NotificationKind = 'success') => {
    const mod = await getHaptics();
    if (!mod) return;
    try {
      const { Haptics, NotificationType: NT } = mod;
      const kindMap = { success: NT.Success, warning: NT.Warning, error: NT.Error };
      await Haptics.notification({ type: kindMap[kind] });
    } catch {}
  }, []);

  /**
   * Selection feedback — subtle click for list/tab changes.
   * Use for: bottom nav tab switch, scroll picker.
   */
  const selection = useCallback(async () => {
    const mod = await getHaptics();
    if (!mod) return;
    try {
      const { Haptics } = mod;
      await Haptics.selectionStart();
      await Haptics.selectionEnd();
    } catch {}
  }, []);

  /**
   * Vibrate for `durationMs`.  Fallback to navigator.vibrate on web.
   */
  const vibrate = useCallback(async (durationMs = 100) => {
    const mod = await getHaptics();
    if (mod) {
      try { await mod.Haptics.vibrate({ duration: durationMs }); } catch {}
    } else if (navigator.vibrate) {
      navigator.vibrate(durationMs);
    }
  }, []);

  return { impact, notification, selection, vibrate };
}
