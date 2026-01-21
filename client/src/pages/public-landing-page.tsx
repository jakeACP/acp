import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader } from "@/components/public-header";
import { PublicCategoryMenu, ArticleCategory } from "@/components/public-category-menu";
import { PublicArticleCard } from "@/components/public-article-card";
import { PublicAdSidebarLeft, PublicAdSidebarRight } from "@/components/public-ad-sidebar";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#B22234]/5 via-transparent to-[#3C3B6E]/5 pointer-events-none" />
      
      <PublicHeader />
      <PublicCategoryMenu 
        activeCategory={activeCategory} 
        onCategoryChange={setActiveCategory} 
      />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <div className="hidden xl:block">
            <PublicAdSidebarLeft />
          </div>
          
          <main className="flex-1 min-w-0">
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
                  {hasMoreArticles && (
                    <div className="flex items-center gap-3 text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm font-medium">Loading more articles...</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Card className="relative overflow-hidden bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-[#B22234]/5 via-transparent to-[#3C3B6E]/5 pointer-events-none" />
                <CardContent className="relative text-center py-20">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#B22234]/20 to-[#3C3B6E]/20 rounded-full blur-xl" />
                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center border border-white/50 shadow-lg">
                      <Newspaper className="h-10 w-10 text-slate-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    No Articles Yet
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto text-lg leading-relaxed">
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
          
          <div className="hidden xl:block">
            <PublicAdSidebarRight />
          </div>
        </div>
      </div>
      
      <footer className="relative mt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#3C3B6E] via-[#2a2a5a] to-[#3C3B6E]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <h4 className="font-bold text-xl text-white mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-[#B22234]" />
                Anti-Corruption Party
              </h4>
              <p className="text-white/70 leading-relaxed">
                A grassroots movement dedicated to exposing corruption and promoting transparency in government.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg text-white mb-4">Quick Links</h4>
              <ul className="space-y-3 text-white/70">
                <li>
                  <Link href="/auth" className="hover:text-white transition-colors flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Join Us
                  </Link>
                </li>
                <li>
                  <Link href="/auth" className="hover:text-white transition-colors flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Log In
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg text-white mb-4">Stay Connected</h4>
              <p className="text-white/70 leading-relaxed">
                Subscribe to get updates on breaking political news and corruption exposés.
              </p>
            </div>
          </div>
          <div className="border-t border-white/20 mt-10 pt-8 text-center text-white/60">
            &copy; {new Date().getFullYear()} Anti-Corruption Party. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
