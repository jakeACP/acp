import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useScrollLight } from "../hooks/useScrollLight";
import { MobileTopBar } from "../components/MobileTopBar";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { FilterTabs } from "../components/FilterTabs";
import { SignalCard } from "../components/cards/SignalCard";
import { NewsCard } from "../components/cards/NewsCard";
import { PollCard } from "../components/cards/PollCard";
import { PetitionCard } from "../components/cards/PetitionCard";
import type { Post, Poll, Petition, SignalWithAuthor } from "@shared/schema";

type FeedItem = 
  | { type: 'signal'; data: SignalWithAuthor }
  | { type: 'news'; data: Post & { author?: { username: string; avatar: string | null } } }
  | { type: 'poll'; data: Poll }
  | { type: 'petition'; data: Petition };

export function MobileFeedPage() {
  useScrollLight();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: signals = [] } = useQuery<SignalWithAuthor[]>({
    queryKey: ['/api/mobile/signals'],
    staleTime: 60000,
  });

  const { data: posts = [] } = useQuery<(Post & { author?: { username: string; avatar: string | null } })[]>({
    queryKey: ['/api/posts'],
    staleTime: 60000,
  });

  const { data: polls = [] } = useQuery<Poll[]>({
    queryKey: ['/api/polls'],
    staleTime: 60000,
  });

  const { data: petitions = [] } = useQuery<Petition[]>({
    queryKey: ['/api/petitions'],
    staleTime: 60000,
  });

  const newsPosts = posts.filter(p => p.type === 'news' || p.url || p.linkPreview);

  const allItems: FeedItem[] = [
    ...signals.map(s => ({ type: 'signal' as const, data: s })),
    ...newsPosts.map(p => ({ type: 'news' as const, data: p })),
    ...polls.map(p => ({ type: 'poll' as const, data: p })),
    ...petitions.map(p => ({ type: 'petition' as const, data: p })),
  ].sort(() => Math.random() - 0.5);

  const filteredItems = activeFilter === "all" 
    ? allItems 
    : allItems.filter(item => {
        if (activeFilter === "signals") return item.type === "signal";
        if (activeFilter === "news") return item.type === "news";
        if (activeFilter === "polls") return item.type === "poll";
        if (activeFilter === "petitions") return item.type === "petition";
        return true;
      });

  const displayItems = filteredItems.slice(0, 20);

  return (
    <div className="mobile-root" data-testid="mobile-feed-page">
      <MobileTopBar title="FEED" subtitle="United Against Corruption" />
      
      <FilterTabs 
        activeFilter={activeFilter} 
        onFilterChange={setActiveFilter} 
      />

      <div className="feed-grid pb-8">
        {displayItems.length === 0 ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card aspect-[3/4]">
                <div className="skeleton w-full h-full" />
              </div>
            ))}
          </>
        ) : (
          displayItems.map((item, index) => {
            switch (item.type) {
              case 'signal':
                return <SignalCard key={`signal-${item.data.id}`} signal={item.data} />;
              case 'news':
                return <NewsCard key={`news-${item.data.id}`} post={item.data} />;
              case 'poll':
                return <PollCard key={`poll-${item.data.id}`} poll={item.data} />;
              case 'petition':
                return <PetitionCard key={`petition-${item.data.id}`} petition={item.data} />;
              default:
                return null;
            }
          })
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
