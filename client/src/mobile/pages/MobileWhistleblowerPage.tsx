import { useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, ShieldCheck, Lock, Eye, AlertTriangle } from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

const CATEGORIES = [
  { emoji: "💰", label: "Financial Corruption" },
  { emoji: "🗳️", label: "Election Interference" },
  { emoji: "🏛️", label: "Abuse of Power" },
  { emoji: "🤝", label: "Bribery / Kickbacks" },
  { emoji: "📊", label: "Insider Trading" },
  { emoji: "🔒", label: "Obstruction of Justice" },
  { emoji: "📋", label: "Ethics Violation" },
  { emoji: "❓", label: "Other" },
];

export function MobileWhistleblowerPage() {
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!category || !details.trim()) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mobile-root">
        <div className="glass-top-bar">
          <div className="flex items-center gap-3">
            <Link href="/mobile/civic">
              <button className="notification-button">
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <h1 className="text-white font-bold text-lg">Whistleblower</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ background: "rgba(74,222,128,0.15)" }}>
            <ShieldCheck className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-white font-bold text-xl mb-3">Report Received</h2>
          <p className="text-white/55 text-sm mb-6 leading-relaxed">
            Thank you. Your report has been submitted{anonymous ? " anonymously" : ""}. Our team will review it and take action where appropriate.
          </p>
          <Link href="/mobile/civic">
            <button
              className="px-8 py-3 rounded-2xl text-sm font-semibold text-white"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              Back to Civic Hub
            </button>
          </Link>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="mobile-root" data-testid="mobile-whistleblower-page">
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <Link href="/mobile/civic">
            <button className="notification-button">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">Whistleblower</h1>
            <p className="text-white/50 text-xs">Report corruption safely</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-28 space-y-4">
        {/* Trust badges */}
        <div className="flex gap-2">
          {[
            { icon: Lock, label: "Encrypted" },
            { icon: Eye, label: "Optional Anon" },
            { icon: ShieldCheck, label: "Reviewed" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex-1 flex flex-col items-center gap-1 p-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Icon className="w-5 h-5 text-blue-400" />
              <span className="text-white/55 text-[10px] text-center">{label}</span>
            </div>
          ))}
        </div>

        {/* Category */}
        <div>
          <p className="text-white/55 text-xs px-1 mb-2 uppercase tracking-wide font-medium">
            Category
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.label}
                onClick={() => setCategory(c.label)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-left text-sm transition-all active:scale-[0.97]"
                style={{
                  background: category === c.label
                    ? "rgba(59,91,169,0.35)"
                    : "rgba(255,255,255,0.05)",
                  border: category === c.label
                    ? "1px solid rgba(107,159,255,0.4)"
                    : "1px solid rgba(255,255,255,0.08)",
                  color: category === c.label ? "#fff" : "rgba(255,255,255,0.6)",
                }}
              >
                <span>{c.emoji}</span>
                <span className="text-xs leading-tight">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div>
          <p className="text-white/55 text-xs px-1 mb-2 uppercase tracking-wide font-medium">
            Details
          </p>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Describe what you witnessed, when, who was involved, and any evidence…"
            rows={6}
            className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none resize-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
        </div>

        {/* Anonymous toggle */}
        <div
          className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div>
            <p className="text-white text-sm font-medium">Submit anonymously</p>
            <p className="text-white/40 text-xs">Your identity will not be shared</p>
          </div>
          <button
            onClick={() => setAnonymous(!anonymous)}
            className="w-12 h-6 rounded-full transition-all flex-shrink-0"
            style={{
              background: anonymous ? "#3B5BA9" : "rgba(255,255,255,0.15)",
              position: "relative",
            }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: anonymous ? "calc(100% - 22px)" : 2 }}
            />
          </button>
        </div>

        {/* Disclaimer */}
        <div className="flex gap-2 px-1">
          <AlertTriangle className="w-4 h-4 text-yellow-400/60 flex-shrink-0 mt-0.5" />
          <p className="text-white/35 text-xs leading-relaxed">
            Reports are reviewed by ACP moderators. False reports may be subject to action. For legal whistleblower protections, consult an attorney.
          </p>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!category || !details.trim()}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
          style={{
            background:
              category && details.trim()
                ? "linear-gradient(135deg, #E6393A, #3B5BA9)"
                : "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            opacity: category && details.trim() ? 1 : 0.5,
          }}
        >
          Submit Report
        </button>
      </div>

      <MobileBottomNav />
    </div>
  );
}
