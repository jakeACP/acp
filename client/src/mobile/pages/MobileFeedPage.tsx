import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useScrollLight } from "../hooks/useScrollLight";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { FilterTabs } from "../components/FilterTabs";
import { ExpandedCardView } from "../components/ExpandedCardView";
import { FriendSuggestionsWidget } from "../components/FriendSuggestionsWidget";
import { LazyYouTubeThumbnail, LazyTikTokThumbnail } from "../components/LazyYouTubeThumbnail";
import { findVideoInPost } from "../utils/youtube";
import type { Poll, Petition, SignalWithAuthor, Event, User } from "@shared/schema";

interface PollWithAuthor extends Poll {
  author?: {
    username: string;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  };
}

interface PostWithAuthor {
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
  articleImages?: { url: string; caption?: string; position?: number }[] | null;
  readingTime?: number | null;
  privacy?: string;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  emojiReactionsCount?: number;
  gifReactionsCount?: number;
  bookmarksCount?: number;
  flagsCount?: number;
  isDeleted?: boolean;
  createdAt?: Date | string | null;
  pollId?: string | null;
  pollTitle?: string | null;
  pollDescription?: string | null;
  pollOptions?: { id: string; text: string; votes: number }[] | null;
  pollVotingType?: string | null;
  pollIsBlockchainVerified?: boolean | null;
  pollTotalVotes?: number | null;
  pollEndDate?: Date | string | null;
  pollIsActive?: boolean | null;
  author?: {
    username: string;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  };
}

type FeedItem = 
  | { type: 'signal'; data: SignalWithAuthor }
  | { type: 'post'; data: PostWithAuthor }
  | { type: 'news'; data: PostWithAuthor }
  | { type: 'poll'; data: PostWithAuthor | PollWithAuthor }
  | { type: 'announcement'; data: PostWithAuthor }
  | { type: 'event'; data: PostWithAuthor; event?: Event }
  | { type: 'petition'; data: Petition }
  | { type: 'blog'; data: PostWithAuthor };

function MobileApprovalPrompt() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [voted, setVoted] = useState<Record<string, { vote: string; approvalPct: number; total: number }>>({});

  const { data: prompts = [] } = useQuery<Array<{ id: string; fullName: string; party: string | null; photoUrl: string | null; office: string | null }>>({
    queryKey: ["/api/approval/feed-prompts"],
    enabled: !!user,
  });

  const voteMutation = useMutation({
    mutationFn: async ({ id, vote }: { id: string; vote: string }) => {
      const res = await apiRequest("POST", "/api/approval/vote", { politicianProfileId: id, vote });
      return res.json();
    },
    onSuccess: (data, variables) => {
      setVoted(prev => ({ ...prev, [variables.id]: { vote: data.userVote, approvalPct: data.stats.approvalPct, total: data.stats.total } }));
      queryClient.invalidateQueries({ queryKey: ["/api/approval/feed-prompts"] });
    },
  });

  const visible = prompts.filter(p => !dismissed.has(p.id));
  if (!user || visible.length === 0) return null;

  return (
    <div className="glass-card p-3 mb-2">
      <p className="text-white/90 text-xs font-semibold mb-2">Community Approval Ratings</p>
      <div className="space-y-2">
        {visible.map(p => {
          const result = voted[p.id];
          const initials = p.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
          if (result) {
            return (
              <div key={p.id} className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {p.photoUrl ? <img src={p.photoUrl} alt={p.fullName} className="w-full h-full rounded-full object-cover" /> : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{p.fullName}</p>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-white/20 mt-1">
                    <div className="bg-green-400 transition-all" style={{ width: `${result.approvalPct}%` }} />
                    <div className="bg-red-400 transition-all" style={{ width: `${100 - result.approvalPct}%` }} />
                  </div>
                </div>
                <span className="text-green-400 text-xs font-semibold">{result.approvalPct}%</span>
              </div>
            );
          }
          return (
            <div key={p.id} className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden">
                {p.photoUrl ? <img src={p.photoUrl} alt={p.fullName} className="w-full h-full object-cover" /> : initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{p.fullName}</p>
                <p className="text-white/50 text-[10px] truncate">Do you approve?</p>
              </div>
              <button onClick={() => voteMutation.mutate({ id: p.id, vote: "approve" })} className="text-green-400 hover:text-green-300 p-1" title="Approve">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
              </button>
              <button onClick={() => voteMutation.mutate({ id: p.id, vote: "disapprove" })} className="text-red-400 hover:text-red-300 p-1" title="Disapprove">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>
              </button>
              <button onClick={() => setDismissed(prev => new Set(Array.from(prev).concat(p.id)))} className="text-white/40 hover:text-white/70 p-1" title="Dismiss">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MobileFeedPage() {
  useScrollLight();
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedItem, setExpandedItem] = useState<FeedItem | null>(null);

  const handleFilterChange = (filter: string) => {
    if (filter === "signals") {
      navigate("/mobile/signals");
    } else {
      setActiveFilter(filter);
    }
  };

  const { data: signals = [], isLoading: signalsLoading } = useQuery<SignalWithAuthor[]>({
    queryKey: ['/api/mobile/signals'],
    staleTime: 60000,
  });

  const { data: feedPosts = [], isLoading: postsLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ['/api/feeds/all'],
    staleTime: 30000,
  });

  const { data: polls = [], isLoading: pollsLoading } = useQuery<Poll[]>({
    queryKey: ['/api/polls'],
    staleTime: 30000,
  });

  const { data: petitions = [], isLoading: petitionsLoading } = useQuery<Petition[]>({
    queryKey: ['/api/petitions'],
    staleTime: 60000,
  });

  const isLoading = signalsLoading || postsLoading || pollsLoading || petitionsLoading;

  const postPollIds = new Set(feedPosts.filter(p => p.pollId).map(p => p.pollId));
  
  const allItems: FeedItem[] = [
    ...signals.map(s => ({ type: 'signal' as const, data: s })),
    ...feedPosts.map(p => {
      if (p.type === 'poll' && p.pollId) {
        return { type: 'poll' as const, data: p };
      }
      if (p.type === 'announcement') {
        return { type: 'announcement' as const, data: p };
      }
      if (p.type === 'event' && p.eventId) {
        return { type: 'event' as const, data: p };
      }
      if (p.type === 'blog' || p.articleBody) {
        return { type: 'blog' as const, data: p };
      }
      if (p.type === 'news' || p.url || p.linkPreview) {
        return { type: 'news' as const, data: p };
      }
      return { type: 'post' as const, data: p };
    }),
    ...polls
      .filter(p => !postPollIds.has(p.id))
      .map(p => ({ type: 'poll' as const, data: p as PollWithAuthor })),
    ...petitions.map(p => ({ type: 'petition' as const, data: p })),
  ].sort((a, b) => {
    const dateA = 'createdAt' in a.data && a.data.createdAt ? new Date(a.data.createdAt as string).getTime() : 0;
    const dateB = 'createdAt' in b.data && b.data.createdAt ? new Date(b.data.createdAt as string).getTime() : 0;
    return dateB - dateA;
  });

  const filteredItems = activeFilter === "all" 
    ? allItems 
    : allItems.filter(item => {
        if (activeFilter === "signals") return item.type === "signal";
        if (activeFilter === "news") return item.type === "news";
        if (activeFilter === "polls") return item.type === "poll";
        if (activeFilter === "petitions") return item.type === "petition";
        if (activeFilter === "events") return item.type === "event";
        if (activeFilter === "news-feed") return item.type === "post" || item.type === "news" || item.type === "blog";
        if (activeFilter === "blogs") return item.type === "blog";
        return true;
      });

  const displayItems = filteredItems.slice(0, 30);

  const getCardPreview = (item: FeedItem) => {
    const author = 'author' in item.data ? item.data.author : null;
    const displayName = author?.firstName && author?.lastName
      ? `${author.firstName} ${author.lastName}`
      : author?.username || 'Anonymous';

    switch (item.type) {
      case 'signal':
        return (
          <div className="h-full flex flex-col justify-center relative">
            {item.data.thumbnailUrl ? (
              <img 
                src={item.data.thumbnailUrl} 
                alt={item.data.title || 'Video'} 
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <div className="w-0 h-0 border-l-[12px] border-l-white border-y-[8px] border-y-transparent ml-1" />
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-blue-500 overflow-hidden flex-shrink-0 border border-white/30">
                {author?.avatar ? (
                  <img src={author.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-white text-xs font-medium truncate drop-shadow-lg">{displayName}</span>
            </div>
          </div>
        );
      case 'post':
        const postVideo = findVideoInPost(item.data);
        if (postVideo) {
          return (
            <div className="h-full flex flex-col justify-center relative">
              {postVideo.platform === 'youtube' ? (
                <LazyYouTubeThumbnail 
                  videoId={postVideo.videoId} 
                  className="w-full h-full rounded-lg"
                  quality="hqdefault"
                />
              ) : (
                <LazyTikTokThumbnail 
                  videoId={postVideo.videoId}
                  tiktokUrl={postVideo.originalUrl}
                  className="w-full h-full rounded-lg"
                />
              )}
              <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-blue-500 overflow-hidden flex-shrink-0 border border-white/30">
                  {author?.avatar ? (
                    <img src={author.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-white text-xs font-medium truncate drop-shadow-lg">{displayName}</span>
              </div>
            </div>
          );
        }
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-blue-500 overflow-hidden flex-shrink-0">
                {author?.avatar ? (
                  <img src={author.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-white/70 text-xs truncate">{displayName}</span>
            </div>
            <p className="text-white text-sm line-clamp-4 flex-1">{item.data.content}</p>
            {item.data.image && (
              <div className="mt-2 h-16 rounded-lg overflow-hidden bg-white/10">
                <img src={item.data.image} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}
          </div>
        );
      case 'news':
        const thumbnailUrl = item.data.linkPreview?.image || item.data.image;
        return (
          <div className="h-full flex flex-col">
            <span className="type-tag news mb-2 w-fit">News</span>
            {thumbnailUrl && (
              <div className="h-16 rounded-lg overflow-hidden mb-2 bg-white/10">
                <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <h4 className="text-white font-semibold text-sm line-clamp-2">{item.data.title || item.data.linkPreview?.title || 'Article'}</h4>
            <p className="text-white/50 text-xs mt-auto">{item.data.newsSourceName || 'News'}</p>
          </div>
        );
      case 'poll':
        const pollData = item.data;
        const pollTitle = 'pollTitle' in pollData ? pollData.pollTitle : ('title' in pollData ? pollData.title : 'Poll');
        const pollOptions = 'pollOptions' in pollData ? pollData.pollOptions : ('options' in pollData ? pollData.options : []);
        const pollTotalVotes = 'pollTotalVotes' in pollData ? pollData.pollTotalVotes : ('totalVotes' in pollData ? pollData.totalVotes : 0);
        return (
          <div className="h-full flex flex-col">
            <span className="type-tag poll mb-2 w-fit">Poll</span>
            <h4 className="text-white font-semibold text-sm line-clamp-2 mb-2">{pollTitle}</h4>
            <div className="space-y-1 flex-1">
              {(pollOptions || []).slice(0, 2).map((opt: any, idx: number) => (
                <div key={opt.id || idx} className="text-white/60 text-xs truncate bg-white/5 rounded px-2 py-1">
                  {opt.text}
                </div>
              ))}
            </div>
            <p className="text-white/50 text-xs mt-2">{pollTotalVotes || 0} votes</p>
          </div>
        );
      case 'announcement':
        return (
          <div className="h-full flex flex-col border-l-4 border-red-500 pl-3">
            <span className="type-tag announcement mb-2 w-fit">Official</span>
            {item.data.title && <h4 className="text-white font-bold text-sm mb-1">{item.data.title}</h4>}
            <p className="text-white/80 text-sm line-clamp-4 flex-1">{item.data.content}</p>
          </div>
        );
      case 'event':
        return (
          <div className="h-full flex flex-col">
            <span className="type-tag event mb-2 w-fit">Event</span>
            <h4 className="text-white font-semibold text-sm line-clamp-2 mb-1">
              {item.event?.title || item.data.content.slice(0, 50)}
            </h4>
            {item.event?.location && (
              <p className="text-white/60 text-xs truncate">📍 {item.event.location}</p>
            )}
            <p className="text-white/50 text-xs mt-auto">Tap to view details</p>
          </div>
        );
      case 'petition':
        const progress = item.data.targetSignatures 
          ? Math.min(100, Math.round((item.data.currentSignatures || 0) / item.data.targetSignatures * 100))
          : 0;
        return (
          <div className="h-full flex flex-col">
            <span className="type-tag petition mb-2 w-fit">Petition</span>
            <h4 className="text-white font-semibold text-sm line-clamp-2 mb-2">{item.data.title}</h4>
            <div className="mt-auto">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
                <div className="h-full bg-gradient-to-r from-red-500 to-blue-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-white/50 text-xs">{progress}% signed</p>
            </div>
          </div>
        );
      case 'blog':
        const blogAuthor = item.data.author;
        const blogDisplayName = blogAuthor?.firstName && blogAuthor?.lastName
          ? `${blogAuthor.firstName} ${blogAuthor.lastName}`
          : blogAuthor?.username || 'Anonymous';
        return (
          <div className="h-full flex flex-col">
            {item.data.featuredImage && (
              <div className="h-20 -mx-3 -mt-3 mb-2 overflow-hidden rounded-t-xl">
                <img 
                  src={item.data.featuredImage} 
                  alt="" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="type-tag blog w-fit text-[10px] px-1.5 py-0.5">Article</span>
              {item.data.readingTime && (
                <span className="text-white/40 text-[10px]">{item.data.readingTime} min read</span>
              )}
            </div>
            <h4 className="text-white font-semibold text-sm line-clamp-2 mb-1">{item.data.title || 'Untitled Article'}</h4>
            <p className="text-white/60 text-xs line-clamp-2 flex-1">{item.data.excerpt || item.data.content}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-blue-500 overflow-hidden flex-shrink-0">
                {blogAuthor?.avatar ? (
                  <img src={blogAuthor.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-bold">
                    {blogDisplayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-white/50 text-xs truncate">{blogDisplayName}</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mobile-root" data-testid="mobile-feed-page">
      
      <FilterTabs 
        activeFilter={activeFilter} 
        onFilterChange={handleFilterChange} 
      />

      <FriendSuggestionsWidget />

      <div className="feed-grid pb-20">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-white/10 rounded w-1/3" />
                    <div className="h-2 bg-white/10 rounded w-1/4" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-white/10 rounded w-full" />
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-24 bg-white/10 rounded mt-2" />
                </div>
              </div>
            ))}
          </>
        ) : displayItems.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <div className="glass-card p-6" style={{ height: 'auto' }}>
              <p className="text-white/70 text-sm">
                No content available yet.
              </p>
              <p className="text-white/50 text-xs mt-2">
                Be the first to post something!
              </p>
            </div>
          </div>
        ) : (
          displayItems.map((item, index) => (
            <div key={`mobile-wrap-${item.type}-${item.data.id}`}>
              {index > 0 && index % 10 === 0 && (
                <div className="col-span-2">
                  <MobileApprovalPrompt />
                </div>
              )}
              <div
                key={`${item.type}-${item.data.id}`}
                className="glass-card p-3 cursor-pointer hover:scale-[1.02] transition-transform"
                onClick={() => setExpandedItem(item)}
                data-testid={`card-${item.type}-${item.data.id}`}
              >
                {getCardPreview(item)}
              </div>
            </div>
          ))
        )}
      </div>

      <MobileBottomNav />

      {expandedItem && (
        <ExpandedCardView 
          item={expandedItem} 
          onClose={() => setExpandedItem(null)} 
        />
      )}
    </div>
  );
}
