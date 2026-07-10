/**
 * useDeepLink — React hook that navigates to the correct Wouter route
 * when the app is opened via a deep link or universal link.
 *
 * Handles:
 *   acpdemocracy://mobile/signals/123    → /mobile/signals/123
 *   https://acpdemocracy.com/mobile/...  → /mobile/...
 *
 * The hook is intended to be mounted once in MobileApp.
 */

import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { onDeepLink } from '@/mobile/services/native';

export function useDeepLink() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const unsub = onDeepLink((path: string) => {
      // Only navigate to /mobile/* routes for safety
      if (path.startsWith('/mobile')) {
        navigate(path);
      }
    });
    return unsub;
  }, [navigate]);
}
