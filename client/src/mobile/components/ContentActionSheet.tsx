/**
 * ContentActionSheet — Universal "⋯" action sheet for any piece of content.
 *
 * Shows options: Report, Block user, Mute user, Hide, Not Interested, Copy Link.
 * Block/Mute/Hide are executed inline; Report opens ReportSheet.
 */

import { useState } from "react";
import {
  X, Flag, Ban, VolumeX, EyeOff, ThumbsDown,
  Link2, Loader2, Check,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ReportSheet, type ReportContentType } from "./ReportSheet";
import { useAuth } from "@/hooks/use-auth";

interface ContentActionSheetProps {
  contentType: ReportContentType;
  contentId: string;
  authorId?: string;
  authorUsername?: string;
  shareUrl?: string;
  onClose: () => void;
  onHide?: () => void;
}

type SheetView = "main" | "report";

interface ActionResult {
  key: string;
  success: boolean;
}

export function ContentActionSheet({
  contentType,
  contentId,
  authorId,
  authorUsername,
  shareUrl,
  onClose,
  onHide,
}: ContentActionSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<SheetView>("main");
  const [done, setDone] = useState<ActionResult | null>(null);

  const isOwnContent = user?.id === authorId;

  const blockMutation = useMutation({
    mutationFn: () => apiRequest(`/api/user/block/${authorId}`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/blocked"] });
      setDone({ key: "block", success: true });
      toast({ title: `@${authorUsername ?? "User"} blocked` });
      setTimeout(onClose, 1200);
    },
    onError: () => toast({ title: "Failed to block", variant: "destructive" }),
  });

  const muteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/user/mute/${authorId}`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/muted"] });
      setDone({ key: "mute", success: true });
      toast({ title: `@${authorUsername ?? "User"} muted` });
      setTimeout(onClose, 1200);
    },
    onError: () => toast({ title: "Failed to mute", variant: "destructive" }),
  });

  const hideMutation = useMutation({
    mutationFn: (notInterested: boolean) =>
      apiRequest("/api/content/hide", "POST", {
        contentType,
        contentId,
        notInterested,
      }),
    onSuccess: (_data, notInterested) => {
      setDone({ key: notInterested ? "notInterested" : "hide", success: true });
      queryClient.invalidateQueries({ queryKey: ["/api/content/hidden"] });
      toast({ title: notInterested ? "Got it — we'll show less like this" : "Content hidden" });
      onHide?.();
      setTimeout(onClose, 1000);
    },
    onError: () => toast({ title: "Failed to hide content", variant: "destructive" }),
  });

  const handleCopyLink = () => {
    const url = shareUrl ?? `${window.location.origin}/${contentType}s/${contentId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied!" });
    }).catch(() => {
      toast({ title: "Could not copy link", variant: "destructive" });
    });
    onClose();
  };

  if (view === "report") {
    return (
      <ReportSheet
        contentType={contentType}
        contentId={contentId}
        authorUsername={authorUsername}
        onClose={onClose}
      />
    );
  }

  const isPending = blockMutation.isPending || muteMutation.isPending || hideMutation.isPending;

  return (
    <div
      className="fixed inset-0 flex flex-col justify-end"
      style={{ zIndex: 500, background: "rgba(0,0,0,0.65)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-t-3xl pt-3 pb-8"
        style={{ background: "#111214", maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-12 h-1 rounded-full mx-auto mb-1" style={{ background: "rgba(255,255,255,0.2)" }} />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-white font-semibold text-base">Options</p>
            {authorUsername && <p className="text-white/40 text-xs">@{authorUsername}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-full active:bg-white/10">
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        <div className="px-3 space-y-1">
          {/* Report */}
          <ActionRow
            icon={Flag}
            label="Report"
            sub={`Report this ${contentType === "signal" ? "video" : contentType}`}
            color="text-red-400"
            bg="rgba(239,68,68,0.1)"
            onClick={() => setView("report")}
            data-testid="action-report"
          />

          {/* Block */}
          {!isOwnContent && authorId && (
            <ActionRow
              icon={Ban}
              label={`Block @${authorUsername ?? "user"}`}
              sub="They won't be able to see or message you"
              onClick={() => blockMutation.mutate()}
              loading={blockMutation.isPending}
              done={done?.key === "block"}
              disabled={isPending}
              data-testid="action-block"
            />
          )}

          {/* Mute */}
          {!isOwnContent && authorId && (
            <ActionRow
              icon={VolumeX}
              label={`Mute @${authorUsername ?? "user"}`}
              sub="Their posts won't appear in your feed"
              onClick={() => muteMutation.mutate()}
              loading={muteMutation.isPending}
              done={done?.key === "mute"}
              disabled={isPending}
              data-testid="action-mute"
            />
          )}

          {/* Hide */}
          <ActionRow
            icon={EyeOff}
            label="Hide this"
            sub="Remove this item from your feed"
            onClick={() => hideMutation.mutate(false)}
            loading={hideMutation.isPending && !hideMutation.variables}
            done={done?.key === "hide"}
            disabled={isPending}
            data-testid="action-hide"
          />

          {/* Not interested */}
          <ActionRow
            icon={ThumbsDown}
            label="Not interested"
            sub="See less content like this"
            onClick={() => hideMutation.mutate(true)}
            loading={hideMutation.isPending && hideMutation.variables === true}
            done={done?.key === "notInterested"}
            disabled={isPending}
            data-testid="action-not-interested"
          />

          {/* Copy link */}
          <div className="my-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />

          <ActionRow
            icon={Link2}
            label="Copy link"
            sub=""
            onClick={handleCopyLink}
            data-testid="action-copy-link"
          />
        </div>
      </div>
    </div>
  );
}

interface ActionRowProps {
  icon: typeof Flag;
  label: string;
  sub?: string;
  color?: string;
  bg?: string;
  onClick: () => void;
  loading?: boolean;
  done?: boolean;
  disabled?: boolean;
  "data-testid"?: string;
}

function ActionRow({ icon: Icon, label, sub, color = "text-white/70", bg = "rgba(255,255,255,0.07)", onClick, loading, done, disabled, "data-testid": testId }: ActionRowProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading || done}
      className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl active:opacity-70 transition-all disabled:opacity-50 text-left"
      style={{ background: bg }}
      data-testid={testId}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.06)" }}>
        {loading
          ? <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
          : done
          ? <Check className="w-4 h-4 text-emerald-400" />
          : <Icon className={`w-4 h-4 ${color}`} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? "text-emerald-400" : color === "text-red-400" ? "text-red-400" : "text-white"}`}>
          {done ? "Done" : label}
        </p>
        {sub && <p className="text-white/30 text-xs mt-0.5">{sub}</p>}
      </div>
    </button>
  );
}
