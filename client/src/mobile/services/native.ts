/**
 * native.ts — Central Capacitor native-capability registry.
 *
 * All Capacitor calls are guarded by isNative() so this module imports
 * safely in the browser and degrades gracefully.  Import this instead of
 * calling Capacitor plugins directly so every feature has one place to gate.
 *
 * Usage:
 *   import { Native } from '@/mobile/services/native';
 *   await Native.init();          // called once in MobileApp on mount
 *   await Native.statusBar.dark(); // set dark-content status bar
 */

import { Capacitor } from '@capacitor/core';

// ── Platform detection ────────────────────────────────────────────────────────

export const isNative   = (): boolean => Capacitor.isNativePlatform();
export const isIOS      = (): boolean => Capacitor.getPlatform() === 'ios';
export const isAndroid  = (): boolean => Capacitor.getPlatform() === 'android';
export const isWeb      = (): boolean => Capacitor.getPlatform() === 'web';

// ── Lazy plugin getters (never throws on web) ─────────────────────────────────

async function getSplash() {
  if (!isNative()) return null;
  try { const { SplashScreen } = await import('@capacitor/splash-screen'); return SplashScreen; }
  catch { return null; }
}

async function getStatusBar() {
  if (!isNative()) return null;
  try { const { StatusBar } = await import('@capacitor/status-bar'); return StatusBar; }
  catch { return null; }
}

async function getApp() {
  if (!isNative()) return null;
  try { const { App } = await import('@capacitor/app'); return App; }
  catch { return null; }
}

// ── Status bar helpers ────────────────────────────────────────────────────────

const statusBar = {
  async dark() {
    const sb = await getStatusBar();
    if (!sb) return;
    try {
      const { Style } = await import('@capacitor/status-bar');
      await sb.setStyle({ style: Style.Dark });
      if (isAndroid()) await sb.setBackgroundColor({ color: '#0a0c10' });
    } catch {}
  },
  async light() {
    const sb = await getStatusBar();
    if (!sb) return;
    try {
      const { Style } = await import('@capacitor/status-bar');
      await sb.setStyle({ style: Style.Light });
    } catch {}
  },
  async overlay(enabled: boolean) {
    const sb = await getStatusBar();
    if (!sb || !isAndroid()) return;
    try { await sb.setOverlaysWebView({ overlay: enabled }); } catch {}
  },
  async hide() {
    const sb = await getStatusBar();
    if (!sb) return;
    try { await sb.hide(); } catch {}
  },
  async show() {
    const sb = await getStatusBar();
    if (!sb) return;
    try { await sb.show(); } catch {}
  },
};

// ── Splash screen ─────────────────────────────────────────────────────────────

const splash = {
  async hide(fadeMs = 300) {
    const sp = await getSplash();
    if (!sp) return;
    try { await sp.hide({ fadeOutDuration: fadeMs }); } catch {}
  },
};

// ── Deep link listener ────────────────────────────────────────────────────────

type DeepLinkHandler = (path: string) => void;

const _deepLinkHandlers: DeepLinkHandler[] = [];

/**
 * Register a handler that receives the path portion of any incoming deep link.
 * Handles both custom scheme (acpdemocracy://) and universal links
 * (https://acpdemocracy.com/mobile/...).
 * Returns an unsubscribe function.
 */
export function onDeepLink(handler: DeepLinkHandler): () => void {
  _deepLinkHandlers.push(handler);
  return () => {
    const idx = _deepLinkHandlers.indexOf(handler);
    if (idx !== -1) _deepLinkHandlers.splice(idx, 1);
  };
}

function _dispatchDeepLink(url: string) {
  try {
    const parsed = new URL(url);
    let path = '';
    if (parsed.protocol === 'acpdemocracy:') {
      path = '/' + (parsed.hostname || '') + parsed.pathname;
    } else {
      path = parsed.pathname + parsed.search;
    }
    if (!path.startsWith('/mobile')) return;
    _deepLinkHandlers.forEach(h => h(path));
  } catch {}
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

let _initialized = false;

/**
 * Call once when the mobile app mounts.
 * - Hides the splash screen
 * - Sets the status bar style for our dark UI
 * - Starts listening for deep links
 */
export async function initNativeApp() {
  if (_initialized) return;
  _initialized = true;

  await Promise.all([
    statusBar.dark(),
    splash.hide(),
  ]);

  const app = await getApp();
  if (app) {
    app.addListener('appUrlOpen', (data: { url: string }) => {
      _dispatchDeepLink(data.url);
    });
  }
}

// ── Exported namespace ────────────────────────────────────────────────────────

export const Native = { isNative, isIOS, isAndroid, isWeb, statusBar, splash, initNativeApp };
