import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import DOMPurify from "dompurify";
import { PublicHeader } from "@/components/public-header";
import { PublicCategoryMenu } from "@/components/public-category-menu";
import { PublicAdSidebarLeft, PublicAdSidebarRight } from "@/components/public-ad-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, ArrowLeft, Clock, Calendar, Link2, Check } from "lucide-react";
import { SiFacebook, SiX, SiBluesky } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";

export default function PublicArticlePage() {
  const [, params] = useRoute("/read/:id");
  const articleId = params?.id;
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

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
    : article?.author?.username || 'ACP Staff';

  const articleUrl = typeof window !== 'undefined' ? window.location.href : '';
  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedTitle = encodeURIComponent(article?.title || '');
  
  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    bluesky: `https://bsky.app/intent/compose?text=${encodedTitle}%20${encodedUrl}`,
  };
  
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(articleUrl);
      setCopied(true);
      toast({ title: "Link copied!", description: "Article link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e]">
        <div 
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `repeating-linear-gradient(-45deg, #8B1A28 0px, #8B1A28 40px, rgba(255,255,255,0.15) 40px, rgba(255,255,255,0.15) 44px, #6B1420 44px, #6B1420 84px, rgba(255,255,255,0.15) 84px, rgba(255,255,255,0.15) 88px)`,
            opacity: 0.3
          }}
        />
        <div className="fixed inset-0 bg-gradient-to-b from-[#1a1a2e]/80 via-[#1a1a2e]/60 to-[#1a1a2e]/80 pointer-events-none" />
        <PublicHeader />
        <div className="relative flex items-center justify-center py-32">
          <Loader2 className="h-10 w-10 animate-spin text-[#B22234]" />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-[#1a1a2e]">
        <div 
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `repeating-linear-gradient(-45deg, #8B1A28 0px, #8B1A28 40px, rgba(255,255,255,0.15) 40px, rgba(255,255,255,0.15) 44px, #6B1420 44px, #6B1420 84px, rgba(255,255,255,0.15) 84px, rgba(255,255,255,0.15) 88px)`,
            opacity: 0.3
          }}
        />
        <div className="fixed inset-0 bg-gradient-to-b from-[#1a1a2e]/80 via-[#1a1a2e]/60 to-[#1a1a2e]/80 pointer-events-none" />
        <PublicHeader />
        <div className="relative max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">
            Article Not Found
          </h1>
          <p className="text-slate-300 mb-8">
            This article may have been removed or is not publicly available.
          </p>
          <Link href="/">
            <Button className="bg-[#B22234] hover:bg-[#8B1A28] text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to News
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `repeating-linear-gradient(-45deg, #8B1A28 0px, #8B1A28 40px, rgba(255,255,255,0.15) 40px, rgba(255,255,255,0.15) 44px, #6B1420 44px, #6B1420 84px, rgba(255,255,255,0.15) 84px, rgba(255,255,255,0.15) 88px)`,
          opacity: 0.3
        }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-[#1a1a2e]/80 via-[#1a1a2e]/60 to-[#1a1a2e]/80 pointer-events-none" />
      
      <PublicHeader />
      <PublicCategoryMenu activeCategory="all" onCategoryChange={() => {}} />
      
      <div className="relative w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          <div className="hidden lg:block flex-shrink-0">
            <PublicAdSidebarLeft />
          </div>
          
          <main className="flex-1 min-w-0">
            <Link href="/">
              <Button variant="ghost" className="mb-4 text-white/70 hover:text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to News
              </Button>
            </Link>
            
            <article className="bg-[#1a1a2e]/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden border border-white/20">
              {article.featuredImage && (
                <div className="relative h-64 md:h-96">
                  <img 
                    src={article.featuredImage} 
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] via-transparent to-transparent" />
                </div>
              )}
              
              <div className="p-6 md:p-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <a
                      href={shareLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg bg-white/10 hover:bg-[#1877F2]/20 text-white/70 hover:text-[#1877F2] transition-all hover:scale-110"
                      title="Share on Facebook"
                    >
                      <SiFacebook className="h-5 w-5" />
                    </a>
                    <a
                      href={shareLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all hover:scale-110"
                      title="Share on X"
                    >
                      <SiX className="h-5 w-5" />
                    </a>
                    <a
                      href={shareLinks.bluesky}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg bg-white/10 hover:bg-[#0085FF]/20 text-white/70 hover:text-[#0085FF] transition-all hover:scale-110"
                      title="Share on Bluesky"
                    >
                      <SiBluesky className="h-5 w-5" />
                    </a>
                  </div>
                  
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all font-medium"
                    title="Copy link"
                  >
                    {copied ? <Check className="h-5 w-5 text-green-400" /> : <Link2 className="h-5 w-5" />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
                
                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {article.tags.map((tag: string, index: number) => (
                      <Badge 
                        key={index}
                        className="bg-[#B22234]/20 text-[#ff6b7a] border-[#B22234]/30 capitalize"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                  {article.title}
                </h1>
                
                <div className="flex items-center justify-between border-b border-white/20 pb-6 mb-8">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-white/30">
                      <AvatarImage src={article.author?.avatar || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-[#3C3B6E] to-[#2a2a4a] text-white text-lg font-bold">
                        {authorName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-white">
                        {authorName}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
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
                </div>
                
                {article.excerpt && (
                  <p className="text-lg text-slate-300 mb-8 leading-relaxed italic border-l-4 border-[#B22234] pl-4">
                    {article.excerpt}
                  </p>
                )}
                
                <div 
                  className="prose prose-lg prose-invert max-w-none
                    prose-headings:text-white
                    prose-p:text-slate-300
                    prose-a:text-[#ff6b7a] prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-white
                    prose-img:rounded-lg prose-img:shadow-md
                    prose-blockquote:border-[#B22234] prose-blockquote:text-slate-400"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((article.articleBody || article.content || '').replace(/^<h[12][^>]*>.*?<\/h[12]>\s*/i, '')) }}
                />
              </div>
            </article>
            
            <Card className="mt-8 bg-gradient-to-r from-[#3C3B6E]/90 to-[#1a1a4a]/90 backdrop-blur-xl border border-white/20 text-white">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-3">Want to join the conversation?</h3>
                <p className="text-white/70 mb-6 max-w-lg mx-auto">
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
          
          <div className="hidden lg:block flex-shrink-0">
            <PublicAdSidebarRight />
          </div>
        </div>
      </div>
    </div>
  );
}
