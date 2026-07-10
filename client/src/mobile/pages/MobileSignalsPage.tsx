import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Heart, MessageCircle, Flag } from "lucide-react";
import { useScrollLight } from "../hooks/useScrollLight";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { SignalCard } from "../components/cards/SignalCard";
import { FriendSuggestionsWidget } from "../components/FriendSuggestionsWidget";
import { PostCommentsOverlay } from "../components/PostCommentsOverlay";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { SignalWithAuthor, Poll, Petition } from "@shared/schema";
import "../mobile-theme.css";

interface PostItem {
  id: string;
  type: string;
  content: string;
  title?: string | null;
  image?: string | null;
  url?: string | null;
  newsSourceName?: string | null;
  linkPreview?: { image?: string; title?: string } | null;
  eventId?: string | null;
  articleBody?: string | null;
  pollId?: string | null;
  targetSignatures?: number | null;
  currentSignatures?: number | null;
  likesCount?: number;
  commentsCount?: number;
  createdAt?: string | null;
  author?: {
    username: string;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  };
}

function authorName(author?: PostItem["author"]) {
  if (!author) return "Anonymous";
  return author.firstName && author.lastName
    ? `${author.firstName} ${author.lastName}`
    : author.username;
}

function Avatar({ author }: { author?: PostItem["author"] }) {
  const name = authorName(author);
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-blue-500 overflow-hidden flex-shrink-0">
      {author?.avatar
        ? <img src={author.avatar} alt="" className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
            {name.charAt(0).toUpperCase()}
          </div>
      }
    </div>
  );
}

function PostActionBar({ post, onOpenComments }: { post: PostItem; onOpenComments: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [flagged, setFlagged] = useState(false);

  const { data: likeStatus } = useQuery<{ liked: boolean }>({
    queryKey: ["/api/likes", post.id, "post"],
    queryFn: async () => {
      const res = await fetch(`/api/likes/${post.id}/post`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/likes", "POST", { targetId: post.id, targetType: "post" });
      return res.json();
    },
    onSuccess: (data: { liked: boolean }) => {
      queryClient.setQueryData(["/api/likes", post.id, "post"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/all"] });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/flags", "POST", { targetId: post.id, targetType: "post", reason: "inappropriate_content" });
      return res.json();
    },
    onSuccess: () => {
      setFlagged(true);
      toast({ title: "Reported", description: "Thanks — a moderator will review this post." });
    },
    onError: () => {
      toast({ title: "Could not report", description: "Please try again.", variant: "destructive" });
    },
  });

  const liked = likeStatus?.liked ?? false;

  return (
    <div className="flex items-center gap-6 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!user) { toast({ title: "Log in required" }); return; }
          likeMutation.mutate();
        }}
        className="flex items-center gap-1.5 text-white/50 active:scale-110 transition-transform"
        data-testid={`button-like-post-${post.id}`}
      >
        <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
        <span className="text-xs">{post.likesCount ?? 0}</span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onOpenComments(); }}
        className="flex items-center gap-1.5 text-white/50 active:scale-110 transition-transform"
        data-testid={`button-comment-post-${post.id}`}
      >
        <MessageCircle className="w-4 h-4" />
        <span className="text-xs">{post.commentsCount ?? 0}</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!user) { toast({ title: "Log in required" }); return; }
          if (flagged || flagMutation.isPending) return;
          flagMutation.mutate();
        }}
        className="flex items-center gap-1.5 text-white/50 active:scale-110 transition-transform ml-auto"
        data-testid={`button-flag-post-${post.id}`}
      >
        <Flag className={`w-4 h-4 ${flagged ? "fill-orange-400 text-orange-400" : ""}`} />
      </button>
    </div>
  );
}

function PostCard({ post, onOpenComments }: { post: PostItem; onOpenComments: (postId: string) => void }) {
  return (
    <div
      className="glass-card p-4 cursor-pointer"
      style={{ height: "auto" }}
      onClick={() => onOpenComments(post.id)}
    >
      <div className="flex items-center gap-2 mb-2">
        <Avatar author={post.author} />
        <span className="text-white/70 text-sm">{authorName(post.author)}</span>
      </div>
      {post.image && (
        <div className="h-40 rounded-xl overflow-hidden mb-3 bg-white/5">
          <img src={post.image} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <p className="text-white text-sm line-clamp-4">{post.content}</p>
      <PostActionBar post={post} onOpenComments={() => onOpenComments(post.id)} />
    </div>
  );
}

function NewsCard({ post, onOpenComments }: { post: PostItem; onOpenComments: (postId: string) => void }) {
  const thumb = post.linkPreview?.image || post.image;
  const headline = post.title || post.linkPreview?.title || "Article";
  return (
    <div
      className="glass-card p-4 cursor-pointer"
      style={{ height: "auto" }}
      onClick={() => onOpenComments(post.id)}
    >
      {thumb && (
        <div className="h-36 rounded-xl overflow-hidden mb-3 bg-white/5">
          <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <span className="type-tag news text-[10px] px-1.5 py-0.5 mb-2 inline-block">News</span>
      <h4 className="text-white font-semibold text-sm line-clamp-3">{headline}</h4>
      {post.newsSourceName && (
        <p className="text-white/40 text-xs mt-2">{post.newsSourceName}</p>
      )}
      <PostActionBar post={post} onOpenComments={() => onOpenComments(post.id)} />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="glass-card aspect-[9/16] animate-pulse">
          <div className="w-full h-full bg-white/10 rounded-xl" />
        </div>
      ))}
    </>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3 px-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="glass-card p-4 animate-pulse" style={{ height: "auto" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-white/10" />
            <div className="h-3 bg-white/10 rounded w-1/4" />
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-white/10 rounded w-full" />
            <div className="h-3 bg-white/10 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="text-white/50 text-base mb-1">No {label} yet</p>
      <p className="text-white/30 text-sm">Be the first to post something!</p>
    </div>
  );
}

export function MobileSignalsPage() {
  useScrollLight();
  const [segment, setSegment] = useState<"signals" | "feed">("signals");
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

  const { data: signals = [], isLoading: signalsLoading } = useQuery<SignalWithAuthor[]>({
    queryKey: ["/api/mobile/signals"],
    staleTime: 60000,
  });

  const { data: feedPosts = [], isLoading: postsLoading } = useQuery<PostItem[]>({
    queryKey: ["/api/feeds/all"],
    staleTime: 30000,
    enabled: segment === "feed",
  });

  const feedItems = feedPosts.filter(
    (p) => p.type !== "event" || !p.eventId
  );

  return (
    <div className="mobile-root" data-testid="mobile-signals-page">

      {/* Top bar */}
      <div className="glass-top-bar">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="logo-container">
              <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
                <circle cx="16" cy="16" r="14" fill="#E6393A" />
                <text x="16" y="21" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">ACP</text>
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">ACP</span>
          </div>
        </div>
      </div>

      {/* Sticky segmented switch */}
      <div
        className="sticky top-0 z-10 px-4 pb-2 pt-1"
        style={{
          background: "linear-gradient(to bottom, rgba(5,11,27,0.95) 80%, transparent)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {(["signals", "feed"] as const).map((seg) => (
            <button
              key={seg}
              onClick={() => setSegment(seg)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={
                segment === seg
                  ? {
                      background: "rgba(255,255,255,0.16)",
                      color: "#fff",
                      boxShadow: "0 1px 6px rgba(0,0,0,0.25)",
                    }
                  : { color: "rgba(255,255,255,0.42)" }
              }
            >
              {seg === "signals" ? "Signals" : "Feed"}
            </button>
          ))}
        </div>
      </div>

      {/* Signals — 2-column grid */}
      {segment === "signals" && (
        <>
          <FriendSuggestionsWidget />
          <div className="feed-grid pb-20">
            {signalsLoading
              ? <SkeletonGrid />
              : signals.length === 0
                ? <div className="col-span-2"><EmptyState label="Signals" /></div>
                : signals.map((s) => <SignalCard key={s.id} signal={s} />)
            }
          </div>
        </>
      )}

      {/* Feed — full-width list */}
      {segment === "feed" && (
        <div className="flex flex-col gap-3 px-4 pt-2 pb-24">
          {postsLoading
            ? <SkeletonList />
            : feedItems.length === 0
              ? <EmptyState label="posts" />
              : feedItems.map((p) =>
                  p.type === "news" || p.url || p.linkPreview
                    ? <NewsCard key={p.id} post={p} onOpenComments={setCommentsPostId} />
                    : <PostCard key={p.id} post={p} onOpenComments={setCommentsPostId} />
                )
          }
        </div>
      )}

      {commentsPostId && (
        <PostCommentsOverlay postId={commentsPostId} onClose={() => setCommentsPostId(null)} />
      )}

      <MobileBottomNav />
    </div>
  );
}
