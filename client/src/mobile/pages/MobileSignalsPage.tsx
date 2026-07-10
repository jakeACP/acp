import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useScrollLight } from "../hooks/useScrollLight";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { MobileSignalFeed } from "../components/MobileSignalFeed";
import { SignalCard } from "../components/cards/SignalCard";
import { FriendSuggestionsWidget } from "../components/FriendSuggestionsWidget";
import { MobileFeedContent } from "../components/MobileFeedContent";
import type { SignalWithAuthor } from "@shared/schema";
import "../mobile-theme.css";

// ─── Discover (grid) sub-view inside the Signals segment ─────────────────────
function SignalDiscoverGrid() {
  const { data: signals = [], isLoading } = useQuery<SignalWithAuthor[]>({
    queryKey: ["/api/mobile/signals"],
    staleTime: 60000,
  });

  return (
    <>
      <FriendSuggestionsWidget />
      <div className="feed-grid pb-24">
        {isLoading
          ? [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card aspect-[9/16] animate-pulse">
                <div className="w-full h-full bg-white/10 rounded-xl" />
              </div>
            ))
          : signals.length === 0
            ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-20 text-center">
                <span className="text-5xl mb-4">📹</span>
                <p className="text-white/50 text-sm">No Signals yet — be the first!</p>
              </div>
            )
            : signals.map((s) => <SignalCard key={s.id} signal={s} />)
        }
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
type Segment = "signals" | "feed";
type SignalView = "player" | "grid";

export function MobileSignalsPage() {
  useScrollLight();
  const [segment, setSegment] = useState<Segment>("signals");
  const [signalView, setSignalView] = useState<SignalView>("player");

  const isFullscreenFeed = segment === "signals" && signalView === "player";

  return (
    <>
      {/* ── Full-screen TikTok snap feed — z-40, bottom nav floats above at z-100 */}
      {isFullscreenFeed && (
        <MobileSignalFeed onGridClick={() => setSignalView("grid")} />
      )}

      {/* ── Scrollable page (Discover grid OR Feed segment) ──────────────── */}
      {!isFullscreenFeed && (
        <div className="mobile-root" data-testid="mobile-signals-page">

          {/* Top bar */}
          <div className="glass-top-bar">
            <div className="flex items-center gap-2">
              <div className="logo-container">
                <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
                  <circle cx="16" cy="16" r="14" fill="#E6393A" />
                  <text x="16" y="21" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">ACP</text>
                </svg>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">ACP</span>
            </div>
          </div>

          {/* Sticky segmented control */}
          <div
            className="sticky top-0 z-10 px-4 pb-2 pt-1"
            style={{
              background: "linear-gradient(to bottom, rgba(5,11,27,0.95) 80%, transparent)",
              backdropFilter: "blur(16px)",
            }}
          >
            {/* Signals | Feed switcher */}
            <div
              className="flex rounded-2xl p-1 gap-1"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {(["signals", "feed"] as Segment[]).map((seg) => (
                <button
                  key={seg}
                  onClick={() => {
                    setSegment(seg);
                    if (seg === "signals") setSignalView("player");
                  }}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={
                    segment === seg
                      ? { background: "rgba(255,255,255,0.16)", color: "#fff", boxShadow: "0 1px 6px rgba(0,0,0,0.25)" }
                      : { color: "rgba(255,255,255,0.42)" }
                  }
                >
                  {seg === "signals" ? "Signals" : "Feed"}
                </button>
              ))}
            </div>

            {/* For You | Discover sub-nav (only inside Signals) */}
            {segment === "signals" && (
              <div className="flex gap-2 mt-2">
                {(["player", "grid"] as SignalView[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setSignalView(v)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                    style={
                      signalView === v
                        ? { background: "rgba(230,57,58,0.3)", color: "#fff", border: "1px solid rgba(230,57,58,0.5)" }
                        : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
                    }
                  >
                    {v === "player" ? "▶ For You" : "⊞ Discover"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Signals — Discover grid */}
          {segment === "signals" && signalView === "grid" && <SignalDiscoverGrid />}

          {/* Feed — full Facebook-style scrollable list */}
          {segment === "feed" && <MobileFeedContent />}
        </div>
      )}

      {/* Bottom nav always on top — z-100 */}
      <MobileBottomNav />
    </>
  );
}
