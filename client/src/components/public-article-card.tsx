import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Heart, Clock, ArrowRight } from "lucide-react";
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
  const rawContent = article.articleBody || article.content || '';
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
    <Card className={`group overflow-hidden bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 shadow-xl hover:shadow-2xl transition-all duration-500 ${isHero ? 'ring-2 ring-[#B22234]/20' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#B22234]/5 via-transparent to-[#3C3B6E]/5 pointer-events-none" />
      <div className={`relative ${isHero ? 'md:flex' : ''}`}>
        {article.featuredImage && (
          <div className={`relative overflow-hidden ${isHero ? 'md:w-2/5 h-72 md:h-auto' : 'h-60'}`}>
            <img 
              src={article.featuredImage} 
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            {articleType && (
              <Badge 
                className="absolute top-4 left-4 bg-gradient-to-r from-[#B22234] to-[#D4343F] text-white border-0 capitalize text-sm px-4 py-1.5 font-bold shadow-lg"
              >
                {articleType.replace('-', ' ')}
              </Badge>
            )}
            {isHero && (
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-white text-xs font-bold border border-white/30">
                Featured
              </div>
            )}
          </div>
        )}
        
        <CardContent className={`relative ${isHero ? 'md:w-3/5 p-8 md:p-10' : 'p-7'}`}>
          {!article.featuredImage && articleType && (
            <Badge 
              className="mb-4 bg-gradient-to-r from-[#B22234]/20 to-[#B22234]/10 text-[#B22234] border-[#B22234]/30 capitalize font-bold"
            >
              {articleType.replace('-', ' ')}
            </Badge>
          )}
          
          <h3 className={`font-bold text-slate-900 dark:text-white mb-4 leading-tight ${isHero ? 'text-3xl md:text-4xl' : 'text-2xl'}`}>
            {article.title}
          </h3>
          
          <p className={`text-slate-600 dark:text-slate-300 mb-6 leading-relaxed ${isHero ? 'text-lg line-clamp-4' : 'text-base line-clamp-3'}`}>
            {excerpt}
          </p>
          
          <div className="flex items-center gap-4 mb-6 text-sm text-slate-500 dark:text-slate-400">
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
              <span className="font-semibold text-slate-700 dark:text-slate-200">{authorName}</span>
            </div>
            
            <span className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-700/80 rounded-full px-3 py-1">
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
          
          <Link href={`/read/${article.id}`}>
            <Button 
              className="relative bg-gradient-to-r from-[#3C3B6E] to-[#2a2a4a] hover:from-[#2a2a4a] hover:to-[#1a1a3a] text-white font-bold text-base px-8 py-3 rounded-xl shadow-lg border border-white/20 group/btn overflow-hidden transition-all hover:scale-105 hover:shadow-xl"
            >
              <span className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 pointer-events-none" />
              <span className="relative flex items-center gap-2">
                Read More
                <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
              </span>
            </Button>
          </Link>
        </CardContent>
      </div>
    </Card>
  );
}
