import { useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { useAuth } from "@/hooks/use-auth";
import "../mobile-theme.css";

const STEPS = [
  {
    emoji: "📋",
    title: "Check eligibility",
    description: "Review constitutional and state requirements for the office you seek.",
  },
  {
    emoji: "🔍",
    title: "Duplicate check",
    description: "Search for an existing politician profile that matches your name to claim it.",
  },
  {
    emoji: "🏛️",
    title: "Complete your profile",
    description: "Add your platform, biography, policy positions, and headshot.",
  },
  {
    emoji: "✅",
    title: "Earn ACE badge",
    description: "Apply for the Anti-Corruption Endorsement via video pledge to boost your grade.",
  },
  {
    emoji: "📢",
    title: "Engage supporters",
    description: "Post Signals and articles to build your audience and collect endorsements.",
  },
];

const RESOURCES = [
  {
    label: "Candidate Registration Wizard",
    description: "Full step-by-step application",
    href: "/run-for-office",
    external: true,
    highlight: true,
  },
  {
    label: "ACE Pledge Application",
    description: "Anti-Corruption Endorsement badge",
    href: "/run-for-office",
    external: true,
  },
  {
    label: "ACP Platform Principles",
    description: "Our values and policy positions",
    href: "/",
    external: true,
  },
  {
    label: "Candidate Portal",
    description: "Manage your existing candidacy",
    href: "/mobile/civic/candidates",
    external: false,
  },
  {
    label: "Politician Profile Claim",
    description: "Claim a pre-existing profile",
    href: "/run-for-office",
    external: true,
  },
];

export function MobileRunForOfficePage() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="mobile-root" data-testid="mobile-run-for-office-page">
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <Link href="/mobile/civic">
            <button className="notification-button"><ChevronLeft className="w-5 h-5 text-white" /></button>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">Run for Office</h1>
            <p className="text-white/50 text-xs">Start your campaign with ACP</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-28 space-y-4">
        {/* Hero card */}
        <div className="glass-card p-5 text-center"
          style={{ height: "auto", background: "linear-gradient(135deg,rgba(230,57,58,0.2) 0%,rgba(59,91,169,0.25) 100%)" }}>
          <span className="text-5xl block mb-3">🏃</span>
          <h2 className="text-white font-bold text-lg mb-2">Ready to serve?</h2>
          <p className="text-white/60 text-sm mb-5 leading-relaxed">
            The ACP supports citizens running for office at every level — local, state, and federal. Register your candidacy in minutes.
          </p>
          {user ? (
            <a href="/run-for-office" target="_blank" rel="noopener noreferrer">
              <button className="px-8 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg,#E6393A,#3B5BA9)" }}>
                Start Registration →
              </button>
            </a>
          ) : (
            <Link href="/auth">
              <button className="px-8 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg,#E6393A,#3B5BA9)" }}>
                Log In to Start
              </button>
            </Link>
          )}
        </div>

        {/* Steps (expandable) */}
        <p className="text-white/40 text-xs px-1 uppercase tracking-wide font-medium">How it works</p>
        <div className="glass-card overflow-hidden" style={{ borderRadius: 18 }}>
          {STEPS.map((step, i) => (
            <button key={i} onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-start gap-3 px-4 py-3.5 border-b border-white/5 last:border-0 text-left active:bg-white/5 transition-colors">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                style={{ background: "rgba(59,91,169,0.3)", minWidth: 32 }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span>{step.emoji}</span>
                  <p className="text-white text-sm font-medium">{step.title}</p>
                </div>
                {expanded === i && (
                  <p className="text-white/50 text-xs mt-1.5 leading-relaxed">{step.description}</p>
                )}
              </div>
              <ChevronRight className={`w-4 h-4 text-white/25 flex-shrink-0 transition-transform ${expanded === i ? "rotate-90" : ""}`} />
            </button>
          ))}
        </div>

        {/* Resources */}
        <p className="text-white/40 text-xs px-1 uppercase tracking-wide font-medium">Resources</p>
        <div className="space-y-2">
          {RESOURCES.map((r) => {
            const inner = (
              <div className={`flex items-center justify-between px-4 py-3.5 rounded-2xl active:bg-white/5 transition-colors ${r.highlight ? "border" : ""}`}
                style={r.highlight ? {
                  background: "linear-gradient(135deg,rgba(230,57,58,0.15),rgba(59,91,169,0.15))",
                  border: "1px solid rgba(230,57,58,0.3)",
                } : {
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                <div>
                  <p className={`text-sm font-semibold ${r.highlight ? "text-white" : "text-white/80"}`}>{r.label}</p>
                  <p className="text-white/40 text-xs mt-0.5">{r.description}</p>
                </div>
                {r.external
                  ? <ExternalLink className="w-4 h-4 text-white/30 flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />}
              </div>
            );
            return r.external ? (
              <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer">{inner}</a>
            ) : (
              <Link key={r.label} href={r.href}>{inner}</Link>
            );
          })}
        </div>

        {/* Eligibility note */}
        <div className="flex gap-3 p-4 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <CheckCircle2 className="w-5 h-5 text-green-400/60 flex-shrink-0 mt-0.5" />
          <p className="text-white/35 text-xs leading-relaxed">
            ACP is open to candidates who commit to our anti-corruption pledge. Candidates are individually verified. ACP does not guarantee ballot access — consult your state's election commission for filing requirements.
          </p>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
