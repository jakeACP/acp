import { useQuery } from "@tanstack/react-query";
import { useScrollLight } from "../hooks/useScrollLight";
import { MobileTopBar } from "../components/MobileTopBar";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { SignalCard } from "../components/cards/SignalCard";
import type { SignalWithAuthor } from "@shared/schema";

export function MobileSignalsPage() {
  useScrollLight();

  const { data: signals = [], isLoading } = useQuery<SignalWithAuthor[]>({
    queryKey: ['/api/mobile/signals'],
    staleTime: 60000,
  });

  return (
    <div className="mobile-root" data-testid="mobile-signals-page">
      <MobileTopBar title="SIGNALS" subtitle="Short-Form Content" />

      <div className="feed-grid pb-8">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card aspect-[9/16]">
                <div className="skeleton w-full h-full" />
              </div>
            ))}
          </>
        ) : signals.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-white/60">
            <p className="text-lg mb-2">No signals yet</p>
            <p className="text-sm">Be the first to create a Signal!</p>
          </div>
        ) : (
          signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
