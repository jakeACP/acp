import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { PublicHeader } from "@/components/public-header";
import { PublicAdSidebarLeft, PublicAdSidebarRight } from "@/components/public-ad-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, ArrowLeft, Clock, Eye, Calendar, Share2 } from "lucide-react";

export default function PublicArticlePage() {
  const [, params] = useRoute("/read/:id");
  const articleId = params?.id;

  const { data: article, isLoading, error } = useQuery<any>({
    queryKey: ["/api/public/articles", articleId],
    queryFn: async () => {
      const res = await fetch(`/api/public/articles/${articleId}`);
      if (!res.ok) throw new Error('Article not found');
      return res.json();
    },
    enabled: !!articleId,
  });

  const authorName = article?.author?.firstName 
    ? `${article.author.firstName} ${article.author.lastName || ''}`
    : article?.author?.username || 'Anonymous';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <PublicHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-10 w-10 animate-spin text-[#B22234]" />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <PublicHeader />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Article Not Found
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-8">
            This article may have been removed or is not publicly available.
          </p>
          <Link href="/">
            <Button className="bg-[#B22234] hover:bg-[#8B1A28] text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <PublicHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <PublicAdSidebarLeft />
          
          <main className="flex-1 min-w-0">
            <Link href="/">
              <Button variant="ghost" className="mb-4 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Articles
              </Button>
            </Link>
            
            <article className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              {article.featuredImage && (
                <div className="relative h-64 md:h-96">
                  <img 
                    src={article.featuredImage} 
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              )}
              
              <div className="p-6 md:p-10">
                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {article.tags.map((tag: string, index: number) => (
                      <Badge 
                        key={index}
                        className="bg-[#B22234]/10 text-[#B22234] border-[#B22234]/20 capitalize"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                  {article.title}
                </h1>
                
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-6 mb-8">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={article.author?.avatar || ''} />
                      <AvatarFallback className="bg-[#3C3B6E] text-white text-lg">
                        {authorName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {authorName}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(article.createdAt), 'MMMM d, yyyy')}
                        </span>
                        {article.readingTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {article.readingTime} min read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="hidden sm:flex"
                    onClick={() => navigator.share?.({ 
                      title: article.title, 
                      url: window.location.href 
                    })}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
                
                {article.excerpt && (
                  <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed italic border-l-4 border-[#B22234] pl-4">
                    {article.excerpt}
                  </p>
                )}
                
                <div 
                  className="prose prose-lg dark:prose-invert max-w-none
                    prose-headings:text-slate-900 dark:prose-headings:text-white
                    prose-p:text-slate-700 dark:prose-p:text-slate-300
                    prose-a:text-[#B22234] prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-slate-900 dark:prose-strong:text-white
                    prose-img:rounded-lg prose-img:shadow-md"
                  dangerouslySetInnerHTML={{ __html: article.articleBody || article.content }}
                />
              </div>
            </article>
            
            <Card className="mt-8 bg-gradient-to-r from-[#3C3B6E] to-[#1a1a4a] border-0 text-white">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-3">Want to join the conversation?</h3>
                <p className="text-white/80 mb-6 max-w-lg mx-auto">
                  Sign up for free to comment on articles, participate in polls, and connect with other members fighting corruption.
                </p>
                <Link href="/auth">
                  <Button className="bg-[#B22234] hover:bg-[#8B1A28] text-white font-semibold px-8 py-3">
                    Join the Anti-Corruption Party
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </main>
          
          <PublicAdSidebarRight />
        </div>
      </div>
      
      <footer className="bg-[#3C3B6E] text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white/60 text-sm">
          &copy; {new Date().getFullYear()} Anti-Corruption Party. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
