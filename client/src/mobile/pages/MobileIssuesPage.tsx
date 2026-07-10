import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { useAuth } from "@/hooks/use-auth";
import "../mobile-theme.css";

const CATEGORIES = [
  { id: "economy",     label: "Economy",        emoji: "💰" },
  { id: "healthcare",  label: "Healthcare",     emoji: "🏥" },
  { id: "environment", label: "Environment",    emoji: "🌿" },
  { id: "education",   label: "Education",      emoji: "🎓" },
  { id: "immigration", label: "Immigration",    emoji: "🌎" },
  { id: "criminal",    label: "Public Safety",  emoji: "⚖️" },
  { id: "foreign",     label: "Foreign Policy", emoji: "🤝" },
  { id: "technology",  label: "Technology",     emoji: "💻" },
  { id: "civil",       label: "Civil Rights",   emoji: "✊" },
  { id: "housing",     label: "Housing",        emoji: "🏠" },
];

export function MobileIssuesPage() {
  const { user } = useAuth();

  const { data: responses = [] } = useQuery<any[]>({
    queryKey: ["/api/issues/responses"],
    enabled: !!user,
    staleTime: 60_000,
  });

  const answeredCount = responses.filter((r) => r.response != null).length;
  const totalCount = 30;
  const pct = Math.round((answeredCount / totalCount) * 100);

  return (
    <div className="mobile-root" data-testid="mobile-issues-page">
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <Link href="/mobile/civic">
            <button className="notification-button"><ChevronLeft className="w-5 h-5 text-white" /></button>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">Policy Issues</h1>
            <p className="text-white/50 text-xs">Record your positions on 30 issues</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-28 space-y-4">
        {/* Progress card */}
        <div className="glass-card p-4" style={{ height: "auto" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-semibold text-sm">Your survey progress</p>
            <span className="text-white/55 text-sm font-mono">{answeredCount}/{totalCount}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: "linear-gradient(to right,#E6393A,#3B5BA9)" }} />
          </div>
          {user ? (
            <a href="/issues" target="_blank" rel="noopener noreferrer">
              <button className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,rgba(230,57,58,0.35),rgba(59,91,169,0.35))", border: "1px solid rgba(255,255,255,0.15)" }}>
                {answeredCount === 0 ? "Start Survey" : answeredCount === totalCount ? "✓ Survey Complete" : "Continue Survey"}
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </button>
            </a>
          ) : (
            <Link href="/auth">
              <button className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                Log in to take the survey
              </button>
            </Link>
          )}
          {answeredCount === totalCount && (
            <p className="text-green-400 text-xs text-center mt-2">🎉 All 30 issues answered — your profile shows your positions</p>
          )}
        </div>

        {/* What is this card */}
        <div className="flex gap-3 p-4 rounded-2xl"
          style={{ background: "rgba(59,91,169,0.08)", border: "1px solid rgba(59,91,169,0.2)" }}>
          <span className="text-2xl flex-shrink-0">📋</span>
          <div>
            <p className="text-white text-sm font-medium mb-1">30 policy positions, no left/right labels</p>
            <p className="text-white/45 text-xs leading-relaxed">
              Rate your government-involvement preference (Much Less → Much More) for each issue.
              Your results appear on your profile and help match you with candidates.
            </p>
          </div>
        </div>

        {/* Category list — links open full survey */}
        <p className="text-white/40 text-xs px-1 uppercase tracking-wide font-medium">Issue Categories</p>
        <div className="glass-card overflow-hidden" style={{ borderRadius: 18 }}>
          {CATEGORIES.map((cat) => {
            const catAnswered = responses.filter(
              (r) => r.issueId?.startsWith(cat.id) && r.response != null
            ).length;
            return (
              <a key={cat.id} href="/issues" target="_blank" rel="noopener noreferrer">
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0 active:bg-white/5 transition-colors">
                  <span className="text-xl">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{cat.label}</p>
                    {catAnswered > 0 && (
                      <p className="text-green-400/70 text-xs">{catAnswered} answered</p>
                    )}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
