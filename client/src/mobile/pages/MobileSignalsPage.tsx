import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Heart, MessageCircle, Flag } from "lucide-react";
import { useScrollLight } from "../hooks/useScrollLight";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { MobileSignalFeed } from "../components/MobileSignalFeed";
import { SignalCard } from "../components/cards/SignalCard";
import { FriendSuggestionsWidget } from "../components/FriendSuggestionsWidget";
import { PostCommentsOverlay } from "../components/PostCommentsOverlay";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { SignalWithAuthor } from "@shared/schema";
import "../mobile-theme.css";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PostItem {
  id: string;
  type: string;
  content: string;
  title?: string | null;
  image?: string | null;
  url?: string | null;
  newsSourceName?: string | null;
  linkPreview?: { image?: string; title?: string } | null;
  likesCount?: number;
  commentsCount?: number;
  createdAt?: string | null;
  author?: { username: string; firstName?: string | null; lastName?: string | null; avatar?: string | null };
}

function authorName(a?: PostItem["author"]) {
  if (!a) return "Anonymous";
  return a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : a.username;
}

function PostAvatar({ author }: { author?: PostItem["author"] }) {
  const name = authorName(author);
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-blue-500 overflow-hidden flex-shrink-0">
      {author?.avatar
        ? <img src={author.avatar} alt="" className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
            {name.charAt(0).toUpperCase()}
          </div>}
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
  });

  const liked = likeStatus?.liked ?? false;
  return (
    <div className="flex items-center gap-6 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <button onClick={(e) => { e.stopPropagation(); if (!user) { toast({ title: "Log in required" }); return; } likeMutation.mutate(); }} className="flex items-center gap-1.5 text-white/50 active:scale-110 transition-transform">
        <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
        <span className="text-xs">{post.likesCount ?? 0}</span>
      </button>
      <button onClick={(e) => { e.stopPropagation(); onOpenComments(); }} className="flex items-center gap-1.5 text-white/50 active:scale-110 transition-transform">
        <MessageCircle className="w-4 h-4" />
        <span className="text-xs">{post.commentsCount ?? 0}</span>
      </button>
      <button onClick={(e) => { e.stopPropagation(); if (!user) { toast({ title: "Log in required" }); return; } if (flagged || flagMutation.isPending) return; flagMutation.mutate(); }} className="flex items-center gap-1.5 text-white/50 active:scale-110 transition-transform ml-auto">
        <Flag className={`w-4 h-4 ${flagged ? "fill-orange-400 text-orange-400" : ""}`} />
      </button>
    </div>
  );
}

function FeedPostCard({ post, onOpenComments }: { post: PostItem; onOpenComments: (id: string) => void }) {
  const thumb = post.linkPreview?.image || post.image;
  const isNews = post.type === "news" || post.url || post.linkPreview;
  return (
    <div className="glass-card p-4 cursor-pointer" style={{ height: "auto" }} onClick={() => onOpenComments(post.id)}>
      {!isNews && (
        <div className="flex items-center gap-2 mb-2">
          <PostAvatar author={post.author} />
          <span className="text-white/70 text-sm">{authorName(post.author)}</span>
        </div>
      )}
      {thumb && (
        <div className="h-40 rounded-xl overflow-hidden mb-3 bg-white/5">
          <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      {isNews && (
        <span className="type-tag news text-[10px] px-1.5 py-0.5 mb-2 inline-block">News</span>
      )}
      {(post.title || post.linkPreview?.title) && isNews ? (
        <h4 className="text-white font-semibold text-sm line-clamp-3">{post.title || post.linkPreview?.title}</h4>
      ) : (
        <p className="text-white text-sm line-clamp-4">{post.content}</p>
      )}
      {post.newsSourceName && <p className="text-white/40 text-xs mt-2">{post.newsSourceName}</p>}
      <PostActionBar post={post} onOpenComments={() => onOpenComments(post.id)} />
    </div>
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

// ─── Discover (grid) sub-view inside the Signals segment ─────────────────────
function SignalDiscoverGrid() {
  const { data: signals = [], isLoading } = useQuery<SignalWithAuthor[]>({
    queryKey: ["/api/mobile/signals"],
    staleTime: 60000,
  });

  return (
    <>
      <FriendSuggestionsWidget />
      <div className="feed-grid pb-24">
        {isLoading
          ? [1,2,3,4,5,6].map((i) => (
              <div key={i} className="glass-card aspect-[9/16] animate-pulse">
                <div className="w-full h-full bg-white/10 rounded-xl" />
              </div>
            ))
          : signals.length === 0
            ? <div className="col-span-2 flex flex-col items-center justify-center py-20 text-center">
                <span className="text-5xl mb-4">📹</span>
                <p className="text-white/50 text-sm">No Signals yet — be the first!</p>
              </div>
            : signals.map((s) => <SignalCard key={s.id} signal={s} />)
        }
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
type Segment = "signals" | "feed";
type SignalView = "player" | "grid";

export function MobileSignalsPage() {
  useScrollLight();
  const [segment,      setSegment]      = useState<Segment>("signals");
  const [signalView,   setSignalView]   = useState<SignalView>("player");
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

  const { data: feedPosts = [], isLoading: postsLoading } = useQuery<PostItem[]>({
    queryKey: ["/api/feeds/all"],
    staleTime: 30000,
    enabled: segment === "feed",
  });

  // ── When Signals segment is active and view is "player", render the
  //    full-screen snap feed (covers entire screen, bottom nav floats above).
  // ── When "grid" view is requested, fall back to the scrollable grid.
  // ── When Feed segment is active, render standard scrollable cards.

  const isFullscreenFeed = segment === "signals" && signalView === "player";

  return (
    <>
      {/* ── Full-screen TikTok feed ─────────────────────────────────────────
           Renders outside the normal flow so it fills the entire viewport.
           The bottom nav (z-100) sits on top automatically.          ──── */}
      {isFullscreenFeed && (
        <MobileSignalFeed onGridClick={() => setSignalView("grid")} />
      )}

      {/* ── Scrollable page (Grid view or Feed segment) ─────────────────── */}
      {!isFullscreenFeed && (
        <div className="mobile-root" data-testid="mobile-signals-page">

          {/* Top bar — only shown in scrollable mode */}
          <div className="glass-top-bar">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="logo-container">
                  <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
                    <circle cx="16" cy="16" r="14" fill="#E6393A" />
                    <text x="16" y="21" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">ACP</text>
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
              {(["signals", "feed"] as Segment[]).map((seg) => (
                <button
                  key={seg}
                  onClick={() => {
                    setSegment(seg);
                    if (seg === "signals") setSignalView("player");
                  }}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={
                    segment === seg
                      ? { background: "rgba(255,255,255,0.16)", color: "#fff", boxShadow: "0 1px 6px rgba(0,0,0,0.25)" }
                      : { color: "rgba(255,255,255,0.42)" }
                  }
                >
                  {seg === "signals" ? "Signals" : "Feed"}
                </button>
              ))}
            </div>

            {/* Sub-nav inside Signals segment: For You | Discover */}
            {segment === "signals" && (
              <div className="flex gap-2 mt-2">
                {(["player", "grid"] as SignalView[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setSignalView(v)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                    style={
                      signalView === v
                        ? { background: "rgba(230,57,58,0.3)", color: "#fff", border: "1px solid rgba(230,57,58,0.5)" }
                        : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }
                    }
                  >
                    {v === "player" ? "▶ For You" : "⊞ Discover"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Signals — Grid / Discover */}
          {segment === "signals" && signalView === "grid" && <SignalDiscoverGrid />}

          {/* Feed — full-width post list */}
          {segment === "feed" && (
            <div className="flex flex-col gap-3 px-4 pt-2 pb-24">
              {postsLoading
                ? <SkeletonList />
                : feedPosts.length === 0
                  ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                      <span className="text-5xl mb-4">📰</span>
                      <p className="text-white/50 text-sm">No posts yet — be the first!</p>
                    </div>
                  )
                  : feedPosts.map((p) => (
                      <FeedPostCard key={p.id} post={p} onOpenComments={setCommentsPostId} />
                    ))
              }
            </div>
          )}

          {commentsPostId && (
            <PostCommentsOverlay
              postId={commentsPostId}
              onClose={() => setCommentsPostId(null)}
            />
          )}
        </div>
      )}

      {/* Bottom nav always visible — z-100 sits above the full-screen feed */}
      <MobileBottomNav />
    </>
  );
}
