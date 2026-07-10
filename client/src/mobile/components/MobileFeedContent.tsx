/**
 * MobileFeedContent — Full-width Facebook-style scrollable feed.
 *
 * Reuses all existing APIs + components:
 *   • ExpandedCardView  — tap-to-detail modal (drag-to-close)
 *   • PostCommentsOverlay — slide-up comment sheet
 *   • ShareSheet — native/web share
 *   • MobileApprovalPrompt — politician approval every 8 posts
 *
 * Supports all content types:
 *   post · news · poll · petition · event · announcement · blog/article
 *
 * Every card has: ❤️ Like · 💬 Comments · 📤 Share · 🔖 Save · ⋯ Report
 * No desktop redirects — events open ExpandedCardView, petitions sign inline.
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Heart, MessageCircle, Share2, Bookmark, Flag, MoreHorizontal,
  Calendar, MapPin, Users, CheckCircle, Megaphone, BookOpen,
  Video, ExternalLink, X,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { sanitizeUrl } from "@/lib/utils";
import { ShareSheet } from "@/components/share-sheet";
import { ExpandedCardView } from "./ExpandedCardView";
import { PostCommentsOverlay } from "./PostCommentsOverlay";
import { FriendSuggestionsWidget } from "./FriendSuggestionsWidget";
import { LazyYouTubeThumbnail, LazyTikTokThumbnail } from "./LazyYouTubeThumbnail";
import { findVideoInPost } from "../utils/youtube";
import type { Poll, Petition, Event } from "@shared/schema";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Author {
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
}

interface PostItem {
  id: string;
  authorId: string;
  content: string;
  type: string;
  tags?: string[];
  image?: string | null;
  url?: string | null;
  title?: string | null;
  newsSourceName?: string | null;
  linkPreview?: { url: string; title?: string; description?: string; image?: string; siteName?: string } | null;
  sharedPostId?: string | null;
  eventId?: string | null;
  articleBody?: string | null;
  featuredImage?: string | null;
  excerpt?: string | null;
  readingTime?: number | null;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  pollId?: string | null;
  pollTitle?: string | null;
  pollOptions?: { id: string; text: string; votes: number }[] | null;
  pollTotalVotes?: number | null;
  pollEndDate?: Date | string | null;
  pollIsActive?: boolean | null;
  createdAt?: Date | string | null;
  author?: Author;
}

type FeedItem =
  | { type: "post";         data: PostItem }
  | { type: "news";         data: PostItem }
  | { type: "poll";         data: PostItem | Poll }
  | { type: "announcement"; data: PostItem }
  | { type: "event";        data: PostItem; event?: Event }
  | { type: "petition";     data: Petition }
  | { type: "blog";         data: PostItem };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function displayName(a?: Author | null) {
  if (!a) return "Anonymous";
  return a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : a.username;
}

function Avatar({ author, size = 9 }: { author?: Author | null; size?: number }) {
  const name = displayName(author);
  const px = `${size * 4}px`;
  return (
    <div
      className="rounded-full bg-gradient-to-br from-red-500 to-blue-500 overflow-hidden flex-shrink-0"
      style={{ width: px, height: px }}
    >
      {author?.avatar
        ? <img src={author.avatar} alt="" className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
            {name.charAt(0).toUpperCase()}
          </div>}
    </div>
  );
}

// ─── Action bar ─────────────────────────────────────────────────────────────

interface ActionBarProps {
  postId: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  shareTitle: string;
  onComment: () => void;
  onExpand?: () => void;
}

function ActionBar({
  postId, likesCount, commentsCount, sharesCount,
  shareTitle, onComment,
}: ActionBarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [reported, setReported] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const { data: likeStatus } = useQuery<{ liked: boolean }>({
    queryKey: ["/api/likes", postId, "post"],
    queryFn: async () => {
      const res = await fetch(`/api/likes/${postId}/post`, { credentials: "include" });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/likes", "POST", {
        targetId: postId,
        targetType: "post",
      });
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/likes", postId, "post"] });
      const prev = queryClient.getQueryData(["/api/likes", postId, "post"]);
      queryClient.setQueryData(["/api/likes", postId, "post"], {
        liked: !(likeStatus?.liked ?? false),
      });
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(["/api/likes", postId, "post"], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/likes", postId, "post"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/all"] });
    },
  });

  const flagMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/flags", "POST", { postId, reason: "inappropriate" }),
    onSuccess: () => {
      setReported(true);
      setShowMenu(false);
      toast({ title: "Reported", description: "Thanks — a moderator will review this." });
    },
    onError: () => toast({ title: "Could not report", variant: "destructive" }),
  });

  const liked = likeStatus?.liked ?? false;
  const shareUrl = `${window.location.origin}/mobile/posts/${postId}`;

  return (
    <div className="relative">
      <div
        className="flex items-center gap-1 pt-3 mt-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Like */}
        <button
          onClick={() => {
            if (!user) { toast({ title: "Sign in to like" }); return; }
            likeMutation.mutate();
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
          style={liked
            ? { color: "#f87171", background: "rgba(239,68,68,0.12)" }
            : { color: "rgba(255,255,255,0.5)", background: "transparent" }
          }
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
          <span>{likesCount || 0}</span>
        </button>

        {/* Comment */}
        <button
          onClick={onComment}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <MessageCircle className="w-4 h-4" />
          <span>{commentsCount || 0}</span>
        </button>

        {/* Share */}
        <ShareSheet
          title={shareTitle}
          url={shareUrl}
          trigger={(open) => (
            <button
              onClick={open}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              <Share2 className="w-4 h-4" />
              <span>{sharesCount || 0}</span>
            </button>
          )}
        />

        {/* Save */}
        <button
          onClick={() => setSaved((s) => !s)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
          style={saved
            ? { color: "#60a5fa", background: "rgba(96,165,250,0.12)" }
            : { color: "rgba(255,255,255,0.5)" }
          }
        >
          <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
        </button>

        {/* ⋯ More (report) */}
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="ml-auto flex items-center px-2 py-2 rounded-xl active:scale-95 transition-all"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* More menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowMenu(false)}
          />
          <div
            className="absolute right-0 bottom-10 z-40 rounded-2xl p-1 min-w-[160px]"
            style={{
              background: "rgba(15,20,40,0.97)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {user && !reported && (
              <button
                onClick={() => flagMutation.mutate()}
                disabled={flagMutation.isPending}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-red-400 active:bg-white/5"
              >
                <Flag className="w-4 h-4" />
                Report post
              </button>
            )}
            {reported && (
              <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-white/40">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Reported
              </div>
            )}
            <button
              onClick={() => setShowMenu(false)}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-white/50 active:bg-white/5"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Author header ─────────────────────────────────────────────────────────

function AuthorRow({ author, createdAt, badge }: {
  author?: Author | null;
  createdAt?: Date | string | null;
  badge?: React.ReactNode;
}) {
  const name = displayName(author);
  const timeAgo = createdAt
    ? formatDistanceToNow(new Date(createdAt), { addSuffix: false }) + " ago"
    : "";

  return (
    <div className="flex items-center gap-2.5 mb-3">
      <Avatar author={author} size={9} />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{name}</p>
        {timeAgo && <p className="text-white/40 text-[11px]">{timeAgo}</p>}
      </div>
      {badge}
    </div>
  );
}

// ─── Card wrappers ─────────────────────────────────────────────────────────

function FeedCard({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <article
      className={`glass-card p-4 ${className}`}
      style={{ height: "auto" }}
      onClick={onClick}
    >
      {children}
    </article>
  );
}

// ─── Individual card renderers ─────────────────────────────────────────────

function PostFeedCard({
  item,
  onExpand,
  onComment,
}: {
  item: FeedItem & { type: "post" };
  onExpand: () => void;
  onComment: () => void;
}) {
  const d = item.data;
  const videoInfo = findVideoInPost(d);
  const contentWithoutUrls = d.content?.replace(/https?:\/\/[^\s]+/g, "").trim();

  return (
    <FeedCard>
      <AuthorRow author={d.author} createdAt={d.createdAt} />

      <div className="cursor-pointer" onClick={onExpand}>
        {videoInfo ? (
          <>
            {videoInfo.platform === "youtube"
              ? <LazyYouTubeThumbnail videoId={videoInfo.videoId} className="w-full rounded-xl mb-3" quality="hqdefault" />
              : <LazyTikTokThumbnail videoId={videoInfo.videoId} tiktokUrl={videoInfo.originalUrl} className="w-full rounded-xl mb-3" />
            }
            {contentWithoutUrls && <p className="text-white text-sm leading-relaxed line-clamp-3">{contentWithoutUrls}</p>}
          </>
        ) : (
          <>
            <p className="text-white text-sm leading-relaxed line-clamp-5 mb-2">{d.content}</p>
            {d.image && (
              <div className="rounded-xl overflow-hidden aspect-video bg-white/5">
                <img src={d.image} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}
          </>
        )}
      </div>

      <ActionBar
        postId={d.id}
        likesCount={d.likesCount ?? 0}
        commentsCount={d.commentsCount ?? 0}
        sharesCount={d.sharesCount ?? 0}
        shareTitle={d.content?.slice(0, 80) ?? "ACP Post"}
        onComment={onComment}
        onExpand={onExpand}
      />
    </FeedCard>
  );
}

function NewsFeedCard({
  item,
  onExpand,
  onComment,
}: {
  item: FeedItem & { type: "news" };
  onExpand: () => void;
  onComment: () => void;
}) {
  const d = item.data;
  const thumb = d.linkPreview?.image || d.image;
  const headline = d.title || d.linkPreview?.title || d.content.slice(0, 120);
  const source = d.newsSourceName || d.linkPreview?.siteName || d.author?.username || "ACP News";

  return (
    <FeedCard>
      <div className="flex items-center gap-2 mb-3">
        <span className="type-tag news text-[10px] px-2 py-0.5 rounded-full">News</span>
        <span className="text-white/40 text-xs">{source}</span>
      </div>

      <div className="cursor-pointer" onClick={onExpand}>
        {thumb && (
          <div className="h-44 rounded-xl overflow-hidden mb-3 bg-white/5">
            <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <h3 className="text-white font-semibold text-base leading-snug line-clamp-3 mb-1">{headline}</h3>
        {d.linkPreview?.description && (
          <p className="text-white/50 text-sm line-clamp-2">{d.linkPreview.description}</p>
        )}
        {d.url && (
          <a
            href={sanitizeUrl(d.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-400 text-xs mt-2 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            Read article
          </a>
        )}
      </div>

      <ActionBar
        postId={d.id}
        likesCount={d.likesCount ?? 0}
        commentsCount={d.commentsCount ?? 0}
        sharesCount={d.sharesCount ?? 0}
        shareTitle={headline}
        onComment={onComment}
        onExpand={onExpand}
      />
    </FeedCard>
  );
}

function PollFeedCard({
  item,
  onExpand,
  onComment,
}: {
  item: FeedItem & { type: "poll" };
  onExpand: () => void;
  onComment: () => void;
}) {
  const d = item.data as PostItem & {
    title?: string;
    options?: { id: string; text: string; votes: number }[];
    totalVotes?: number;
    endDate?: Date | string | null;
  };

  const isPostPoll = "pollTitle" in d && d.pollTitle;
  const title    = isPostPoll ? (d as PostItem).pollTitle! : (d.title || "Poll");
  const rawOpts  = isPostPoll ? (d as PostItem).pollOptions : (d.options ?? []);
  const options  = (rawOpts || []).filter((o: any) => o?.id);
  const total    = isPostPoll ? ((d as PostItem).pollTotalVotes ?? 0) : (d.totalVotes ?? 0);
  const endDate  = isPostPoll ? (d as PostItem).pollEndDate : d.endDate;
  const pollId   = isPostPoll ? (d as PostItem).pollId : d.id;

  const [selected, setSelected] = useState<string | null>(null);
  const [localVotes, setLocalVotes] = useState<Record<string, number>>({});
  const [hasVoted, setHasVoted] = useState(false);

  const voteMutation = useMutation({
    mutationFn: (optionId: string) =>
      apiRequest("POST", `/api/polls/${pollId}/vote`, { optionId }),
    onSuccess: (_data, optionId) => {
      setSelected(optionId);
      setHasVoted(true);
      setLocalVotes((p) => ({ ...p, [optionId]: (p[optionId] ?? 0) + 1 }));
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/all"] });
    },
  });

  const totalWithLocal = total + Object.values(localVotes).reduce((a, b) => a + b, 0);
  const showResults = hasVoted || selected !== null;
  const timeLeft = endDate ? formatDistanceToNow(new Date(endDate), { addSuffix: true }) : null;

  return (
    <FeedCard>
      <div className="flex items-center gap-2 mb-3">
        <span className="type-tag poll text-[10px] px-2 py-0.5 rounded-full">Poll</span>
        {timeLeft && <span className="text-white/40 text-xs">Closes {timeLeft}</span>}
      </div>

      <h3 className="text-white font-semibold text-base mb-4 cursor-pointer" onClick={onExpand}>
        {title}
      </h3>

      <div className="space-y-2 mb-3">
        {options.map((opt: any) => {
          const votes = (opt.votes ?? 0) + (localVotes[opt.id] ?? 0);
          const pct = totalWithLocal > 0 ? Math.round((votes / totalWithLocal) * 100) : 0;
          const isSelected = selected === opt.id;

          return (
            <button
              key={opt.id}
              onClick={(e) => {
                e.stopPropagation();
                if (!showResults && !voteMutation.isPending) {
                  setSelected(opt.id);
                  voteMutation.mutate(opt.id);
                }
              }}
              disabled={showResults || voteMutation.isPending}
              className="relative w-full text-left rounded-xl overflow-hidden transition-all active:scale-[0.98]"
              style={{
                background: showResults
                  ? isSelected
                    ? "rgba(230,57,58,0.2)"
                    : "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.08)",
                border: `1px solid ${isSelected ? "rgba(230,57,58,0.4)" : "rgba(255,255,255,0.1)"}`,
                padding: "10px 14px",
              }}
            >
              {showResults && (
                <div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    width: `${pct}%`,
                    background: isSelected
                      ? "rgba(230,57,58,0.18)"
                      : "rgba(255,255,255,0.05)",
                    transition: "width 0.5s ease",
                  }}
                />
              )}
              <div className="relative flex items-center justify-between">
                <span className="text-white text-sm font-medium">{opt.text}</span>
                {showResults && (
                  <span className={`text-xs font-bold ${isSelected ? "text-red-400" : "text-white/50"}`}>
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-white/40">
        <span>{totalWithLocal.toLocaleString()} votes</span>
        {!showResults && (
          <button
            className="text-white/40 hover:text-white/60 underline text-xs"
            onClick={(e) => { e.stopPropagation(); setHasVoted(true); }}
          >
            See results
          </button>
        )}
      </div>

      {/* Polls don't have the standard postId action bar — use d.id for likes/comments */}
      {"id" in d && typeof d.id === "string" && (
        <ActionBar
          postId={d.id}
          likesCount={(d as PostItem).likesCount ?? 0}
          commentsCount={(d as PostItem).commentsCount ?? 0}
          sharesCount={(d as PostItem).sharesCount ?? 0}
          shareTitle={title}
          onComment={onComment}
          onExpand={onExpand}
        />
      )}
    </FeedCard>
  );
}

function PetitionFeedCard({
  item,
  onExpand,
}: {
  item: FeedItem & { type: "petition" };
  onExpand: () => void;
}) {
  const p = item.data;
  const { user } = useAuth();
  const { toast } = useToast();
  const [signed, setSigned] = useState(false);

  const progress = p.targetSignatures
    ? Math.min(100, Math.round(((p.currentSignatures ?? 0) / p.targetSignatures) * 100))
    : 0;

  const signMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/petitions/${p.id}/sign`, {}),
    onSuccess: () => {
      setSigned(true);
      toast({ title: "Signed!", description: "Your signature has been recorded." });
      queryClient.invalidateQueries({ queryKey: ["/api/petitions"] });
    },
    onError: (e: any) => {
      const msg = e?.message?.includes("already")
        ? "You've already signed this petition."
        : "Could not sign — please try again.";
      toast({ title: msg, variant: "destructive" });
    },
  });

  return (
    <FeedCard>
      <div className="flex items-center gap-2 mb-3">
        <span className="type-tag petition text-[10px] px-2 py-0.5 rounded-full">Petition</span>
        {p.isActive && (
          <span className="flex items-center gap-1 text-green-400 text-xs">
            <CheckCircle className="w-3 h-3" />
            Official
          </span>
        )}
      </div>

      <div className="cursor-pointer" onClick={onExpand}>
        <h3 className="text-white font-semibold text-base leading-snug mb-2">{p.title}</h3>
        {p.objective && (
          <p className="text-white/60 text-sm line-clamp-3 mb-4">{p.objective}</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-white/50 mb-1.5">
          <span><span className="text-white font-semibold">{(p.currentSignatures ?? 0).toLocaleString()}</span> signed</span>
          <span>Goal: {(p.targetSignatures ?? 0).toLocaleString()}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #E6393A, #3b82f6)",
            }}
          />
        </div>
        <p className="text-white/40 text-xs mt-1">{progress}% of goal</p>
      </div>

      {/* Sign button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!user) { toast({ title: "Sign in to sign petitions" }); return; }
          if (signed || signMutation.isPending) return;
          signMutation.mutate();
        }}
        disabled={signed || signMutation.isPending}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
        style={
          signed
            ? { background: "rgba(74,222,128,0.2)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }
            : { background: "rgba(230,57,58,0.2)", color: "#fff", border: "1px solid rgba(230,57,58,0.4)" }
        }
      >
        {signed ? "✓ Signed" : signMutation.isPending ? "Signing…" : "✍ Sign Petition"}
      </button>
    </FeedCard>
  );
}

function EventFeedCard({
  item,
  onExpand,
}: {
  item: FeedItem & { type: "event" };
  onExpand: () => void;
}) {
  const post = item.data;
  const ev = item.event;
  const startDate = ev?.startDate ? new Date(ev.startDate) : null;
  const isUpcoming = startDate && startDate > new Date();
  const isVirtual = ev?.isVirtual || !!ev?.virtualLink;

  return (
    <FeedCard onClick={onExpand} className="cursor-pointer overflow-hidden">
      {/* Background image */}
      {ev?.image && (
        <div className="absolute inset-0 z-0">
          <img src={ev.image} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.4))" }} />
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="type-tag event text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Event
          </span>
          {isVirtual && (
            <span className="type-tag virtual text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
              <Video className="w-3 h-3" /> Virtual
            </span>
          )}
        </div>

        <h3 className="text-white font-bold text-base leading-snug mb-3">
          {ev?.title || post.content.slice(0, 80)}
        </h3>

        {startDate && (
          <div className="flex items-center gap-2 text-white/70 text-sm mb-1.5">
            <Calendar className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{format(startDate, "EEE, MMM d")} · {format(startDate, "h:mm a")}</span>
          </div>
        )}

        {ev?.location && (
          <div className="flex items-center gap-2 text-white/60 text-sm mb-1.5">
            <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="truncate">{ev.location}</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1.5 text-white/50 text-xs">
            <Users className="w-3.5 h-3.5" />
            <span>{ev?.currentAttendees ?? 0}{ev?.maxAttendees ? ` / ${ev.maxAttendees}` : ""} attending</span>
          </div>
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(230,57,58,0.25)", color: "#fff", border: "1px solid rgba(230,57,58,0.35)" }}
          >
            {isUpcoming ? "RSVP" : "View"} →
          </span>
        </div>
      </div>
    </FeedCard>
  );
}

function AnnouncementFeedCard({
  item,
  onExpand,
  onComment,
}: {
  item: FeedItem & { type: "announcement" };
  onExpand: () => void;
  onComment: () => void;
}) {
  const d = item.data;
  const timeAgo = d.createdAt
    ? formatDistanceToNow(new Date(d.createdAt), { addSuffix: false }) + " ago"
    : "";

  return (
    <FeedCard className="border-l-4 border-red-500 overflow-visible">
      <div className="flex items-center gap-2 mb-3">
        <span className="type-tag announcement text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
          <Megaphone className="w-3 h-3" /> Official
        </span>
        <span className="text-white/40 text-xs">{timeAgo}</span>
      </div>

      <div className="cursor-pointer" onClick={onExpand}>
        {d.title && <h3 className="text-white font-bold text-base mb-2">{d.title}</h3>}
        <p className="text-white/90 text-sm leading-relaxed line-clamp-5">{d.content}</p>
        {d.url && (
          <a
            href={sanitizeUrl(d.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-400 text-xs mt-3 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            Learn more
          </a>
        )}
      </div>

      <ActionBar
        postId={d.id}
        likesCount={d.likesCount ?? 0}
        commentsCount={d.commentsCount ?? 0}
        sharesCount={d.sharesCount ?? 0}
        shareTitle={d.title || d.content.slice(0, 80)}
        onComment={onComment}
        onExpand={onExpand}
      />
    </FeedCard>
  );
}

function BlogFeedCard({
  item,
  onExpand,
  onComment,
}: {
  item: FeedItem & { type: "blog" };
  onExpand: () => void;
  onComment: () => void;
}) {
  const d = item.data;
  return (
    <FeedCard>
      {d.featuredImage && (
        <div className="h-52 -mx-4 -mt-4 mb-4 overflow-hidden rounded-t-2xl bg-white/5">
          <img src={d.featuredImage} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className="type-tag blog text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
          <BookOpen className="w-3 h-3" /> Article
        </span>
        {d.readingTime && (
          <span className="text-white/40 text-xs">{d.readingTime} min read</span>
        )}
      </div>

      <div className="cursor-pointer" onClick={onExpand}>
        <h3 className="text-white font-bold text-base leading-snug mb-2">
          {d.title || "Untitled Article"}
        </h3>
        <p className="text-white/60 text-sm line-clamp-3">
          {d.excerpt || d.content}
        </p>
      </div>

      <div className="flex items-center gap-2 mt-3 mb-0">
        <Avatar author={d.author} size={6} />
        <span className="text-white/50 text-xs">{displayName(d.author)}</span>
      </div>

      <ActionBar
        postId={d.id}
        likesCount={d.likesCount ?? 0}
        commentsCount={d.commentsCount ?? 0}
        sharesCount={d.sharesCount ?? 0}
        shareTitle={d.title || "ACP Article"}
        onComment={onComment}
        onExpand={onExpand}
      />
    </FeedCard>
  );
}

// ─── Approval prompt (re-used from MobileFeedPage) ─────────────────────────

function MobileApprovalPrompt() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [voted, setVoted] = useState<Record<string, { vote: string; approvalPct: number; total: number }>>({});

  const { data: prompts = [] } = useQuery<
    Array<{ id: string; fullName: string; party: string | null; photoUrl: string | null; office: string | null }>
  >({
    queryKey: ["/api/approval/feed-prompts"],
    enabled: !!user,
  });

  const voteMutation = useMutation({
    mutationFn: async ({ id, vote }: { id: string; vote: string }) => {
      const res = await apiRequest("POST", "/api/approval/vote", { politicianProfileId: id, vote });
      return res.json();
    },
    onSuccess: (data, variables) => {
      setVoted((prev) => ({
        ...prev,
        [variables.id]: { vote: data.userVote, approvalPct: data.stats.approvalPct, total: data.stats.total },
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/approval/feed-prompts"] });
    },
    onError: () => toast({ title: "Could not submit vote", variant: "destructive" }),
  });

  const visible = prompts.filter((p) => !dismissed.has(p.id));
  if (!user || visible.length === 0) return null;

  return (
    <div className="glass-card p-4" style={{ height: "auto" }}>
      <p className="text-white/80 text-sm font-semibold mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
        Community Approval Ratings
      </p>
      <div className="space-y-2.5">
        {visible.map((p) => {
          const result = voted[p.id];
          const initials = p.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
          if (result) {
            return (
              <div key={p.id} className="flex items-center gap-2.5 rounded-xl p-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="w-9 h-9 rounded-full overflow-hidden bg-white/20 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">
                  {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{p.fullName}</p>
                  <div className="flex h-1.5 rounded-full overflow-hidden mt-1" style={{ background: "rgba(255,255,255,0.15)" }}>
                    <div className="bg-green-400 transition-all duration-500" style={{ width: `${result.approvalPct}%` }} />
                    <div className="bg-red-400 transition-all duration-500" style={{ width: `${100 - result.approvalPct}%` }} />
                  </div>
                </div>
                <span className="text-green-400 text-xs font-bold">{result.approvalPct}%</span>
              </div>
            );
          }
          return (
            <div key={p.id} className="flex items-center gap-2.5 rounded-xl p-2" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="w-9 h-9 rounded-full overflow-hidden bg-white/20 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">
                {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{p.fullName}</p>
                <p className="text-white/40 text-[11px]">{p.office || "Politician"}</p>
              </div>
              <button onClick={() => voteMutation.mutate({ id: p.id, vote: "approve" })} className="text-green-400 p-1.5 active:scale-90 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
              </button>
              <button onClick={() => voteMutation.mutate({ id: p.id, vote: "disapprove" })} className="text-red-400 p-1.5 active:scale-90 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>
              </button>
              <button onClick={() => setDismissed((prev) => new Set(Array.from(prev).concat(p.id)))} className="text-white/30 p-1.5 active:scale-90 transition-transform">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Loading skeleton ───────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card p-4 animate-pulse" style={{ height: "auto" }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-full bg-white/10" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-white/10 rounded w-1/3" />
              <div className="h-2 bg-white/10 rounded w-1/4" />
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-3 bg-white/10 rounded w-full" />
            <div className="h-3 bg-white/10 rounded w-4/5" />
            <div className="h-3 bg-white/10 rounded w-3/4" />
          </div>
          <div className="h-32 bg-white/5 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ─── Error state ────────────────────────────────────────────────────────────

function FeedError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <span className="text-4xl mb-4">⚠️</span>
      <p className="text-white font-semibold mb-1">Couldn't load Feed</p>
      <p className="text-white/50 text-sm mb-6">Check your connection and try again.</p>
      <button
        onClick={onRetry}
        className="px-6 py-2.5 rounded-full text-sm font-semibold"
        style={{ background: "rgba(230,57,58,0.2)", color: "#fff", border: "1px solid rgba(230,57,58,0.4)" }}
      >
        Retry
      </button>
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

function FeedEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <span className="text-5xl mb-4">📰</span>
      <p className="text-white font-semibold mb-1">Nothing here yet</p>
      <p className="text-white/50 text-sm">Be the first to post something or check back later!</p>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function MobileFeedContent() {
  const [expandedItem, setExpandedItem] = useState<FeedItem | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

  const {
    data: feedPosts = [], isLoading: postsLoading, isError: postsError, refetch: refetchPosts,
  } = useQuery<PostItem[]>({
    queryKey: ["/api/feeds/all"],
    staleTime: 30000,
  });

  const {
    data: polls = [], isLoading: pollsLoading,
  } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
    staleTime: 30000,
  });

  const {
    data: petitions = [], isLoading: petitionsLoading,
  } = useQuery<Petition[]>({
    queryKey: ["/api/petitions"],
    staleTime: 60000,
  });

  const isLoading = postsLoading || pollsLoading || petitionsLoading;
  const isError = postsError;

  const refetch = useCallback(() => {
    refetchPosts();
    queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
    queryClient.invalidateQueries({ queryKey: ["/api/petitions"] });
  }, [refetchPosts]);

  // Build unified sorted item list (same logic as MobileFeedPage)
  const postPollIds = new Set(feedPosts.filter((p) => p.pollId).map((p) => p.pollId));

  const allItems: FeedItem[] = [
    ...feedPosts.map((p): FeedItem => {
      if (p.type === "poll" && p.pollId)        return { type: "poll",         data: p };
      if (p.type === "announcement")            return { type: "announcement", data: p };
      if (p.type === "event" && p.eventId)      return { type: "event",        data: p };
      if (p.type === "blog" || p.articleBody)   return { type: "blog",         data: p };
      if (p.type === "news" || p.url || p.linkPreview) return { type: "news", data: p };
      return { type: "post", data: p };
    }),
    ...polls
      .filter((p) => !postPollIds.has(p.id))
      .map((p): FeedItem => ({ type: "poll", data: p })),
    ...petitions.map((p): FeedItem => ({ type: "petition", data: p })),
  ].sort((a, b) => {
    const da = "createdAt" in a.data && a.data.createdAt ? new Date(a.data.createdAt as string).getTime() : 0;
    const db = "createdAt" in b.data && b.data.createdAt ? new Date(b.data.createdAt as string).getTime() : 0;
    return db - da;
  });

  const handleExpand = useCallback((item: FeedItem) => setExpandedItem(item), []);
  const handleComment = useCallback((id: string) => setCommentsPostId(id), []);

  const renderItem = (item: FeedItem, index: number) => {
    const key = `${item.type}-${item.data.id}`;
    const postId = "id" in item.data ? item.data.id : "";

    let card: React.ReactNode = null;

    switch (item.type) {
      case "post":
        card = (
          <PostFeedCard
            key={key}
            item={item}
            onExpand={() => handleExpand(item)}
            onComment={() => handleComment(postId)}
          />
        );
        break;
      case "news":
        card = (
          <NewsFeedCard
            key={key}
            item={item}
            onExpand={() => handleExpand(item)}
            onComment={() => handleComment(postId)}
          />
        );
        break;
      case "poll":
        card = (
          <PollFeedCard
            key={key}
            item={item}
            onExpand={() => handleExpand(item)}
            onComment={() => handleComment(postId)}
          />
        );
        break;
      case "petition":
        card = (
          <PetitionFeedCard
            key={key}
            item={item}
            onExpand={() => handleExpand(item)}
          />
        );
        break;
      case "event":
        card = (
          <EventFeedCard
            key={key}
            item={item}
            onExpand={() => handleExpand(item)}
          />
        );
        break;
      case "announcement":
        card = (
          <AnnouncementFeedCard
            key={key}
            item={item}
            onExpand={() => handleExpand(item)}
            onComment={() => handleComment(postId)}
          />
        );
        break;
      case "blog":
        card = (
          <BlogFeedCard
            key={key}
            item={item}
            onExpand={() => handleExpand(item)}
            onComment={() => handleComment(postId)}
          />
        );
        break;
    }

    if (!card) return null;

    return (
      <div key={key}>
        {/* Inject approval prompt every 8 posts */}
        {index > 0 && index % 8 === 0 && <MobileApprovalPrompt />}
        {card}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-3 pt-2 pb-28 px-4">
        <FriendSuggestionsWidget />

        {isLoading && <FeedSkeleton />}
        {!isLoading && isError && <FeedError onRetry={refetch} />}
        {!isLoading && !isError && allItems.length === 0 && <FeedEmpty />}
        {!isLoading && !isError && allItems.length > 0 && (
          allItems.map((item, index) => renderItem(item, index))
        )}
      </div>

      {/* Detail modal (drag-to-close, covers all types) */}
      {expandedItem && (
        <ExpandedCardView
          item={expandedItem}
          onClose={() => setExpandedItem(null)}
        />
      )}

      {/* Comment sheet */}
      {commentsPostId && (
        <PostCommentsOverlay
          postId={commentsPostId}
          onClose={() => setCommentsPostId(null)}
        />
      )}
    </>
  );
}
