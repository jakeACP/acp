/**
 * useNetworkStatus — real-time network connectivity hook.
 *
 * On native: uses @capacitor/network for accurate cell/wifi status.
 * On web: falls back to navigator.onLine + 'online'/'offline' events.
 *
 * Usage:
 *   const { isOnline, connectionType } = useNetworkStatus();
 */

import { Capacitor } from '@capacitor/core';
import { useEffect, useState, useRef } from 'react';
import { startOfflineWatcher } from '@/mobile/lib/offline-queue';

export type ConnectionType = 'wifi' | 'cellular' | 'none' | 'unknown';

export interface NetworkStatus {
  isOnline: boolean;
  connectionType: ConnectionType;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
  });

  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Start the offline queue watcher (safe to call multiple times)
    startOfflineWatcher();

    let mounted = true;

    async function initCapacitorNetwork() {
      if (!Capacitor.isNativePlatform()) return false;
      try {
        const { Network } = await import('@capacitor/network');
        const current = await Network.getStatus();
        if (mounted) {
          setStatus({
            isOnline: current.connected,
            connectionType: (current.connectionType as ConnectionType) ?? 'unknown',
          });
        }

        const handle = await Network.addListener('networkStatusChange', (s) => {
          if (mounted) {
            setStatus({
              isOnline: s.connected,
              connectionType: (s.connectionType as ConnectionType) ?? 'unknown',
            });
          }
        });

        cleanupRef.current = () => handle.remove();
        return true;
      } catch {
        return false;
      }
    }

    initCapacitorNetwork().then((usedNative) => {
      if (!usedNative) {
        // Web fallback
        const onOnline  = () => setStatus({ isOnline: true,  connectionType: 'unknown' });
        const onOffline = () => setStatus({ isOnline: false, connectionType: 'none'    });
        window.addEventListener('online',  onOnline);
        window.addEventListener('offline', onOffline);
        cleanupRef.current = () => {
          window.removeEventListener('online',  onOnline);
          window.removeEventListener('offline', onOffline);
        };
      }
    });

    return () => {
      mounted = false;
      cleanupRef.current?.();
    };
  }, []);

  return status;
}
