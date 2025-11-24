import { createContext, useContext, useState, ReactNode } from "react";

type FeedView = "all" | "following" | "news" | "friends" | "groups" | "votes";

interface FeedViewContextType {
  activeView: FeedView;
  setActiveView: (view: FeedView) => void;
}

const FeedViewContext = createContext<FeedViewContextType | undefined>(undefined);

export function FeedViewProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<FeedView>("all");

  return (
    <FeedViewContext.Provider value={{ activeView, setActiveView }}>
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
