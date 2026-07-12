# ACP iOS Release Checklist

## Current Native Target

- App name: `ACP`
- Bundle ID: `us.anticorruptionparty.app`
- iOS deployment target: `15.0`
- Device family: iPhone
- Orientation: portrait
- Capacitor runtime: `8.4.1`
- Production start URL: `https://anticorruptionparty.us/mobile`

The app currently uses the deployed ACP mobile web experience as its production WebView entrypoint so login/session cookies continue to work with the existing backend. That is the fastest path to TestFlight, but it also means App Review may examine it as a web-backed app. Keep the mobile interface app-like, fast, and clearly useful.

## Local Commands

Install dependencies:

```bash
npm ci
```

Build the web app and sync the iOS project:

```bash
npm run ios:build
```

Open the native project:

```bash
npm run ios:open
```

## Xcode Setup

1. Install Xcode 26 or later from the Mac App Store.
2. Open `ios/App/App.xcodeproj`.
3. Select the `App` target, then `Signing & Capabilities`.
4. Set your Apple Developer team.
5. Confirm the bundle identifier is `us.anticorruptionparty.app`.
6. Let Xcode manage signing automatically for the first release.
7. Select `Any iOS Device` as the destination.
8. Run `Product > Archive`.
9. In Organizer, distribute the archive to App Store Connect/TestFlight.

## App Store Connect

1. Create an iOS app record using bundle ID `us.anticorruptionparty.app`.
2. Add a privacy policy URL.
3. Complete App Privacy nutrition labels for account/profile data, user content, identifiers, diagnostics, purchases/subscriptions if enabled, and any analytics actually used in production.
4. Add reviewer credentials for a non-admin test account.
5. Upload iPhone screenshots from the mobile Signals feed, Signal player, create flow, profile, and civic/reps features.
6. Select the uploaded build, answer export compliance, then submit for TestFlight external review or App Review.

## Verification Status

- `npm run ios:build`: passes.
- `npx cap doctor ios`: passes.
- `xcodebuild`: blocked on this Mac because only Command Line Tools are installed; full Xcode is not present.
- `npm run check`: fails on pre-existing TypeScript issues throughout the web app. The production Vite/esbuild build still succeeds.

## App Review Risk Notes

Apple's guideline 4.2 expects apps to be more than a repackaged website. This build adds native app packaging, branded icons/splash, native share support, haptic tab feedback, camera/microphone/photo permission descriptions, and mobile-first routing. Before a public App Store submission, the strongest improvement would be adding at least one deeper native capability such as push notifications, native media capture/upload, or a local bundled UI with a native-auth/API layer.
