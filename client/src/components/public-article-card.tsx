import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Heart, Clock, ChevronDown, ChevronUp, Link2, Check, ExternalLink } from "lucide-react";
import { SiFacebook, SiX, SiBluesky } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface PublicArticle {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  articleBody?: string;
  featuredImage?: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  likesCount?: number;
  author?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

interface PublicArticleCardProps {
  article: PublicArticle;
  variant?: 'default' | 'hero';
}

export function PublicArticleCard({ article, variant = 'default' }: PublicArticleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const rawContent = article.articleBody || article.content || '';
  const articleUrl = typeof window !== 'undefined' ? `${window.location.origin}/read/${article.id}` : '';
  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedTitle = encodeURIComponent(article.title);
  
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
  const plainText = rawContent.replace(/<[^>]*>/g, '').trim();
  const excerpt = article.excerpt || (plainText.length > 300 ? plainText.slice(0, 300) + '...' : plainText);
  
  const authorName = article.author?.firstName 
    ? `${article.author.firstName} ${article.author.lastName || ''}`
    : article.author?.username || 'ACP Staff';

  const articleType = article.tags?.find(tag => 
    ['current-events', 'politicians', 'proposals', 'issues', 'donors', 'propaganda', 'conspiracies', 'legal-cases', 'leaks'].includes(tag)
  );

  const isHero = variant === 'hero';

  return (
    <Card className={`group overflow-hidden bg-[#1a1a2e]/90 backdrop-blur-xl border border-white/20 shadow-2xl transition-all duration-500 ${isHero ? 'ring-2 ring-[#B22234]/40' : ''} ${isExpanded ? 'ring-2 ring-[#3C3B6E]/60' : 'hover:shadow-[0_0_40px_rgba(178,34,52,0.3)]'}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#B22234]/10 via-transparent to-[#3C3B6E]/10 pointer-events-none" />
      <div className={`relative ${isHero && !isExpanded ? 'md:flex' : ''}`}>
        {article.featuredImage && (
          <div className={`relative overflow-hidden ${isHero && !isExpanded ? 'md:w-2/5 h-72 md:h-auto' : isExpanded ? 'h-80' : 'h-60'}`}>
            <img 
              src={article.featuredImage} 
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            {articleType && (
              <Badge 
                className="absolute top-4 left-4 bg-gradient-to-r from-[#B22234] to-[#D4343F] text-white border-0 capitalize text-sm px-4 py-1.5 font-bold shadow-lg"
              >
                {articleType.replace('-', ' ')}
              </Badge>
            )}
            {isHero && !isExpanded && (
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-white text-xs font-bold border border-white/30">
                Featured
              </div>
            )}
          </div>
        )}
        
        <CardContent className={`relative ${isHero && !isExpanded ? 'md:w-3/5 p-8 md:p-10' : 'p-7'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <a
                href={shareLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/10 hover:bg-[#1877F2]/20 text-white/70 hover:text-[#1877F2] transition-all hover:scale-110"
                title="Share on Facebook"
              >
                <SiFacebook className="h-4 w-4" />
              </a>
              <a
                href={shareLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all hover:scale-110"
                title="Share on X"
              >
                <SiX className="h-4 w-4" />
              </a>
              <a
                href={shareLinks.bluesky}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/10 hover:bg-[#0085FF]/20 text-white/70 hover:text-[#0085FF] transition-all hover:scale-110"
                title="Share on Bluesky"
              >
                <SiBluesky className="h-4 w-4" />
              </a>
            </div>
            
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all text-sm font-medium"
              title="Copy link"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Link2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
          
          {!article.featuredImage && articleType && (
            <Badge 
              className="mb-4 bg-gradient-to-r from-[#B22234]/20 to-[#B22234]/10 text-[#B22234] border-[#B22234]/30 capitalize font-bold"
            >
              {articleType.replace('-', ' ')}
            </Badge>
          )}
          
          <h3 className={`font-bold text-white mb-4 leading-tight ${isHero ? 'text-3xl md:text-4xl' : 'text-2xl'}`}>
            {article.title}
          </h3>
          
          <p className={`text-slate-300 mb-6 leading-relaxed ${isExpanded ? '' : isHero ? 'text-lg line-clamp-4' : 'text-base line-clamp-3'}`}>
            {isExpanded ? plainText : excerpt}
          </p>
          
          <div className="flex items-center gap-4 mb-6 text-sm text-slate-400 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-[#3C3B6E]/20 rounded-full blur-sm" />
                <Avatar className="relative h-10 w-10 border-2 border-white/50 shadow-md">
                  <AvatarImage src={article.author?.avatar || ''} />
                  <AvatarFallback className="text-sm bg-gradient-to-br from-[#3C3B6E] to-[#2a2a4a] text-white font-bold">
                    {authorName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="font-semibold text-white">{authorName}</span>
            </div>
            
            <span className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
              <Clock className="h-4 w-4" />
              {format(new Date(article.createdAt), 'MMM d, yyyy')}
            </span>
            
            {article.likesCount !== undefined && article.likesCount > 0 && (
              <span className="flex items-center gap-1.5 bg-[#B22234]/10 text-[#B22234] rounded-full px-3 py-1 font-semibold">
                <Heart className="h-4 w-4 fill-current" />
                {article.likesCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <Button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="relative bg-gradient-to-r from-[#3C3B6E] to-[#2a2a4a] hover:from-[#2a2a4a] hover:to-[#1a1a3a] text-white font-bold text-base px-6 py-3 rounded-xl shadow-lg border border-white/20 group/btn overflow-hidden transition-all hover:scale-105 hover:shadow-xl"
            >
              <span className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 pointer-events-none" />
              <span className="relative flex items-center gap-2">
                {isExpanded ? 'Show Less' : 'Read More'}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5 group-hover/btn:translate-y-0.5 transition-transform" />
                )}
              </span>
            </Button>
            
            <Link href={`/read/${article.id}`}>
              <Button 
                className="relative bg-gradient-to-r from-[#B22234] to-[#8B1A28] hover:from-[#8B1A28] hover:to-[#6B1420] text-white font-bold text-base px-6 py-3 rounded-xl shadow-lg border border-white/20 group/btn overflow-hidden transition-all hover:scale-105 hover:shadow-xl"
              >
                <span className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 pointer-events-none" />
                <span className="relative flex items-center gap-2">
                  Read Full Article
                  <ExternalLink className="h-4 w-4" />
                </span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
