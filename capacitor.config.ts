import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for ACP Democracy iOS app.
 *
 * ── iOS native build checklist ────────────────────────────────────────────────
 *  1.  Run `npx cap add ios`
 *  2.  Run `npx cap sync ios`
 *  3.  Set APPLE_IAP_SHARED_SECRET in App Store Connect and as a Replit secret.
 *  4.  Create IAP products in App Store Connect:
 *        com.acp.democracy.acpplus.monthly  (Auto-Renewable, $8.99/mo)
 *        com.acp.democracy.acpplus.annual   (Auto-Renewable, $79.99/yr)
 *  5.  Add the following to ios/App/App/Info.plist:
 *
 *        <!-- Camera (Signal recorder, image composer) -->
 *        <key>NSCameraUsageDescription</key>
 *        <string>ACP uses your camera to record Signal videos and take photos for posts.</string>
 *
 *        <!-- Microphone (Signal recorder) -->
 *        <key>NSMicrophoneUsageDescription</key>
 *        <string>ACP uses your microphone to record audio for Signal videos.</string>
 *
 *        <!-- Photo Library read (pick existing photos/videos) -->
 *        <key>NSPhotoLibraryUsageDescription</key>
 *        <string>ACP accesses your photo library to add images and videos to your posts.</string>
 *
 *        <!-- Photo Library write (save recorded signals) -->
 *        <key>NSPhotoLibraryAddUsageDescription</key>
 *        <string>ACP saves your recorded Signal videos to your photo library.</string>
 *
 *        <!-- Location (representatives lookup — always optional / JIT) -->
 *        <key>NSLocationWhenInUseUsageDescription</key>
 *        <string>ACP can use your location to find your congressional representatives and local elections. You can always enter a ZIP code instead.</string>
 *
 *        <!-- Push notifications — controlled via entitlements, not Info.plist,
 *             but add this key to explain the purpose in Settings:           -->
 *        <key>UIBackgroundModes</key>
 *        <array><string>remote-notification</string></array>
 *
 *  6.  Enable Push Notifications capability in Xcode › Signing & Capabilities.
 *  7.  Add Associated Domains capability:
 *        applinks:acpdemocracy.com   (universal links)
 *  8.  Register the custom URL scheme in Xcode:
 *        URL Schemes: acpdemocracy
 *
 * ── Production secrets ────────────────────────────────────────────────────────
 *  APPLE_IAP_SHARED_SECRET   — App Store Connect shared secret
 *  PUSH_NOTIFICATIONS_KEY    — APNs .p8 key (server-side sending)
 *  PUSH_TEAM_ID              — Apple Team ID
 *  PUSH_KEY_ID               — APNs key ID
 */

const config: CapacitorConfig = {
  appId: 'com.acp.democracy',
  appName: 'ACP Democracy',
  webDir: 'dist/public',

  server: {
    androidScheme: 'https',
    // Uncomment for live-reload during development:
    // url: 'http://YOUR_DEV_IP:5000',
    // cleartext: true,
  },

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0a0c10',
    // Allow WKWebView to scroll — needed for the feed
    scrollEnabled: true,
    // Liminal safe-area insets handled by CSS env(safe-area-inset-*)
    // Do not enable App-Bound Domain enforcement unless Info.plist also
    // declares WKAppBoundDomains. Enabling it without that list prevents the
    // packaged WebView from loading on current iOS runtimes.
    limitsNavigationsToAppBoundDomains: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1400,
      launchAutoHide: true,        // JS also hides it early; this is a safety fallback
      backgroundColor: '#0a0c10',
      splashFullScreen: true,
      splashImmersive: true,
      showSpinner: false,
    },

    StatusBar: {
      style: 'dark',              // White icons on our dark background
      backgroundColor: '#0a0c10',
      overlaysWebView: false,
    },

    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    Camera: {
      // Permissions are requested JIT — no preemptive request
    },

    Geolocation: {
      // Permissions are requested JIT in MobileRepsPage
    },
  },
};

export default config;
