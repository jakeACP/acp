import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { useAuth } from "@/hooks/use-auth";
import "../mobile-theme.css";

const CATEGORIES = [
  { id: "economy",      label: "Economy",      emoji: "💰" },
  { id: "healthcare",   label: "Healthcare",   emoji: "🏥" },
  { id: "environment",  label: "Environment",  emoji: "🌿" },
  { id: "education",    label: "Education",    emoji: "🎓" },
  { id: "immigration",  label: "Immigration",  emoji: "🌎" },
  { id: "criminal",     label: "Public Safety",emoji: "⚖️" },
  { id: "foreign",      label: "Foreign Policy",emoji: "🤝" },
  { id: "technology",   label: "Technology",   emoji: "💻" },
  { id: "civil",        label: "Civil Rights", emoji: "✊" },
  { id: "housing",      label: "Housing",      emoji: "🏠" },
];

export function MobileIssuesPage() {
  const { user } = useAuth();

  const { data: responses = [] } = useQuery<any[]>({
    queryKey: ["/api/issues/responses"],
    enabled: !!user,
    staleTime: 60000,
  });

  const answeredCount = responses.filter((r) => r.response != null).length;
  const totalCount = 30;
  const pct = Math.round((answeredCount / totalCount) * 100);

  return (
    <div className="mobile-root" data-testid="mobile-issues-page">
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <Link href="/mobile/civic">
            <button className="notification-button">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">Policy Issues</h1>
            <p className="text-white/50 text-xs">Record your positions</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-28 space-y-4">
        {/* Progress card */}
        <div className="glass-card p-4" style={{ height: "auto" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold text-sm">Your survey progress</p>
            <span className="text-white/60 text-sm">{answeredCount}/{totalCount}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(to right, #E6393A, #3B5BA9)",
              }}
            />
          </div>
          <Link href="/issues">
            <button
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, rgba(230,57,58,0.35), rgba(59,91,169,0.35))",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              {answeredCount === 0 ? "Start Survey" : "Continue Survey"}
            </button>
          </Link>
        </div>

        {/* Category list */}
        <div className="glass-card overflow-hidden" style={{ borderRadius: 18 }}>
          {CATEGORIES.map((cat) => {
            const catAnswered = responses.filter(
              (r) => r.issueId?.startsWith(cat.id) && r.response != null
            ).length;
            return (
              <Link key={cat.id} href="/issues">
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0 active:bg-white/5 transition-colors">
                  <span className="text-xl">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{cat.label}</p>
                    {catAnswered > 0 && (
                      <p className="text-white/40 text-xs">{catAnswered} answered</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
