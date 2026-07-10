---
name: Capacitor native layer
description: Architecture decisions for the ACP iOS Capacitor integration — plugin imports, push tokens, deep links, permissions.
---

# Capacitor Native Layer

## Plugin import pattern
All Capacitor plugins use **dynamic lazy imports** inside service files, never top-level static imports. This keeps the web bundle clean and prevents crashes on browsers where plugins are not registered.

```ts
async function getHaptics() {
  if (!Capacitor.isNativePlatform()) return null;
  try { return await import('@capacitor/haptics'); } catch { return null; }
}
```

**Why:** Vite statically resolves imports at build time; dynamic imports are deferred and tree-shaken out on web.

## Service files created
- `client/src/mobile/services/native.ts` — platform detection, status bar, splash, deep-link dispatcher
- `client/src/mobile/services/push-service.ts` — APNs JIT registration, token → server, listener management
- `client/src/mobile/lib/offline-queue.ts` — localStorage retry queue flushed on network reconnect

## Hooks created
- `useHaptics` — impact / notification / selection / vibrate; no-ops on web
- `useNativeShare` — Capacitor Share → navigator.share → clipboard fallback
- `useNetworkStatus` — Capacitor Network → navigator.onLine fallback; starts offline queue watcher
- `useDeepLink` — registers `onDeepLink` handler in native.ts, calls Wouter navigate()

## Push token storage
Tokens stored in `users.extendedProfileData.deviceTokens[]` (JSONB, no schema migration needed). Max 5 per user, newest first, deduplicated by token string.
- `POST /api/push/register` — register/refresh token
- `DELETE /api/push/unregister` — remove all tokens (on sign-out)

## Deep links
- Custom URL scheme: `acpdemocracy://` (register in Xcode URL Schemes)
- Universal links domain: configured in capacitor.config.ts `ios.limitsNavigationsToAppBoundDomains`
- AASA file served at `GET /.well-known/apple-app-site-association` — replace `TEAM_ID` with Apple Developer Team ID

## JIT permission pattern
**No permission is requested on first launch.** Permissions flow:
- Push: user taps "Enable" in Settings → Notifications
- Location: user taps location button in MobileRepsPage (existing purpose dialog)
- Camera: user taps image picker in MobileComposePage
- Microphone: granted automatically with camera for signal recorder

## Info.plist required keys (add via Xcode after `npx cap add ios`)
```
NSCameraUsageDescription
NSMicrophoneUsageDescription
NSPhotoLibraryUsageDescription
NSPhotoLibraryAddUsageDescription
NSLocationWhenInUseUsageDescription
UIBackgroundModes → remote-notification
```

## Error boundary
`NativeErrorBoundary` class component wraps the entire `<Switch>` in MobileApp.tsx. Shows mobile-friendly retry UI. Logs to console (Crashlytics picks up `console.error` on iOS).

## How to apply
- When adding a new feature that touches a native API, check `isNative()` / `isNativePlatform()` before calling any plugin
- Add to `native.ts` if it affects global app state (status bar, splash, lifecycle)
- Add to a dedicated service file if it's a standalone feature (push, camera, etc.)
- Always wrap with try/catch and return a safe default on failure
