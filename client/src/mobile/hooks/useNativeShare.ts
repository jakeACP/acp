/**
 * useNativeShare — hook for sharing content via the native OS share sheet.
 *
 * Priority:
 *   1. Capacitor Share plugin (native iOS/Android share sheet)
 *   2. navigator.share (Web Share API — Chrome Android, Safari)
 *   3. Clipboard copy fallback
 *
 * Usage:
 *   const { share, canShare } = useNativeShare();
 *   await share({ title: 'Post', text: 'Check this out', url: 'https://...' });
 */

import { Capacitor } from '@capacitor/core';
import { useCallback, useState } from 'react';

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  /** Dialog title shown inside the native share sheet (iOS ignores this) */
  dialogTitle?: string;
}

export function useNativeShare() {
  const [copied, setCopied] = useState(false);

  const share = useCallback(async (options: ShareOptions): Promise<'shared' | 'copied' | 'unavailable'> => {
    const { title, text, url, dialogTitle } = options;

    // ── 1. Capacitor Share ────────────────────────────────────────────────
    if (Capacitor.isNativePlatform()) {
      try {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title, text, url, dialogTitle });
        return 'shared';
      } catch (err: any) {
        // User dismissed the share sheet — not an error
        if (err?.message?.includes('cancel') || err?.message?.includes('dismiss')) {
          return 'unavailable';
        }
      }
    }

    // ── 2. Web Share API ──────────────────────────────────────────────────
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return 'shared';
      } catch {}
    }

    // ── 3. Clipboard fallback ─────────────────────────────────────────────
    const shareText = [title, text, url].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return 'copied';
    } catch {}

    return 'unavailable';
  }, []);

  const canShare = Capacitor.isNativePlatform() || !!navigator.share;

  return { share, canShare, copied };
}
