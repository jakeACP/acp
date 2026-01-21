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
    <Card className={`group overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-lg transition-all duration-300 ${isHero ? '' : ''}`}>
      <div className={`${isHero ? 'md:flex' : ''}`}>
        {article.featuredImage && (
          <div className={`relative overflow-hidden ${isHero ? 'md:w-2/5 h-64 md:h-auto' : 'h-56'}`}>
            <img 
              src={article.featuredImage} 
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            {articleType && (
              <Badge 
                className="absolute top-4 left-4 bg-[#B22234] text-white border-0 capitalize text-sm px-3 py-1"
              >
                {articleType.replace('-', ' ')}
              </Badge>
            )}
          </div>
        )}
        
        <CardContent className={`${isHero ? 'md:w-3/5 p-6 md:p-8' : 'p-6'}`}>
          {!article.featuredImage && articleType && (
            <Badge 
              className="mb-4 bg-[#B22234]/10 text-[#B22234] border-[#B22234]/20 capitalize"
            >
              {articleType.replace('-', ' ')}
            </Badge>
          )}
          
          <h3 className={`font-bold text-slate-900 dark:text-white mb-3 leading-tight ${isHero ? 'text-2xl md:text-3xl' : 'text-xl'}`}>
            {article.title}
          </h3>
          
          <p className={`text-slate-600 dark:text-slate-300 mb-5 leading-relaxed ${isHero ? 'text-base md:text-lg line-clamp-4' : 'text-sm line-clamp-3'}`}>
            {excerpt}
          </p>
          
          <div className="flex items-center gap-4 mb-5 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={article.author?.avatar || ''} />
                <AvatarFallback className="text-xs bg-[#3C3B6E] text-white">
                  {authorName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{authorName}</span>
            </div>
            
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {format(new Date(article.createdAt), 'MMM d, yyyy')}
            </span>
            
            {article.likesCount !== undefined && article.likesCount > 0 && (
              <span className="flex items-center gap-1 text-[#B22234]">
                <Heart className="h-4 w-4 fill-current" />
                {article.likesCount}
              </span>
            )}
          </div>
          
          <Link href={`/read/${article.id}`}>
            <Button 
              className="bg-[#3C3B6E] hover:bg-[#2a2a4a] text-white font-semibold group/btn"
            >
              Read More
              <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </CardContent>
      </div>
    </Card>
  );
}
