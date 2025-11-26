import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useScrollLight } from "../hooks/useScrollLight";
import { MobileTopBar } from "../components/MobileTopBar";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { FilterTabs } from "../components/FilterTabs";
import { SignalCard } from "../components/cards/SignalCard";
import { PostCard } from "../components/cards/PostCard";
import { NewsCard } from "../components/cards/NewsCard";
import { PollCard } from "../components/cards/PollCard";
import { PetitionCard } from "../components/cards/PetitionCard";
import { AnnouncementCard } from "../components/cards/AnnouncementCard";
import { EventCard } from "../components/cards/EventCard";
import type { Post, Poll, Petition, SignalWithAuthor, Event } from "@shared/schema";

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
  | { type: 'poll'; data: PostWithAuthor }
  | { type: 'announcement'; data: PostWithAuthor }
  | { type: 'event'; data: PostWithAuthor; event?: Event }
  | { type: 'petition'; data: Petition };

export function MobileFeedPage() {
  useScrollLight();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: signals = [], isLoading: signalsLoading } = useQuery<SignalWithAuthor[]>({
    queryKey: ['/api/mobile/signals'],
    staleTime: 60000,
  });

  const { data: feedPosts = [], isLoading: postsLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ['/api/feeds/all'],
    staleTime: 30000,
  });

  const { data: petitions = [], isLoading: petitionsLoading } = useQuery<Petition[]>({
    queryKey: ['/api/petitions'],
    staleTime: 60000,
  });

  const isLoading = signalsLoading || postsLoading || petitionsLoading;

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
      if (p.type === 'news' || p.url || p.linkPreview) {
        return { type: 'news' as const, data: p };
      }
      return { type: 'post' as const, data: p };
    }),
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
        if (activeFilter === "posts") return item.type === "post";
        return true;
      });

  const displayItems = filteredItems.slice(0, 30);

  const renderCard = (item: FeedItem, index: number) => {
    switch (item.type) {
      case 'signal':
        return <SignalCard key={`signal-${item.data.id}`} signal={item.data} />;
      case 'post':
        return <PostCard key={`post-${item.data.id}`} post={item.data} />;
      case 'news':
        return <NewsCard key={`news-${item.data.id}`} post={item.data} />;
      case 'poll':
        const pollData: Poll = {
          id: item.data.pollId!,
          postId: item.data.id,
          title: item.data.pollTitle || 'Untitled Poll',
          description: item.data.pollDescription || null,
          options: item.data.pollOptions || [],
          votingType: item.data.pollVotingType || 'simple',
          isBlockchainVerified: item.data.pollIsBlockchainVerified || false,
          blockchainHash: null,
          totalVotes: item.data.pollTotalVotes || 0,
          endDate: item.data.pollEndDate ? new Date(item.data.pollEndDate as string) : null,
          isActive: item.data.pollIsActive ?? true,
          featured: false,
          createdAt: item.data.createdAt ? new Date(item.data.createdAt as string) : null,
        };
        return <PollCard key={`poll-${item.data.id}`} poll={pollData} />;
      case 'announcement':
        return <AnnouncementCard key={`announcement-${item.data.id}`} post={item.data} />;
      case 'event':
        return <EventCard key={`event-${item.data.id}`} post={item.data} event={item.event} />;
      case 'petition':
        return <PetitionCard key={`petition-${item.data.id}`} petition={item.data} />;
      default:
        return null;
    }
  };

  return (
    <div className="mobile-root" data-testid="mobile-feed-page">
      <MobileTopBar title="FEED" subtitle="United Against Corruption" />
      
      <FilterTabs 
        activeFilter={activeFilter} 
        onFilterChange={setActiveFilter} 
      />

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
            <div className="glass-card p-6">
              <p className="text-white/70 text-sm">
                No content available yet.
              </p>
              <p className="text-white/50 text-xs mt-2">
                Be the first to post something!
              </p>
            </div>
          </div>
        ) : (
          displayItems.map((item, index) => renderCard(item, index))
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
