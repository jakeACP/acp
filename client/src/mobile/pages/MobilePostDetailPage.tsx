import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import { ExpandedCardView } from "../components/ExpandedCardView";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

export function MobilePostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: post, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/posts", id],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
    staleTime: 30000,
    retry: 1,
  });

  const handleBack = () => navigate(-1 as any);

  if (isLoading) {
    return (
      <div className="mobile-root items-center justify-center" data-testid="mobile-post-detail-loading">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
        <MobileBottomNav />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="mobile-root" data-testid="mobile-post-detail-error">
        <div className="glass-top-bar flex items-center gap-3">
          <button onClick={handleBack} className="p-2 rounded-full active:bg-white/10">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-white font-semibold">Post</span>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
          <span className="text-5xl mb-4">🔍</span>
          <p className="text-white font-semibold mb-1">Post not found</p>
          <p className="text-white/50 text-sm mb-6">This post may have been deleted or is private.</p>
          <button
            onClick={handleBack}
            className="px-6 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: "rgba(230,57,58,0.2)", color: "#fff", border: "1px solid rgba(230,57,58,0.4)" }}
          >
            Go Back
          </button>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  // Determine type from post data
  const type = post.pollId ? "poll"
    : post.type === "news" || post.url || post.linkPreview ? "news"
    : post.type === "announcement" ? "announcement"
    : post.type === "event" && post.eventId ? "event"
    : post.type === "blog" || post.articleBody ? "blog"
    : "post";

  return (
    <>
      {/* ExpandedCardView renders as a full-screen modal/overlay */}
      <ExpandedCardView
        item={{ type, data: post }}
        onClose={handleBack}
      />
      <MobileBottomNav />
    </>
  );
}
