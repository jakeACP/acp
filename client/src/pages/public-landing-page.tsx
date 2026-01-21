import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader } from "@/components/public-header";
import { PublicCategoryMenu, ArticleCategory } from "@/components/public-category-menu";
import { PublicArticleCard } from "@/components/public-article-card";
import { PublicAdSidebarLeft, PublicAdSidebarRight } from "@/components/public-ad-sidebar";
import { Loader2, Newspaper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const ITEMS_PER_PAGE = 12;

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

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [activeCategory]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < articles.length) {
          setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, articles.length));
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    
    return () => observer.disconnect();
  }, [visibleCount, articles.length]);

  const visibleArticles = articles.slice(0, visibleCount);
  const hasMoreArticles = visibleCount < articles.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <PublicHeader />
      <PublicCategoryMenu 
        activeCategory={activeCategory} 
        onCategoryChange={setActiveCategory} 
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <PublicAdSidebarLeft />
          
          <main className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-[#B22234]" />
              </div>
            ) : articles.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {visibleArticles.map((article) => (
                    <PublicArticleCard key={article.id} article={article} />
                  ))}
                </div>
                
                <div ref={loadMoreRef} className="py-8 flex justify-center">
                  {hasMoreArticles && (
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  )}
                </div>
              </>
            ) : (
              <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <CardContent className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Newspaper className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    No Articles Yet
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-md mx-auto">
                    {activeCategory === 'all' 
                      ? "Be the first to share breaking news and exposés. Join the Anti-Corruption Party today."
                      : `No articles found in this category yet. Check back soon or explore other topics.`
                    }
                  </p>
                  <Link href="/auth">
                    <Button className="bg-[#B22234] hover:bg-[#8B1A28] text-white">
                      Join & Start Writing
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </main>
          
          <PublicAdSidebarRight />
        </div>
      </div>
      
      <footer className="bg-[#3C3B6E] text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-bold text-lg mb-3">Anti-Corruption Party</h4>
              <p className="text-white/70 text-sm leading-relaxed">
                A grassroots movement dedicated to exposing corruption and promoting transparency in government.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li><Link href="/auth" className="hover:text-white transition-colors">Join Us</Link></li>
                <li><Link href="/auth" className="hover:text-white transition-colors">Log In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3">Stay Connected</h4>
              <p className="text-white/70 text-sm">
                Subscribe to get updates on breaking political news and corruption exposés.
              </p>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-6 text-center text-white/60 text-sm">
            &copy; {new Date().getFullYear()} Anti-Corruption Party. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
