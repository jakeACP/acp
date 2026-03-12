import { createContext, useContext, useState, ReactNode } from "react";

export type FeedView = "all" | "following" | "news" | "friends" | "groups" | "votes";
export type FeedType = 'all' | 'news' | 'following' | 'polls' | 'events' | 'charities' | 'debates' | 'boycotts' | 'initiatives' | 'petitions' | 'unions' | 'my-reps' | 'my-candidates' | 'volunteer' | 'group';

interface FeedViewContextType {
  activeView: FeedView;
  setActiveView: (view: FeedView) => void;
  activeFeed: FeedType;
  setActiveFeed: (feed: FeedType) => void;
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
}

const FeedViewContext = createContext<FeedViewContextType | undefined>(undefined);

export function FeedViewProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<FeedView>("all");
  const [activeFeed, setActiveFeed] = useState<FeedType>("all");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  return (
    <FeedViewContext.Provider value={{ activeView, setActiveView, activeFeed, setActiveFeed, activeGroupId, setActiveGroupId }}>
      {children}
    </FeedViewContext.Provider>
  );
}

export function useFeedView() {
  const context = useContext(FeedViewContext);
  if (!context) {
    throw new Error("useFeedView must be used within FeedViewProvider");
  }
  return context;
}
