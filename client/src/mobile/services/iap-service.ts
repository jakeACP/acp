/**
 * ACP+ IAP Service — Capacitor / StoreKit 2 wrapper
 *
 * RULES:
 *  • On iOS (Capacitor native): use this service + Apple IAP exclusively.
 *    NEVER route iOS digital subscription purchases through Stripe/web checkout.
 *  • On web / Android: isNativeIOS() returns false — callers must show Stripe instead.
 *  • Entitlement is ONLY granted after successful server-side receipt validation.
 *
 * Plugin: @capacitor-community/in-app-purchases
 *   Install (once Capacitor project exists):
 *     npm install @capacitor-community/in-app-purchases
 *     npx cap sync ios
 *
 * Product IDs must match exactly what is registered in App Store Connect.
 */

// ── Product constants ──────────────────────────────────────────────────────────

export const ACP_PRODUCT_IDS = {
  MONTHLY: 'com.acp.democracy.acpplus.monthly',
  ANNUAL:  'com.acp.democracy.acpplus.annual',
} as const;

export type AcpProductId = (typeof ACP_PRODUCT_IDS)[keyof typeof ACP_PRODUCT_IDS];

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  /** Localized price string, e.g. "$8.99" */
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
  /** ISO 8601 duration: P1M (monthly) or P1Y (annual) */
  subscriptionPeriod?: string;
}

export interface AppleTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  /** Base-64 encoded receipt data for server-side validation */
  receipt: string;
}

export interface ValidationResult {
  valid: boolean;
  entitlementGranted: boolean;
  expiresAt: string | null;
  productId: string;
  environment: 'sandbox' | 'production';
  error?: string;
}

export interface RestoreResult {
  restored: AppleTransaction[];
  validations: ValidationResult[];
}

// ── Platform detection ─────────────────────────────────────────────────────────

/** True when running inside the native Capacitor iOS shell. */
export function isNativeIOS(): boolean {
  try {
    const cap = (window as any).Capacitor;
    return !!(cap?.isNativePlatform?.() && cap?.getPlatform?.() === 'ios');
  } catch {
    return false;
  }
}

/** True when running inside any native Capacitor shell (iOS or Android). */
export function isNativePlatform(): boolean {
  try {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

// ── Plugin access ──────────────────────────────────────────────────────────────

/**
 * Returns the @capacitor-community/in-app-purchases plugin instance at runtime.
 * On web this always returns null — callers must check before use.
 */
async function getPlugin(): Promise<any | null> {
  if (!isNativeIOS()) return null;
  try {
    // Constructed at runtime so Vite never statically resolves this path.
    // The package only exists in the native iOS Capacitor build.
    const pkg = '@capacitor-community' + '/in-app-purchases';
    const mod = await import(/* @vite-ignore */ pkg);
    return mod.InAppPurchases ?? mod.default ?? null;
  } catch {
    // Fallback: Capacitor global bridge (loaded by the plugin's web.js on device)
    return (window as any).Capacitor?.Plugins?.InAppPurchases ?? null;
  }
}

// ── Product loading ────────────────────────────────────────────────────────────

/**
 * Load StoreKit products from App Store.
 * Returns [] on web (caller should show Stripe UI instead).
 */
export async function loadIAPProducts(
  productIds: string[] = Object.values(ACP_PRODUCT_IDS),
): Promise<IAPProduct[]> {
  const plugin = await getPlugin();
  if (!plugin) return [];
  try {
    const result = await plugin.getProducts({ productIdentifiers: productIds });
    return (result.products ?? []).map((p: any) => ({
      productId: p.productIdentifier,
      title: p.localizedTitle ?? '',
      description: p.localizedDescription ?? '',
      price: p.localizedPrice ?? '',
      priceAmountMicros: Math.round((p.price ?? 0) * 1_000_000),
      priceCurrencyCode: p.currencyCode ?? 'USD',
      subscriptionPeriod: p.subscriptionPeriod,
    }));
  } catch (err) {
    console.error('[IAP] getProducts error:', err);
    return [];
  }
}

// ── Purchase ───────────────────────────────────────────────────────────────────

/**
 * Initiates a StoreKit 2 purchase sheet for the given product.
 * Resolves with the Apple transaction once the purchase sheet is dismissed.
 *
 * Throws if:
 *  - Not running on native iOS
 *  - User cancels (error.code === 'USER_CANCELLED')
 *  - Purchase fails for any other reason
 */
export async function purchaseProduct(productId: AcpProductId): Promise<AppleTransaction> {
  if (!isNativeIOS()) {
    throw new Error('Apple IAP is only available in the native iOS app.');
  }
  const plugin = await getPlugin();
  if (!plugin) throw new Error('IAP plugin not available.');

  return new Promise((resolve, reject) => {
    let completedListener: any;
    let failedListener: any;

    const cleanup = () => {
      completedListener?.remove?.();
      failedListener?.remove?.();
    };

    plugin.addListener('purchaseCompleted', (data: any) => {
      if (data?.product?.productIdentifier === productId) {
        cleanup();
        resolve({
          transactionId: data.transactionIdentifier ?? data.transactionId,
          originalTransactionId: data.originalTransactionIdentifier ?? data.transactionId,
          productId,
          receipt: data.receipt ?? data.appReceipt ?? '',
        });
      }
    }).then((l: any) => { completedListener = l; });

    plugin.addListener('purchaseFailed', (data: any) => {
      cleanup();
      const err: any = new Error(data?.message ?? 'Purchase failed');
      err.code = data?.code ?? 'PURCHASE_FAILED';
      reject(err);
    }).then((l: any) => { failedListener = l; });

    plugin.purchaseProduct({ productIdentifier: productId }).catch((err: any) => {
      cleanup();
      reject(err);
    });
  });
}

// ── Restore purchases ──────────────────────────────────────────────────────────

/**
 * Restores previous purchases and validates each one with the backend.
 * Safe to call at any time — Apple may prompt for sign-in.
 */
export async function restorePurchases(): Promise<RestoreResult> {
  if (!isNativeIOS()) return { restored: [], validations: [] };
  const plugin = await getPlugin();
  if (!plugin) return { restored: [], validations: [] };

  const result = await plugin.restoreTransactions().catch(() => ({ transactions: [] }));
  const transactions: AppleTransaction[] = (result.transactions ?? []).map((t: any) => ({
    transactionId: t.transactionIdentifier,
    originalTransactionId: t.originalTransactionIdentifier ?? t.transactionIdentifier,
    productId: t.productIdentifier,
    receipt: t.appReceipt ?? t.receipt ?? '',
  }));

  const validations = await Promise.all(
    transactions
      .filter(t => t.receipt)
      .map(t => validateAppleReceipt(t.receipt, t.originalTransactionId, t.productId)
        .catch(err => ({
          valid: false,
          entitlementGranted: false,
          expiresAt: null,
          productId: t.productId,
          environment: 'production' as const,
          error: err.message,
        })),
      ),
  );

  return { restored: transactions, validations };
}

// ── Manage subscriptions ───────────────────────────────────────────────────────

/**
 * Opens the iOS system subscription management screen.
 * Must be called from a user interaction (tap).
 */
export function openManageSubscriptions(): void {
  if (isNativeIOS()) {
    // Deep link to App Store subscription management
    const url = 'itms-apps://apps.apple.com/account/subscriptions';
    window.open(url, '_system');
  }
}

// ── Backend receipt validation ─────────────────────────────────────────────────

/**
 * Sends the Apple receipt to the backend for server-side validation.
 * The backend calls Apple's verifyReceipt API and grants/revokes ACP+ entitlement.
 *
 * The user's ACP+ entitlement is ONLY active after this call succeeds
 * and `entitlementGranted` is true.
 */
export async function validateAppleReceipt(
  receipt: string,
  originalTransactionId: string,
  productId: string,
): Promise<ValidationResult> {
  const res = await fetch('/api/subscriptions/apple/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ receipt, originalTransactionId, productId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Validation request failed' }));
    throw new Error(body.message ?? 'Receipt validation failed');
  }
  return res.json() as Promise<ValidationResult>;
}

// ── Subscription status ────────────────────────────────────────────────────────

export interface SubscriptionStatus {
  isPremium: boolean;
  source: 'apple' | 'stripe' | 'none';
  expiresAt: string | null;
  renewalStatus: 'active' | 'grace_period' | 'cancelled' | null;
  productId: string | null;
  environment: 'sandbox' | 'production' | null;
}

export async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const res = await fetch('/api/subscriptions/status', { credentials: 'include' });
  if (!res.ok) {
    return {
      isPremium: false,
      source: 'none',
      expiresAt: null,
      renewalStatus: null,
      productId: null,
      environment: null,
    };
  }
  return res.json();
}
