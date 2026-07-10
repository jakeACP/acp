import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

interface CivicTile {
  label: string;
  emoji: string;
  href: string;
  description: string;
  keywords: string[];
}

const TILES: CivicTile[] = [
  {
    label: "My Reps",
    emoji: "🏛️",
    href: "/mobile/reps",
    description: "Your representatives",
    keywords: ["representatives", "congress", "senator", "house", "reps"],
  },
  {
    label: "Elections",
    emoji: "🗳️",
    href: "/mobile/civic/elections",
    description: "Candidates & races",
    keywords: ["election", "vote", "candidate", "ballot", "race"],
  },
  {
    label: "Petitions",
    emoji: "✍️",
    href: "/mobile/civic/petitions",
    description: "Sign & start petitions",
    keywords: ["petition", "sign", "signatures", "demand"],
  },
  {
    label: "Events",
    emoji: "📅",
    href: "/mobile/events",
    description: "Rallies & meetups",
    keywords: ["events", "rally", "meetup", "gathering", "volunteer"],
  },
  {
    label: "Initiatives",
    emoji: "🌱",
    href: "/mobile/civic/initiatives",
    description: "Community initiatives",
    keywords: ["initiative", "proposal", "ballot", "measure", "community"],
  },
  {
    label: "Issues",
    emoji: "📋",
    href: "/mobile/civic/issues",
    description: "Policy positions",
    keywords: ["issues", "policy", "survey", "stance", "position"],
  },
  {
    label: "Run for Office",
    emoji: "🏃",
    href: "/mobile/civic/run",
    description: "Start your campaign",
    keywords: ["run", "office", "campaign", "candidate", "election"],
  },
  {
    label: "Whistleblower",
    emoji: "🔍",
    href: "/mobile/civic/whistleblower",
    description: "Report corruption",
    keywords: ["whistleblower", "report", "corruption", "tip", "expose"],
  },
  {
    label: "Charities",
    emoji: "❤️",
    href: "/mobile/civic/charities",
    description: "Support causes",
    keywords: ["charity", "donate", "nonprofit", "give", "support"],
  },
  {
    label: "Boycotts",
    emoji: "✊",
    href: "/mobile/civic/boycotts",
    description: "Consumer action",
    keywords: ["boycott", "consumer", "action", "protest", "corporate"],
  },
  {
    label: "Saved",
    emoji: "⭐",
    href: "/mobile/civic/saved",
    description: "Your saved actions",
    keywords: ["saved", "following", "rsvp", "signed", "bookmarked", "watchlist"],
  },
];

export function MobileCivicHubPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return TILES;
    return TILES.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.includes(q))
    );
  }, [query]);

  return (
    <div className="mobile-root" data-testid="mobile-civic-hub">
      {/* Top bar */}
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <div className="logo-container">
            <span className="text-lg">🌐</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Civic Hub</h1>
            <p className="text-white/50 text-xs">Your democracy toolkit</p>
          </div>
        </div>
      </div>

      {/* Sticky search */}
      <div
        className="sticky top-0 z-10 px-4 pb-3 pt-2"
        style={{
          background:
            "linear-gradient(to bottom, rgba(7,16,40,0.95) 80%, transparent)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          <input
            type="search"
            placeholder="Search civic tools…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          />
        </div>
      </div>

      {/* Tile grid */}
      <div className="grid grid-cols-2 gap-3 px-4 pb-28">
        {filtered.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
            <p className="text-white/50 text-sm">No results for "{query}"</p>
          </div>
        ) : (
          filtered.map((tile) => (
            <Link key={tile.href} href={tile.href}>
              <button
                className="glass-card w-full text-left p-4 flex flex-col gap-2 active:scale-[0.97] transition-transform"
                style={{ height: "auto", minHeight: 96 }}
              >
                <span className="text-3xl leading-none">{tile.emoji}</span>
                <span className="text-white font-semibold text-sm leading-tight">
                  {tile.label}
                </span>
                <span className="text-white/45 text-xs leading-tight">
                  {tile.description}
                </span>
              </button>
            </Link>
          ))
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
