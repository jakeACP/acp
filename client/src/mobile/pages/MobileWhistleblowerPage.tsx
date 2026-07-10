/**
 * Mobile Whistleblower Page
 *
 * Privacy-first: prominent emergency disclaimer, optional anonymity note (auth still required),
 * category → tag mapping, actual POST /api/whistleblowing call, and community reports list
 * with credibility voting.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ChevronLeft, ShieldCheck, Lock, Eye, AlertTriangle, Phone,
  ThumbsUp, ThumbsDown, Clock, List, PenLine, X, Loader2,
  ChevronRight, MessageSquare,
} from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import "../mobile-theme.css";

interface WhistleblowingPost {
  id: string;
  title: string;
  description: string;
  tags: string[];
  credibleVotes: number;
  notCredibleVotes: number;
  credibilityScore: number;
  viewsCount: number;
  commentsCount: number;
  createdAt: string;
  authorId: string;
}

const CATEGORIES = [
  { emoji: "💰", label: "Financial Corruption", tag: "financial_corruption" },
  { emoji: "🗳️", label: "Election Interference", tag: "election_interference" },
  { emoji: "🏛️", label: "Abuse of Power",        tag: "abuse_of_power" },
  { emoji: "🤝", label: "Bribery / Kickbacks",   tag: "bribery" },
  { emoji: "📊", label: "Insider Trading",        tag: "insider_trading" },
  { emoji: "🔒", label: "Obstruction",            tag: "obstruction" },
  { emoji: "📋", label: "Ethics Violation",       tag: "ethics_violation" },
  { emoji: "❓", label: "Other",                  tag: "other" },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ReportRow({ report }: { report: WhistleblowingPost }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const voteMutation = useMutation({
    mutationFn: (vote: "credible" | "not_credible") =>
      apiRequest(`/api/whistleblowing/${report.id}/vote`, "POST", { vote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whistleblowing"] });
    },
    onError: () => toast({ title: "Could not vote", variant: "destructive" }),
  });

  const category = CATEGORIES.find((c) => report.tags?.includes(c.tag));
  const score = report.credibilityScore ?? (report.credibleVotes - report.notCredibleVotes);

  return (
    <div className="p-4 border-b border-white/5 last:border-0">
      <div className="flex items-start gap-2 mb-1.5">
        <span className="text-base flex-shrink-0 mt-0.5">{category?.emoji ?? "🔍"}</span>
        <p className="text-white text-sm font-medium leading-snug flex-1">{report.title}</p>
      </div>
      <p className="text-white/50 text-xs leading-relaxed line-clamp-2 mb-2 ml-6">{report.description}</p>

      <div className="flex items-center gap-3 ml-6 flex-wrap">
        <span className="text-white/30 text-xs flex items-center gap-1">
          <Clock className="w-3 h-3" /> {timeAgo(report.createdAt)}
        </span>
        {report.commentsCount > 0 && (
          <span className="text-white/30 text-xs flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> {report.commentsCount}
          </span>
        )}
        <span className={`text-xs font-semibold ${score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-white/30"}`}>
          {score > 0 ? `+${score}` : score} credibility
        </span>

        {user && (
          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={() => voteMutation.mutate("credible")} disabled={voteMutation.isPending}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-[0.95]"
              style={{ background: "rgba(74,222,128,0.1)", color: "rgba(74,222,128,0.8)", border: "1px solid rgba(74,222,128,0.2)" }}>
              <ThumbsUp className="w-3 h-3" /> {report.credibleVotes}
            </button>
            <button onClick={() => voteMutation.mutate("not_credible")} disabled={voteMutation.isPending}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-[0.95]"
              style={{ background: "rgba(248,113,113,0.1)", color: "rgba(248,113,113,0.8)", border: "1px solid rgba(248,113,113,0.2)" }}>
              <ThumbsDown className="w-3 h-3" /> {report.notCredibleVotes}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SubmitForm({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const cat = CATEGORIES.find((c) => c.label === category);

  const submitMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/whistleblowing", "POST", {
        title: title.trim(),
        description: details.trim(),
        tags: cat ? [cat.tag] : ["other"],
        isAnonymous: anonymous,
      }),
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/whistleblowing"] });
    },
    onError: (e: Error) => toast({ title: "Submission failed", description: e.message, variant: "destructive" }),
  });

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
          style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)" }}>
          <ShieldCheck className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-white font-bold text-xl mb-2">Report Submitted</h2>
        <p className="text-white/55 text-sm leading-relaxed mb-6">
          Your report is now publicly visible and open for community credibility voting. ACP moderators will also review it.
        </p>
        <button onClick={onBack}
          className="px-6 py-2.5 rounded-2xl text-sm font-semibold text-white"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
          View Reports
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <Lock className="w-12 h-12 text-white/30 mb-4" />
        <p className="text-white font-semibold mb-2">Account required</p>
        <p className="text-white/50 text-sm mb-6">You must be logged in to submit a report. Your account identity is not shared publicly when submitting anonymously.</p>
        <Link href="/auth">
          <button className="px-6 py-3 rounded-2xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg,rgba(230,57,58,0.4),rgba(59,91,169,0.4))", border: "1px solid rgba(255,255,255,0.15)" }}>
            Log In
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Emergency disclaimer — always prominent */}
      <div className="flex items-start gap-3 p-4 rounded-2xl"
        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
        <Phone className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-red-400 font-bold text-sm">Not for emergencies</p>
          <p className="text-red-300/70 text-xs mt-0.5 leading-relaxed">
            If you or someone else is in immediate danger, call <strong>911</strong>. This form is for reporting political corruption only.
          </p>
        </div>
      </div>

      {/* Trust badges */}
      <div className="flex gap-2">
        {[
          { icon: Lock, label: "Encrypted" },
          { icon: Eye, label: "Anon option" },
          { icon: ShieldCheck, label: "Moderated" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1 p-3 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Icon className="w-4 h-4 text-blue-400" />
            <span className="text-white/50 text-[10px] text-center">{label}</span>
          </div>
        ))}
      </div>

      {/* Category */}
      <div>
        <p className="text-white/50 text-xs px-1 mb-2 uppercase tracking-wide font-medium">Category *</p>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <button key={c.label} onClick={() => setCategory(c.label)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-left text-sm transition-all active:scale-[0.97]"
              style={{
                background: category === c.label ? "rgba(59,91,169,0.35)" : "rgba(255,255,255,0.05)",
                border: category === c.label ? "1px solid rgba(107,159,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                color: category === c.label ? "#fff" : "rgba(255,255,255,0.6)",
              }}>
              <span>{c.emoji}</span>
              <span className="text-xs leading-tight">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <p className="text-white/50 text-xs px-1 mb-2 uppercase tracking-wide font-medium">Title *</p>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief headline for this report"
          maxLength={120}
          className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
        <p className="text-white/25 text-xs text-right mt-1">{title.length}/120</p>
      </div>

      {/* Details */}
      <div>
        <p className="text-white/50 text-xs px-1 mb-2 uppercase tracking-wide font-medium">Details *</p>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)}
          placeholder="Describe what you witnessed — who was involved, when it happened, any evidence or documents…"
          rows={5}
          className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none resize-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
      </div>

      {/* Anonymous toggle */}
      <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div>
          <p className="text-white text-sm font-medium">Submit anonymously</p>
          <p className="text-white/35 text-xs mt-0.5">Your display name is hidden from the public post. Your account is still logged.</p>
        </div>
        <button onClick={() => setAnonymous((v) => !v)}
          className="w-12 h-6 rounded-full flex-shrink-0 relative ml-3 transition-all"
          style={{ background: anonymous ? "#3B5BA9" : "rgba(255,255,255,0.15)" }}>
          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
            style={{ left: anonymous ? "calc(100% - 22px)" : 2 }} />
        </button>
      </div>

      {/* Legal note */}
      <div className="flex gap-2 px-1">
        <AlertTriangle className="w-4 h-4 text-yellow-400/60 flex-shrink-0 mt-0.5" />
        <p className="text-white/30 text-xs leading-relaxed">
          Knowingly false reports may result in account action. For legal whistleblower protections, consult an attorney. Reports do not constitute law enforcement filings.
        </p>
      </div>

      {/* Submit */}
      <button
        onClick={() => submitMutation.mutate()}
        disabled={!category || !title.trim() || !details.trim() || submitMutation.isPending}
        className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        style={{
          background: category && title.trim() && details.trim() ? "linear-gradient(135deg,#E6393A,#3B5BA9)" : "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.1)",
          opacity: (!category || !title.trim() || !details.trim()) ? 0.45 : 1,
        }}
        data-testid="submit-report-btn">
        {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        Submit Report
      </button>
    </div>
  );
}

export function MobileWhistleblowerPage() {
  const [view, setView] = useState<"reports" | "submit">("reports");

  const { data: reports = [], isLoading } = useQuery<WhistleblowingPost[]>({
    queryKey: ["/api/whistleblowing"],
    staleTime: 60_000,
  });

  return (
    <div className="mobile-root" data-testid="mobile-whistleblower-page">
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <Link href="/mobile/civic">
            <button className="notification-button"><ChevronLeft className="w-5 h-5 text-white" /></button>
          </Link>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg">Whistleblower</h1>
            <p className="text-white/50 text-xs">Report corruption safely</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-4 pb-3">
        <div className="flex rounded-2xl p-1 gap-1"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {[
            { id: "reports", icon: List, label: "Reports" },
            { id: "submit", icon: PenLine, label: "Submit Report" },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setView(id as any)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              style={view === id
                ? { background: "rgba(255,255,255,0.15)", color: "#fff" }
                : { color: "rgba(255,255,255,0.45)" }}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-28">
        {view === "submit" ? (
          <SubmitForm onBack={() => setView("reports")} />
        ) : isLoading ? (
          <div className="glass-card overflow-hidden" style={{ borderRadius: 18 }}>
            {[1,2,3].map((i) => (
              <div key={i} className="p-4 border-b border-white/5 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/10 rounded w-full mb-1" />
                <div className="h-3 bg-white/10 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="text-5xl mb-4">🔍</span>
            <p className="text-white/60 font-semibold">No reports yet</p>
            <p className="text-white/35 text-sm mt-1 mb-5">Be the first to report corruption.</p>
            <button onClick={() => setView("submit")}
              className="px-6 py-2.5 rounded-2xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,rgba(230,57,58,0.35),rgba(59,91,169,0.35))", border: "1px solid rgba(255,255,255,0.15)" }}>
              Submit a Report
            </button>
          </div>
        ) : (
          <>
            <div className="glass-card overflow-hidden mb-4" style={{ borderRadius: 18 }}>
              {reports.map((r) => <ReportRow key={r.id} report={r} />)}
            </div>
            <button onClick={() => setView("submit")}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,rgba(230,57,58,0.3),rgba(59,91,169,0.3))", border: "1px solid rgba(255,255,255,0.12)" }}>
              <PenLine className="w-4 h-4" /> Submit a New Report
            </button>
          </>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
