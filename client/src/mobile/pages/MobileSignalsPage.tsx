import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useScrollLight } from "../hooks/useScrollLight";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { MobileTopBar } from "../components/MobileTopBar";
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
    staleTime: 60_000,
    gcTime:    5 * 60_000,
    refetchOnWindowFocus: false,
  });

  return (
    <>
      <FriendSuggestionsWidget />
      <div className="feed-grid pb-24" role="list" aria-label="Discover signals">
        {isLoading
          ? [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card aspect-[9/16] skeleton" aria-hidden="true">
                <div className="w-full h-full rounded-xl" />
              </div>
            ))
          : signals.length === 0
            ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-20 text-center" role="listitem">
                <span className="text-5xl mb-4" aria-hidden="true">📹</span>
                <p className="text-white/50 text-sm">No Signals yet — be the first!</p>
              </div>
            )
            : signals.map((s) => (
                <div key={s.id} role="listitem">
                  <SignalCard signal={s} />
                </div>
              ))
        }
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
type Segment   = "signals" | "feed";
type SignalView = "player" | "grid";

export function MobileSignalsPage() {
  useScrollLight();
  const [segment,    setSegment]    = useState<Segment>("signals");
  const [signalView, setSignalView] = useState<SignalView>("player");
  const [muted,      setMuted]      = useState(true);

  const isFullscreenFeed = segment === "signals" && signalView === "player";

  return (
    <>
      {/* ── Full-screen TikTok snap feed — z-40, bottom nav floats above at z-100 */}
      {isFullscreenFeed && (
        <MobileSignalFeed muted={muted} />
      )}

      <MobileTopBar
        activeSegment={segment}
        onSegmentChange={(nextSegment) => {
          setSegment(nextSegment);
          if (nextSegment === "signals") setSignalView("player");
        }}
        onDiscover={() => {
          setSegment("signals");
          setSignalView("grid");
        }}
        muted={isFullscreenFeed ? muted : undefined}
        onMuteToggle={isFullscreenFeed ? () => setMuted((value) => !value) : undefined}
      />

      {/* ── Scrollable page (Discover grid OR Feed segment) ──────────────── */}
      {!isFullscreenFeed && (
        <div className="mobile-root mobile-home-content" data-testid="mobile-signals-page">

          {/* Signals — Discover grid */}
          {segment === "signals" && signalView === "grid" && (
            <div id="panel-signals" role="tabpanel">
              <SignalDiscoverGrid />
            </div>
          )}

          {/* Feed — full Facebook-style scrollable list */}
          {segment === "feed" && (
            <div id="panel-feed" role="tabpanel" aria-labelledby="tab-feed">
              <MobileFeedContent />
            </div>
          )}
        </div>
      )}

      {/* Bottom nav always on top — z-100 */}
      <MobileBottomNav />
    </>
  );
}
