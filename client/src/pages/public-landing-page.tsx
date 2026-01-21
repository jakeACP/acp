import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader } from "@/components/public-header";
import { PublicCategoryMenu, ArticleCategory } from "@/components/public-category-menu";
import { PublicArticleCard } from "@/components/public-article-card";
import { Loader2, Newspaper, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const ITEMS_PER_PAGE = 10;

export default function PublicLandingPage() {
  const [activeCategory, setActiveCategory] = useState<ArticleCategory>('all');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: articles = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/public/articles", activeCategory],
    queryFn: async () => {
      const url = activeCategory === 'all' 
        ? '/api/public/articles'
        : `/api/public/articles?category=${activeCategory}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch articles');
      return res.json();
    },
  });

  const sortedArticles = [...articles].sort((a, b) => {
    const likesA = a.likesCount || 0;
    const likesB = b.likesCount || 0;
    return likesB - likesA;
  });

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [activeCategory]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < sortedArticles.length) {
          setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, sortedArticles.length));
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    
    return () => observer.disconnect();
  }, [visibleCount, sortedArticles.length]);

  const visibleArticles = sortedArticles.slice(0, visibleCount);
  const hasMoreArticles = visibleCount < sortedArticles.length;
  const heroArticle = visibleArticles[0];
  const remainingArticles = visibleArticles.slice(1);

  return (
    <div className="min-h-screen bg-[#1a1a2e] relative">
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `repeating-linear-gradient(
            -45deg,
            #8B1A28 0px,
            #8B1A28 40px,
            rgba(255,255,255,0.15) 40px,
            rgba(255,255,255,0.15) 44px,
            #6B1420 44px,
            #6B1420 84px,
            rgba(255,255,255,0.15) 84px,
            rgba(255,255,255,0.15) 88px
          )`,
          opacity: 0.3
        }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-[#1a1a2e]/80 via-[#1a1a2e]/60 to-[#1a1a2e]/80 pointer-events-none" />
      
      <PublicHeader />
      <PublicCategoryMenu 
        activeCategory={activeCategory} 
        onCategoryChange={setActiveCategory} 
      />
      
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <main className="w-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#B22234]/20 rounded-full blur-xl animate-pulse" />
                  <Loader2 className="relative h-12 w-12 animate-spin text-[#B22234]" />
                </div>
                <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">Loading articles...</p>
              </div>
            ) : sortedArticles.length > 0 ? (
              <div className="space-y-8">
                {heroArticle && (
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#B22234]/20 via-transparent to-[#3C3B6E]/20 rounded-2xl blur-xl" />
                    <PublicArticleCard article={heroArticle} variant="hero" />
                  </div>
                )}
                
                {remainingArticles.map((article) => (
                  <PublicArticleCard key={article.id} article={article} />
                ))}
                
                <div ref={loadMoreRef} className="py-10 flex justify-center">
                  {hasMoreArticles ? (
                    <div className="flex items-center gap-3 text-white/60">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm font-medium">Loading more articles...</span>
                    </div>
                  ) : sortedArticles.length > 0 ? (
                    <div className="text-center py-8">
                      <p className="text-white/40 text-sm font-medium">
                        You've reached the end
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <Card className="relative overflow-hidden bg-[#1a1a2e]/90 backdrop-blur-xl border border-white/20 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-[#B22234]/10 via-transparent to-[#3C3B6E]/10 pointer-events-none" />
                <CardContent className="relative text-center py-20">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#B22234]/30 to-[#3C3B6E]/30 rounded-full blur-xl" />
                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#2a2a4a] to-[#1a1a2e] flex items-center justify-center border border-white/20 shadow-lg">
                      <Newspaper className="h-10 w-10 text-white/60" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    No Articles Yet
                  </h3>
                  <p className="text-slate-300 mb-8 max-w-md mx-auto text-lg leading-relaxed">
                    {activeCategory === 'all' 
                      ? "Be the first to share breaking news and exposés. Join the Anti-Corruption Party today."
                      : `No articles found in this category yet. Check back soon or explore other topics.`
                    }
                  </p>
                  <Link href="/auth">
                    <Button className="relative bg-gradient-to-r from-[#B22234] to-[#D4343F] hover:from-[#8B1A28] hover:to-[#B22234] text-white font-bold px-8 py-3 rounded-xl shadow-xl border border-white/30 transition-all hover:scale-105 hover:shadow-2xl overflow-hidden">
                      <span className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 pointer-events-none" />
                      <span className="relative flex items-center gap-2">
                        <Star className="h-5 w-5" />
                        Join & Start Writing
                      </span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </main>
      </div>
    </div>
  );
}
