/**
 * ReportSheet — Universal bottom-sheet for reporting any type of content.
 *
 * Reporter identity is stored server-side only and NEVER exposed to the
 * reported user or returned in the API response.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  X, AlertTriangle, ShieldAlert, MessageSquareWarning,
  Skull, ImageOff, Info, Heart, HelpCircle, Loader2, Check,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type ReportContentType =
  | "post" | "comment" | "signal" | "profile"
  | "group" | "event" | "petition" | "message";

interface ReportSheetProps {
  contentType: ReportContentType;
  contentId: string;
  authorUsername?: string;
  onClose: () => void;
}

const REASONS: { id: string; icon: typeof AlertTriangle; label: string; sub: string }[] = [
  { id: "spam",              icon: AlertTriangle,         label: "Spam or misleading",        sub: "Unsolicited or deceptive content" },
  { id: "hate_speech",       icon: ShieldAlert,           label: "Hate speech",               sub: "Content targeting people based on identity" },
  { id: "harassment",        icon: MessageSquareWarning,  label: "Harassment or bullying",     sub: "Targeted attacks or intimidation" },
  { id: "violence",          icon: Skull,                 label: "Violence or threats",        sub: "Threatening or graphic violent content" },
  { id: "nudity",            icon: ImageOff,              label: "Nudity or sexual content",  sub: "Explicit or inappropriate imagery" },
  { id: "misinformation",    icon: Info,                  label: "False information",         sub: "Dangerous or verifiably false claims" },
  { id: "self_harm",         icon: Heart,                 label: "Self-harm or suicide",      sub: "Content promoting self-injury" },
  { id: "other",             icon: HelpCircle,            label: "Something else",            sub: "Doesn't fit another category" },
];

const CONTENT_LABELS: Record<ReportContentType, string> = {
  post:     "Post",
  comment:  "Comment",
  signal:   "Signal (video)",
  profile:  "Profile",
  group:    "Group",
  event:    "Event",
  petition: "Petition",
  message:  "Message",
};

type Step = "reason" | "details" | "done";

export function ReportSheet({ contentType, contentId, authorUsername, onClose }: ReportSheetProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("reason");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");

  const reportMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/report", "POST", {
        contentType,
        contentId,
        flagType: selectedReason,
        reason: details || undefined,
      }),
    onSuccess: () => setStep("done"),
    onError: (e: Error) => toast({ title: "Report failed", description: e.message, variant: "destructive" }),
  });

  const handleReasonSelect = (id: string) => {
    setSelectedReason(id);
    setStep("details");
  };

  return (
    <div
      className="fixed inset-0 flex flex-col justify-end"
      style={{ zIndex: 600, background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-t-3xl px-4 pt-3 pb-8"
        style={{ background: "#111214", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-12 h-1 rounded-full mx-auto mb-4" style={{ background: "rgba(255,255,255,0.2)" }} />

        {/* Done */}
        {step === "done" && (
          <div className="text-center py-8 px-4">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.15)" }}>
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-white font-bold text-xl mb-2">Report Submitted</p>
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              Thank you. Our moderation team reviews all reports within 24 hours. Your identity will never be shared with the reported user.
            </p>
            <button onClick={onClose}
              className="px-6 py-3 rounded-2xl text-sm font-semibold text-white w-full"
              style={{ background: "rgba(255,255,255,0.1)" }}>
              Done
            </button>
          </div>
        )}

        {/* Reason picker */}
        {step === "reason" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white font-bold text-lg">Report {CONTENT_LABELS[contentType]}</p>
                {authorUsername && <p className="text-white/45 text-sm">@{authorUsername}</p>}
              </div>
              <button onClick={onClose} className="p-2 rounded-full active:bg-white/10">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <p className="text-white/50 text-sm mb-4">Why are you reporting this?</p>

            <div className="space-y-1">
              {REASONS.map(({ id, icon: Icon, label, sub }) => (
                <button key={id} onClick={() => handleReasonSelect(id)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left active:opacity-70 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                  data-testid={`report-reason-${id}`}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(239,68,68,0.12)" }}>
                    <Icon className="w-4.5 h-4.5 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-white/35 text-xs mt-0.5">{sub}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 px-2 py-3 rounded-xl flex items-start gap-2"
              style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <ShieldAlert className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-blue-400/80 text-xs leading-relaxed">
                Your report is confidential. We will never share your identity with the reported user or anyone else.
              </p>
            </div>
          </>
        )}

        {/* Details */}
        {step === "details" && selectedReason && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setStep("reason")} className="p-2 rounded-full active:bg-white/10">
                <X className="w-4 h-4 text-white/50 rotate-180 scale-x-[-1]" />
              </button>
              <div className="flex-1">
                <p className="text-white font-bold text-lg">Additional Context</p>
                <p className="text-white/45 text-sm">{REASONS.find(r => r.id === selectedReason)?.label}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full active:bg-white/10">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-white/50 text-sm mb-2">Additional details (optional)</p>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe what you observed to help our team review faster…"
                maxLength={500}
                rows={4}
                className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                data-testid="report-details-input"
              />
              <p className="text-white/25 text-xs text-right mt-1">{details.length}/500</p>
            </div>

            <button onClick={() => reportMutation.mutate()}
              disabled={reportMutation.isPending}
              className="w-full py-4 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 mb-3 disabled:opacity-50"
              style={{ background: "rgba(239,68,68,0.85)" }}
              data-testid="submit-report-btn">
              {reportMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                : "Submit Report"}
            </button>

            <div className="px-2 py-2.5 rounded-xl flex items-start gap-2"
              style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <ShieldAlert className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-blue-400/80 text-xs leading-relaxed">
                Your report is confidential. We will never share your identity with the reported user or anyone else.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
