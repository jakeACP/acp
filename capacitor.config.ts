import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for ACP Democracy iOS app.
 *
 * Before building in Xcode:
 *  1. Run `npx cap add ios`
 *  2. Install native plugin: npx cap add @capacitor-community/in-app-purchases
 *  3. Set APPLE_IAP_SHARED_SECRET in App Store Connect (Shared Secret)
 *     and as a Replit environment secret.
 *  4. Create products in App Store Connect:
 *       - com.acp.democracy.acpplus.monthly  (Auto-Renewable Subscription, $8.99/mo)
 *       - com.acp.democracy.acpplus.annual   (Auto-Renewable Subscription, $79.99/yr)
 *  5. Set authorized redirect URIs and provisioning profile as needed.
 */
const config: CapacitorConfig = {
  appId: 'com.acp.democracy',
  appName: 'ACP Democracy',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0a0c10',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0a0c10',
      showSpinner: false,
    },
  },
};

export default config;
