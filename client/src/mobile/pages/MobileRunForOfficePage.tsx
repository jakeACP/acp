import { Link } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { useAuth } from "@/hooks/use-auth";
import "../mobile-theme.css";

const STEPS = [
  {
    emoji: "📋",
    title: "Check eligibility",
    description: "Review requirements for the office you want to run for.",
  },
  {
    emoji: "🏛️",
    title: "Create your profile",
    description: "Build a candidate profile to share your platform.",
  },
  {
    emoji: "✅",
    title: "Earn ACE badge",
    description: "Apply for the Anti-Corruption Endorsement to boost your grade.",
  },
  {
    emoji: "📢",
    title: "Engage supporters",
    description: "Post Signals and articles to build your audience.",
  },
];

const RESOURCES = [
  { label: "Candidate Portal",       href: "/mobile/civic/run"        },
  { label: "ACE Pledge Application", href: "/mobile/civic/run"        },
  { label: "ACP Platform Principles",href: "/mobile/civic/run"        },
  { label: "Canvassing Tools",       href: "/mobile/civic/run"        },
];

export function MobileRunForOfficePage() {
  const { user } = useAuth();

  return (
    <div className="mobile-root" data-testid="mobile-run-for-office-page">
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <Link href="/mobile/civic">
            <button className="notification-button">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">Run for Office</h1>
            <p className="text-white/50 text-xs">Start your campaign</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-28 space-y-4">
        {/* Hero card */}
        <div
          className="glass-card p-5 text-center"
          style={{
            height: "auto",
            background:
              "linear-gradient(135deg, rgba(230,57,58,0.2) 0%, rgba(59,91,169,0.25) 100%)",
          }}
        >
          <span className="text-5xl block mb-3">🏃</span>
          <h2 className="text-white font-bold text-lg mb-2">Ready to serve?</h2>
          <p className="text-white/60 text-sm mb-4 leading-relaxed">
            The ACP supports citizens running for office at every level — local, state, and federal.
          </p>
          <Link href="/mobile/civic/run">
            <button
              className="px-8 py-3 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #E6393A, #3B5BA9)",
              }}
            >
              Get Started
            </button>
          </Link>
        </div>

        {/* Steps */}
        <div className="glass-card overflow-hidden" style={{ borderRadius: 18 }}>
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3.5 border-b border-white/5 last:border-0"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                style={{ background: "rgba(59,91,169,0.3)", minWidth: 32 }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span>{step.emoji}</span>
                  <p className="text-white text-sm font-medium">{step.title}</p>
                </div>
                <p className="text-white/45 text-xs">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Resources */}
        <p className="text-white/40 text-xs px-1 uppercase tracking-wide font-medium">Resources</p>
        <div className="glass-card overflow-hidden" style={{ borderRadius: 18 }}>
          {RESOURCES.map((r) => (
            <Link key={r.label} href={r.href}>
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 last:border-0 active:bg-white/5 transition-colors">
                <span className="text-white text-sm">{r.label}</span>
                <ChevronRight className="w-4 h-4 text-white/30" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
