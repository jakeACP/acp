import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Eye, Clock, User } from "lucide-react";
import { Link } from "wouter";

interface PublicArticle {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  author?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  viewCount?: number;
}

interface PublicArticleCardProps {
  article: PublicArticle;
}

export function PublicArticleCard({ article }: PublicArticleCardProps) {
  const excerpt = article.excerpt || article.content?.slice(0, 200).replace(/<[^>]*>/g, '') + '...';
  const authorName = article.author?.firstName 
    ? `${article.author.firstName} ${article.author.lastName || ''}`
    : article.author?.username || 'Anonymous';

  return (
    <Link href={`/read/${article.id}`}>
      <Card className="group cursor-pointer overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        {article.featuredImage && (
          <div className="relative h-48 overflow-hidden">
            <img 
              src={article.featuredImage} 
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            {article.category && (
              <Badge 
                className="absolute top-3 left-3 bg-[#B22234] text-white border-0 capitalize"
              >
                {article.category.replace('-', ' ')}
              </Badge>
            )}
          </div>
        )}
        
        <CardContent className={article.featuredImage ? "p-4" : "p-5"}>
          {!article.featuredImage && article.category && (
            <Badge 
              className="mb-3 bg-[#B22234]/10 text-[#B22234] border-[#B22234]/20 capitalize"
            >
              {article.category.replace('-', ' ')}
            </Badge>
          )}
          
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-[#B22234] transition-colors">
            {article.title}
          </h3>
          
          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 mb-4">
            {excerpt}
          </p>
          
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={article.author?.avatar || ''} />
                <AvatarFallback className="text-xs bg-[#3C3B6E] text-white">
                  {authorName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{authorName}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(article.createdAt), 'MMM d')}
              </span>
              {article.viewCount !== undefined && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {article.viewCount}
                </span>
              )}
            </div>
          </div>
          
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {article.tags.slice(0, 3).map((tag, index) => (
                <span 
                  key={index}
                  className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
