/**
 * ACP+ Subscription Settings — iOS-first, platform-aware
 *
 * On iOS (Capacitor native):
 *   - Uses Apple IAP via StoreKit 2 exclusively.
 *   - Stripe / web checkout is NOT shown (Apple guideline 3.1.1).
 *   - Purchase → backend validate → entitlement granted.
 *
 * On web / desktop:
 *   - Uses existing Stripe-based web checkout.
 *   - Apple IAP controls are NOT shown.
 *
 * Non-digital (merchandise / physical donations) are shown in a separate,
 * clearly labeled section that opens an external browser link.
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, Crown, Check, Zap, Shield, BarChart2, Video, Star,
  ExternalLink, Loader2, AlertCircle, Info, Gift,
  RotateCcw, Settings2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { useToast } from "@/hooks/use-toast";
import {
  isNativeIOS,
  loadIAPProducts,
  purchaseProduct,
  restorePurchases,
  openManageSubscriptions,
  validateAppleReceipt,
  fetchSubscriptionStatus,
  ACP_PRODUCT_IDS,
  type IAPProduct,
  type SubscriptionStatus,
} from "../services/iap-service";
import "../mobile-theme.css";

// ── Constants ──────────────────────────────────────────────────────────────────

const PERKS = [
  { icon: Video,     label: "10-min Signals",   sub: "Extended video (vs 3 min free)" },
  { icon: BarChart2, label: "Advanced polls",    sub: "Ranked choice & blockchain verification" },
  { icon: Shield,    label: "ACP+ badge",        sub: "Verified supporter badge on your profile" },
  { icon: Zap,       label: "Priority support",  sub: "Faster responses from our moderation team" },
  { icon: Star,      label: "Early access",      sub: "New features before public release" },
];

const FALLBACK_PRODUCTS: IAPProduct[] = [
  {
    productId: ACP_PRODUCT_IDS.MONTHLY,
    title: "ACP+ Monthly",
    description: "Support the Anti-Corruption Party monthly",
    price: "$8.99",
    priceAmountMicros: 8_990_000,
    priceCurrencyCode: "USD",
    subscriptionPeriod: "P1M",
  },
  {
    productId: ACP_PRODUCT_IDS.ANNUAL,
    title: "ACP+ Annual",
    description: "Support the Anti-Corruption Party annually — best value",
    price: "$79.99",
    priceAmountMicros: 79_990_000,
    priceCurrencyCode: "USD",
    subscriptionPeriod: "P1Y",
  },
];

type PurchasePhase =
  | "idle"
  | "loading_products"
  | "pending"
  | "validating"
  | "success"
  | "failed"
  | "cancelled"
  | "restoring"
  | "restore_done";

interface PurchaseState {
  phase: PurchasePhase;
  pendingProductId?: string;
  successExpiresAt?: string | null;
  failedError?: string;
  restoreCount?: number;
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function MobileSettingsSubscriptionPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const onIOS = isNativeIOS();

  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [ps, setPs]             = useState<PurchaseState>({ phase: "idle" });
  const [selectedProd, setSelectedProd] = useState<string>(ACP_PRODUCT_IDS.MONTHLY);

  // Subscription status from backend (merged Apple + Stripe)
  const { data: subStatus, isLoading: statusLoading, refetch: refetchStatus } =
    useQuery<SubscriptionStatus>({
      queryKey: ["/api/subscriptions/status"],
      queryFn: fetchSubscriptionStatus,
      staleTime: 30_000,
      enabled: !!user,
    });

  const isPremium     = subStatus?.isPremium ?? user?.subscriptionStatus === "premium";
  const isAppleSub    = subStatus?.source === "apple";
  const isStripeSub   = subStatus?.source === "stripe";
  const expiresAt     = subStatus?.expiresAt ?? null;
  const renewalStatus = subStatus?.renewalStatus ?? null;

  // Load StoreKit products on iOS
  useEffect(() => {
    if (!onIOS) return;
    setPs({ phase: "loading_products" });
    loadIAPProducts()
      .then((prods) => {
        setProducts(prods.length > 0 ? prods : FALLBACK_PRODUCTS);
        setPs({ phase: "idle" });
      })
      .catch(() => {
        setProducts(FALLBACK_PRODUCTS);
        setPs({ phase: "idle" });
      });
  }, [onIOS]);

  const handlePurchase = useCallback(async (productId: string) => {
    if (!onIOS) return;
    try {
      setPs({ phase: "pending", pendingProductId: productId });
      const tx = await purchaseProduct(productId as any);

      setPs({ phase: "validating" });
      const validation = await validateAppleReceipt(
        tx.receipt,
        tx.originalTransactionId,
        tx.productId,
      );

      if (validation.entitlementGranted) {
        setPs({ phase: "success", successExpiresAt: validation.expiresAt });
        queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        refetchStatus();
        toast({ title: "ACP+ activated! Thank you for supporting the movement 🎉" });
      } else {
        setPs({
          phase: "failed",
          failedError:
            "Purchase completed but subscription could not be verified. Please tap Restore Purchases.",
        });
      }
    } catch (err: any) {
      if (err?.code === "USER_CANCELLED" || err?.message?.includes("cancel")) {
        setPs({ phase: "cancelled" });
        setTimeout(() => setPs({ phase: "idle" }), 2500);
      } else {
        setPs({ phase: "failed", failedError: err?.message ?? "Purchase failed. Please try again." });
      }
    }
  }, [onIOS, queryClient, refetchStatus, toast]);

  const handleRestore = useCallback(async () => {
    if (!onIOS) return;
    setPs({ phase: "restoring" });
    try {
      const result = await restorePurchases();
      const granted = result.validations.filter((v) => v.entitlementGranted).length;
      setPs({ phase: "restore_done", restoreCount: granted });
      if (granted > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        refetchStatus();
        toast({ title: `ACP+ restored!` });
      } else {
        toast({
          title: "No active purchases found",
          description: "Make sure you're signed in with the same Apple ID used to purchase.",
        });
      }
      setTimeout(() => setPs({ phase: "idle" }), 3000);
    } catch (err: any) {
      setPs({ phase: "failed", failedError: err?.message ?? "Restore failed. Please try again." });
    }
  }, [onIOS, queryClient, refetchStatus, toast]);

  const isProcessing = ["loading_products", "pending", "validating", "restoring"].includes(ps.phase);
  const displayProducts = products.length > 0 ? products : FALLBACK_PRODUCTS;

  return (
    <div className="mobile-root" data-testid="settings-subscription-page">
      <div className="glass-top-bar flex items-center gap-3">
        <button
          onClick={() => navigate("/mobile/settings")}
          className="p-2 rounded-full active:bg-white/10"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">ACP+ Subscription</h1>
        {statusLoading && <Loader2 className="w-4 h-4 animate-spin text-white/40" />}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">

        {/* Status card */}
        <StatusCard
          isPremium={isPremium}
          isAppleSub={isAppleSub}
          isStripeSub={isStripeSub}
          expiresAt={expiresAt}
          renewalStatus={renewalStatus}
          environment={subStatus?.environment ?? null}
        />

        {/* Purchase state banners */}
        {ps.phase === "success" && (
          <Banner type="success"
            message={`ACP+ is now active!${ps.successExpiresAt ? ` Renews ${new Date(ps.successExpiresAt).toLocaleDateString()}.` : ""}`}
          />
        )}
        {ps.phase === "failed" && (
          <Banner type="error" message={ps.failedError ?? "Something went wrong."}
            action={{ label: "Dismiss", onPress: () => setPs({ phase: "idle" }) }}
          />
        )}
        {ps.phase === "cancelled" && (
          <Banner type="info" message="Purchase cancelled." />
        )}
        {ps.phase === "restore_done" && (
          <Banner
            type={(ps.restoreCount ?? 0) > 0 ? "success" : "info"}
            message={
              (ps.restoreCount ?? 0) > 0
                ? `${ps.restoreCount} subscription${ps.restoreCount !== 1 ? "s" : ""} restored successfully.`
                : "No active subscriptions found to restore."
            }
          />
        )}

        {/* ── iOS: upgrade panel (not premium) ─────────────────────────────── */}
        {onIOS && !isPremium && (
          <IosUpgradePanel
            products={displayProducts}
            selectedProduct={selectedProd}
            onSelectProduct={setSelectedProd}
            onPurchase={handlePurchase}
            ps={ps}
            isProcessing={isProcessing}
          />
        )}

        {/* ── iOS: manage (already premium) ────────────────────────────────── */}
        {onIOS && isPremium && (
          <div className="glass-card p-4 space-y-3" data-testid="ios-manage-section">
            <p className="text-white/45 text-xs font-semibold uppercase tracking-wide">Manage</p>

            <button
              onClick={openManageSubscriptions}
              className="w-full flex items-center gap-3 py-3.5 px-4 rounded-2xl active:opacity-70"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
              data-testid="manage-apple-subscription-btn"
            >
              <Settings2 className="w-5 h-5 text-white/70" />
              <span className="text-white text-sm font-medium flex-1 text-left">
                Manage in App Store
              </span>
              <ExternalLink className="w-4 h-4 text-white/30" />
            </button>

            <button
              onClick={handleRestore}
              disabled={isProcessing}
              className="w-full flex items-center gap-3 py-3.5 px-4 rounded-2xl active:opacity-70 disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              data-testid="restore-purchases-btn"
            >
              {ps.phase === "restoring"
                ? <Loader2 className="w-5 h-5 animate-spin text-white/50" />
                : <RotateCcw className="w-5 h-5 text-white/50" />}
              <span className="text-white/70 text-sm">Restore purchases</span>
            </button>

            <p className="text-white/25 text-xs px-1 leading-relaxed">
              To cancel auto-renewal, tap "Manage in App Store". Your ACP+ access continues until the
              end of the current billing period.
            </p>
          </div>
        )}

        {/* ── iOS: restore row (not yet premium) ───────────────────────────── */}
        {onIOS && !isPremium && (
          <button
            onClick={handleRestore}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl active:opacity-70 disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            data-testid="restore-purchases-btn-free"
          >
            {ps.phase === "restoring"
              ? <Loader2 className="w-4 h-4 animate-spin text-white/50" />
              : <RotateCcw className="w-4 h-4 text-white/50" />}
            <span className="text-white/60 text-sm">Restore previous purchases</span>
          </button>
        )}

        {/* ── Web / Stripe panel (never shown on iOS) ──────────────────────── */}
        {!onIOS && (
          <WebSubscriptionPanel
            isPremium={isPremium}
            isStripeSub={isStripeSub}
            expiresAt={expiresAt}
          />
        )}

        {/* Perks — shown on both platforms */}
        <PerksCard isPremium={isPremium} />

        {/* Non-digital support — CLEARLY SEPARATE section */}
        <NonDigitalSection />

        {/* Support / legal links (App Store requirement) */}
        <SupportSection />
      </div>

      <MobileBottomNav />
    </div>
  );
}

// ── StatusCard ─────────────────────────────────────────────────────────────────

function StatusCard({
  isPremium, isAppleSub, isStripeSub, expiresAt, renewalStatus, environment,
}: {
  isPremium: boolean; isAppleSub: boolean; isStripeSub: boolean;
  expiresAt: string | null; renewalStatus: string | null; environment: string | null;
}) {
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const sourceLabel = isPremium
    ? isAppleSub  ? "Subscribed via App Store"
    : isStripeSub ? "Subscribed via Web"
    : "Active subscription"
    : "Upgrade to support the Anti-Corruption Party";

  return (
    <div
      className="glass-card p-5"
      data-testid="subscription-status-card"
      style={isPremium ? { borderColor: "rgba(234,179,8,0.35)", background: "rgba(234,179,8,0.05)" } : {}}
    >
      <div className="flex items-center gap-4 mb-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: isPremium ? "rgba(234,179,8,0.18)" : "rgba(255,255,255,0.06)" }}
        >
          <Crown className={`w-7 h-7 ${isPremium ? "text-yellow-400" : "text-white/30"}`} />
        </div>
        <div>
          <p className="text-white font-bold text-lg">{isPremium ? "ACP+" : "Free Plan"}</p>
          <p className="text-white/50 text-sm">{sourceLabel}</p>
        </div>
      </div>

      {isPremium && (
        <div className="space-y-2">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
          >
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-400 text-sm font-medium">
              {renewalStatus === "cancelled"
                ? "Active until expiry (auto-renewal cancelled)"
                : "Active — auto-renews"}
            </p>
          </div>
          {expiresAt && (
            <p className="text-white/40 text-xs px-1">
              {renewalStatus === "cancelled" ? "Expires" : "Renews"}: {fmtDate(expiresAt)}
            </p>
          )}
          {environment === "sandbox" && (
            <p className="text-yellow-400/60 text-xs px-1">⚠ Sandbox / test subscription</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── IosUpgradePanel ────────────────────────────────────────────────────────────

function IosUpgradePanel({
  products, selectedProduct, onSelectProduct, onPurchase, ps, isProcessing,
}: {
  products: IAPProduct[];
  selectedProduct: string;
  onSelectProduct: (id: string) => void;
  onPurchase: (id: string) => void;
  ps: PurchaseState;
  isProcessing: boolean;
}) {
  const annual  = products.find((p) => p.productId === ACP_PRODUCT_IDS.ANNUAL);
  const monthly = products.find((p) => p.productId === ACP_PRODUCT_IDS.MONTHLY);
  const selected = products.find((p) => p.productId === selectedProduct);

  return (
    <div className="space-y-3" data-testid="ios-upgrade-panel">
      <div className="glass-card p-4 space-y-3">
        <p className="text-white/45 text-xs font-semibold uppercase tracking-wide">Choose Your Plan</p>

        {annual && (
          <PlanCard
            product={annual}
            isSelected={selectedProduct === annual.productId}
            onSelect={() => onSelectProduct(annual.productId)}
            badge="Best Value — save ~25%"
          />
        )}
        {monthly && (
          <PlanCard
            product={monthly}
            isSelected={selectedProduct === monthly.productId}
            onSelect={() => onSelectProduct(monthly.productId)}
          />
        )}
      </div>

      {/* Purchase button */}
      <button
        onClick={() => onPurchase(selectedProduct)}
        disabled={isProcessing}
        className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 active:opacity-80"
        style={{
          background: isProcessing
            ? "rgba(234,179,8,0.3)"
            : "linear-gradient(135deg,#ca8a04,#eab308)",
        }}
        data-testid="ios-purchase-btn"
      >
        {ps.phase === "pending" && (
          <><Loader2 className="w-4 h-4 animate-spin" /> Opening App Store…</>
        )}
        {ps.phase === "validating" && (
          <><Loader2 className="w-4 h-4 animate-spin" /> Verifying purchase…</>
        )}
        {ps.phase === "loading_products" && (
          <><Loader2 className="w-4 h-4 animate-spin" /> Loading prices…</>
        )}
        {!isProcessing && (
          <>
            <Crown className="w-5 h-5" />
            Subscribe with Apple{selected ? ` — ${selected.price}` : ""}
          </>
        )}
      </button>

      {/* Legal disclosure (required by Apple) */}
      <p className="text-white/25 text-xs leading-relaxed text-center px-2">
        Payment charged to your Apple ID at confirmation of purchase. Subscription renews automatically
        unless cancelled at least 24 hours before the end of the current period. Manage or cancel any
        time in Settings → [your name] → Subscriptions.
      </p>
    </div>
  );
}

function PlanCard({
  product, isSelected, onSelect, badge,
}: {
  product: IAPProduct; isSelected: boolean; onSelect: () => void; badge?: string;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:opacity-80 text-left"
      style={
        isSelected
          ? { background: "rgba(234,179,8,0.15)", border: "2px solid rgba(234,179,8,0.5)" }
          : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }
      }
      data-testid={`plan-${product.productId}`}
    >
      <div
        className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
        style={{ borderColor: isSelected ? "#eab308" : "rgba(255,255,255,0.3)" }}
      >
        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white text-sm font-semibold">{product.title}</p>
          {badge && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "rgba(234,179,8,0.2)", color: "#eab308" }}
            >
              {badge}
            </span>
          )}
        </div>
        <p className="text-white/40 text-xs mt-0.5">{product.description}</p>
      </div>
      <p className="text-white font-bold text-base flex-shrink-0">{product.price}</p>
    </button>
  );
}

// ── WebSubscriptionPanel ───────────────────────────────────────────────────────

function WebSubscriptionPanel({
  isPremium, isStripeSub, expiresAt,
}: {
  isPremium: boolean; isStripeSub: boolean; expiresAt: string | null;
}) {
  return (
    <div data-testid="web-subscription-panel">
      <div className="flex items-start gap-2 mb-3 px-1">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-blue-400/70 text-xs leading-relaxed">
          You're on the web version. ACP+ is billed here via our secure web payment processor.
          iOS app users subscribe through the App Store instead.
        </p>
      </div>

      {isPremium && isStripeSub ? (
        <div className="glass-card p-4 space-y-3">
          <p className="text-white/45 text-xs font-semibold uppercase tracking-wide">
            Manage Web Subscription
          </p>
          <a
            href="/subscription"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between py-3.5 px-4 rounded-2xl active:opacity-70"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
            data-testid="manage-web-billing-link"
          >
            <span className="text-white text-sm font-medium">Manage Billing</span>
            <ExternalLink className="w-4 h-4 text-white/40" />
          </a>
        </div>
      ) : (
        <div
          className="glass-card p-5 text-center"
          style={{ border: "1px solid rgba(234,179,8,0.3)" }}
        >
          <Crown className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
          <p className="text-white font-bold text-base mb-1">Upgrade to ACP+</p>
          <p className="text-white/50 text-sm mb-4">
            Your subscription directly funds the Anti-Corruption Party's mission for transparent governance.
          </p>
          <a
            href="/subscription"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3.5 rounded-2xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#ca8a04,#eab308)" }}
            data-testid="web-upgrade-btn"
          >
            Upgrade Now — $8.99/mo
          </a>
        </div>
      )}
    </div>
  );
}

// ── PerksCard ──────────────────────────────────────────────────────────────────

function PerksCard({ isPremium }: { isPremium: boolean }) {
  return (
    <div className="glass-card p-4">
      <p className="text-white/45 text-xs font-semibold uppercase tracking-wide mb-3">ACP+ Perks</p>
      <div className="space-y-3">
        {PERKS.map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(234,179,8,0.1)" }}
            >
              <Icon className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isPremium ? "text-white" : "text-white/60"}`}>
                {label}
              </p>
              <p className="text-white/30 text-xs">{sub}</p>
            </div>
            {isPremium && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NonDigitalSection ──────────────────────────────────────────────────────────
// Physical / offline items — NOT subject to Apple IAP rules.
// Must open in external browser (Safari).

function NonDigitalSection() {
  return (
    <div
      className="glass-card p-4"
      style={{ border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.04)" }}
      data-testid="non-digital-support-section"
    >
      <div className="flex items-center gap-2 mb-2">
        <Gift className="w-4 h-4 text-indigo-400" />
        <p className="text-indigo-300/80 text-xs font-semibold uppercase tracking-wide">
          Non-Digital Support
        </p>
      </div>
      <p className="text-white/35 text-xs mb-3 leading-relaxed">
        The following are physical merchandise and offline political donations — not digital goods.
        Tapping opens your browser and is separate from your in-app subscription.
      </p>
      <div className="space-y-2">
        <a
          href="https://acp-merch.example.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between py-3 px-3 rounded-2xl active:opacity-70"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          data-testid="merch-link"
        >
          <span className="text-white/60 text-sm">ACP Merchandise Store</span>
          <ExternalLink className="w-4 h-4 text-white/25" />
        </a>
        <a
          href="https://acp-donate.example.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between py-3 px-3 rounded-2xl active:opacity-70"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          data-testid="donate-link"
        >
          <span className="text-white/60 text-sm">Make a Political Donation</span>
          <ExternalLink className="w-4 h-4 text-white/25" />
        </a>
      </div>
      <p className="text-white/20 text-xs mt-3 leading-relaxed">
        Political contributions are not deductible as charitable contributions for federal income tax
        purposes. FEC contribution limits apply.
      </p>
    </div>
  );
}

// ── SupportSection ─────────────────────────────────────────────────────────────
// App Store requirement: visible path to contact support and view legal docs.

function SupportSection() {
  return (
    <div className="glass-card p-4 space-y-2" data-testid="subscription-support-section">
      <p className="text-white/45 text-xs font-semibold uppercase tracking-wide">Support & Legal</p>
      {[
        { label: "Contact Support",    href: "mailto:support@acp.example.com" },
        { label: "Terms of Service",   href: "https://acp.example.com/terms" },
        { label: "Privacy Policy",     href: "https://acp.example.com/privacy" },
      ].map(({ label, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between py-3 px-3 rounded-2xl active:opacity-70"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span className="text-white/60 text-sm">{label}</span>
          <ExternalLink className="w-4 h-4 text-white/25" />
        </a>
      ))}
    </div>
  );
}

// ── Banner ─────────────────────────────────────────────────────────────────────

function Banner({
  type, message, action,
}: {
  type: "success" | "error" | "info";
  message: string;
  action?: { label: string; onPress: () => void };
}) {
  const cfg = {
    success: { bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)", text: "#34d399" },
    error:   { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)",   text: "#f87171" },
    info:    { bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.25)", text: "#93c5fd" },
  }[type];
  const Icon = type === "error" ? AlertCircle : type === "success" ? Check : Info;

  return (
    <div
      className="flex items-start gap-3 px-3 py-3 rounded-2xl"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: cfg.text }} />
      <p className="flex-1 text-sm leading-relaxed" style={{ color: cfg.text }}>{message}</p>
      {action && (
        <button
          onClick={action.onPress}
          className="text-xs font-semibold flex-shrink-0 ml-1"
          style={{ color: cfg.text }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
