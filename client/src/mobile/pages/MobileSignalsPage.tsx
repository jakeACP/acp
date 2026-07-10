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

const TABS = [
  { id: "signals",   label: "Signals"   },
  { id: "posts",     label: "News Feed" },
  { id: "polls",     label: "Polls"     },
  { id: "news",      label: "News"      },
  { id: "events",    label: "Events"    },
  { id: "petitions", label: "Petitions" },
];

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
          if (!user) {
            toast({ title: "Log in required", description: "Log in to like posts." });
            return;
          }
          likeMutation.mutate();
        }}
        className="flex items-center gap-1.5 text-white/50 active:scale-110 transition-transform"
        data-testid={`button-like-post-${post.id}`}
      >
        <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
        <span className="text-xs">{post.likesCount ?? 0}</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenComments();
        }}
        className="flex items-center gap-1.5 text-white/50 active:scale-110 transition-transform"
        data-testid={`button-comment-post-${post.id}`}
      >
        <MessageCircle className="w-4 h-4" />
        <span className="text-xs">{post.commentsCount ?? 0}</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!user) {
            toast({ title: "Log in required", description: "Log in to report posts." });
            return;
          }
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

function PollCard({ poll }: { poll: Poll }) {
  const options = (poll as any).options ?? [];
  const total = (poll as any).totalVotes ?? 0;
  return (
    <div className="glass-card p-4" style={{ height: "auto" }}>
      <span className="type-tag poll text-[10px] px-1.5 py-0.5 mb-2 inline-block">Poll</span>
      <h4 className="text-white font-semibold text-sm mb-3">{(poll as any).title ?? "Poll"}</h4>
      <div className="space-y-2">
        {options.slice(0, 3).map((opt: any, i: number) => (
          <div key={opt.id ?? i} className="bg-white/5 rounded-lg px-3 py-2 text-white/70 text-sm truncate">
            {opt.text}
          </div>
        ))}
      </div>
      <p className="text-white/40 text-xs mt-3">{total} votes</p>
    </div>
  );
}

function EventCard({ post }: { post: PostItem }) {
  return (
    <div className="glass-card p-4" style={{ height: "auto" }}>
      <span className="type-tag event text-[10px] px-1.5 py-0.5 mb-2 inline-block">Event</span>
      <h4 className="text-white font-semibold text-sm line-clamp-2">{post.title || post.content.slice(0, 80)}</h4>
    </div>
  );
}

function PetitionCard({ petition }: { petition: Petition }) {
  const target = (petition as any).targetSignatures ?? 0;
  const current = (petition as any).currentSignatures ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="glass-card p-4" style={{ height: "auto" }}>
      <span className="type-tag petition text-[10px] px-1.5 py-0.5 mb-2 inline-block">Petition</span>
      <h4 className="text-white font-semibold text-sm line-clamp-2 mb-3">{(petition as any).title}</h4>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
        <div className="h-full bg-gradient-to-r from-red-500 to-blue-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-white/40 text-xs">{current.toLocaleString()} / {target.toLocaleString()} signatures</p>
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
  const [activeTab, setActiveTab] = useState<string>("signals");
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

  const { data: signals = [], isLoading: signalsLoading } = useQuery<SignalWithAuthor[]>({
    queryKey: ["/api/mobile/signals"],
    staleTime: 60000,
  });

  const { data: feedPosts = [], isLoading: postsLoading } = useQuery<PostItem[]>({
    queryKey: ["/api/feeds/all"],
    staleTime: 30000,
    enabled: activeTab === "posts" || activeTab === "news" || activeTab === "events",
  });

  const { data: polls = [], isLoading: pollsLoading } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
    staleTime: 30000,
    enabled: activeTab === "polls",
  });

  const { data: petitions = [], isLoading: petitionsLoading } = useQuery<Petition[]>({
    queryKey: ["/api/petitions"],
    staleTime: 60000,
    enabled: activeTab === "petitions",
  });

  const posts   = feedPosts.filter((p) =>
    (p.type === "post" && !p.pollId) || p.type === "news" || p.type === "blog" || !!p.articleBody || !!p.url || !!p.linkPreview
  );
  const news    = feedPosts.filter((p) => p.type === "news" || p.url || p.linkPreview);
  const events  = feedPosts.filter((p) => p.type === "event" && p.eventId);

  return (
    <div className="mobile-root" data-testid="mobile-signals-page">

      {/* Tab bar */}
      <div className="filter-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`filter-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Signals — 2-column grid */}
      {activeTab === "signals" && (
        <>
          <FriendSuggestionsWidget />
          <div className="feed-grid pb-20">
            {signalsLoading
              ? [1,2,3,4,5,6].map((i) => (
                  <div key={i} className="glass-card aspect-[9/16] animate-pulse">
                    <div className="w-full h-full bg-white/10 rounded-xl" />
                  </div>
                ))
              : signals.length === 0
                ? <div className="col-span-2"><EmptyState label="Signals" /></div>
                : signals.map((s) => <SignalCard key={s.id} signal={s} />)
            }
          </div>
        </>
      )}

      {/* Posts — full-width list */}
      {activeTab === "posts" && (
        <div className="flex flex-col gap-3 px-4 pt-3 pb-24">
          {postsLoading
            ? <SkeletonList />
            : posts.length === 0
              ? <EmptyState label="News Feed" />
              : posts.map((p) =>
                  (p.type === "news" || (!p.articleBody && (p.url || p.linkPreview)))
                    ? <NewsCard key={p.id} post={p} onOpenComments={setCommentsPostId} />
                    : <PostCard key={p.id} post={p} onOpenComments={setCommentsPostId} />
                )
          }
        </div>
      )}

      {/* Polls */}
      {activeTab === "polls" && (
        <div className="flex flex-col gap-3 px-4 pt-3 pb-24">
          {pollsLoading
            ? <SkeletonList />
            : polls.length === 0
              ? <EmptyState label="Polls" />
              : polls.map((p) => <PollCard key={(p as any).id} poll={p} />)
          }
        </div>
      )}

      {/* News */}
      {activeTab === "news" && (
        <div className="flex flex-col gap-3 px-4 pt-3 pb-24">
          {postsLoading
            ? <SkeletonList />
            : news.length === 0
              ? <EmptyState label="News" />
              : news.map((p) => <NewsCard key={p.id} post={p} onOpenComments={setCommentsPostId} />)
          }
        </div>
      )}

      {/* Events */}
      {activeTab === "events" && (
        <div className="flex flex-col gap-3 px-4 pt-3 pb-24">
          {postsLoading
            ? <SkeletonList />
            : events.length === 0
              ? <EmptyState label="Events" />
              : events.map((p) => <EventCard key={p.id} post={p} />)
          }
        </div>
      )}

      {/* Petitions */}
      {activeTab === "petitions" && (
        <div className="flex flex-col gap-3 px-4 pt-3 pb-24">
          {petitionsLoading
            ? <SkeletonList />
            : petitions.length === 0
              ? <EmptyState label="Petitions" />
              : petitions.map((p) => <PetitionCard key={(p as any).id} petition={p} />)
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
