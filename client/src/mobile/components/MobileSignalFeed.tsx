/**
 * MobileSignalFeed — TikTok-style full-screen vertical snap feed.
 * Each slide is 100dvh; CSS scroll-snap handles native swipe feel.
 * IntersectionObserver per item drives autoplay / pause.
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { SignalWithAuthor } from "@shared/schema";
import { SignalFeedItem } from "./SignalFeedItem";

interface MobileSignalFeedProps {
  /** Called when the user taps the grid/discover toggle in the top bar */
  onGridClick: () => void;
}

export function MobileSignalFeed({ onGridClick }: MobileSignalFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeId,  setActiveId]  = useState<string | null>(null);
  const [muted,     setMuted]     = useState(true); // start muted (browser autoplay policy)
  const observersRef = useRef<Map<string, IntersectionObserver>>(new Map());

  const { data: signals = [], isLoading } = useQuery<SignalWithAuthor[]>({
    queryKey: ["/api/mobile/signals"],
    queryFn: async () => {
      const res = await fetch("/api/mobile/signals?limit=50", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load signals");
      return res.json();
    },
    staleTime: 60000,
  });

  // Set the first signal as active when data loads
  useEffect(() => {
    if (signals.length > 0 && !activeId) {
      setActiveId(signals[0].id);
    }
  }, [signals, activeId]);

  // Wire up one IntersectionObserver per slide after render
  const observeItem = useCallback((el: HTMLElement | null, id: string) => {
    if (!el) {
      // Unobserve if element removed
      const obs = observersRef.current.get(id);
      if (obs) { obs.disconnect(); observersRef.current.delete(id); }
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
          setActiveId(id);
        }
      },
      {
        root: scrollRef.current,
        threshold: 0.7,
      }
    );
    obs.observe(el);
    observersRef.current.set(id, obs);
  }, []);

  // Disconnect all observers on unmount
  useEffect(() => {
    const map = observersRef.current;
    return () => { map.forEach((o) => o.disconnect()); map.clear(); };
  }, []);

  if (isLoading) {
    return (
      <div className="signal-feed-container flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="signal-feed-container flex flex-col items-center justify-center gap-4">
        <span className="text-5xl">📹</span>
        <p className="text-white/60 text-base font-medium">No Signals yet</p>
        <p className="text-white/35 text-sm">Be the first to record one</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="signal-feed-container">
      {signals.map((signal) => (
        <div
          key={signal.id}
          ref={(el) => observeItem(el, signal.id)}
          className="signal-feed-slide"
        >
          <SignalFeedItem
            signal={signal}
            isActive={activeId === signal.id}
            muted={muted}
            onMuteToggle={() => setMuted((p) => !p)}
            onGridClick={onGridClick}
          />
        </div>
      ))}
    </div>
  );
}
