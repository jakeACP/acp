import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Clock, User, Share2, Heart, MessageCircle, Bookmark, Eye } from "lucide-react";
import { format } from "date-fns";
import type { Post, User as UserType } from "@shared/schema";

type PostWithAuthor = Post & {
  author?: UserType;
};

export default function ArticlePage() {
  const [match, params] = useRoute("/article/:id");
  const [, navigate] = useLocation();
  const articleId = params?.id;

  const { data: article, isLoading, error } = useQuery<PostWithAuthor>({
    queryKey: ["/api/posts", articleId],
    enabled: !!articleId,
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="h-64 w-full mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              {error ? "Error loading article" : "Article not found"}
            </p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Back to Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const wordCount = article.articleBody 
    ? article.articleBody.replace(/<[^>]*>/g, "").split(/\s+/).length 
    : 0;
  const estimatedReadingTime = article.readingTime || Math.ceil(wordCount / 200);

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header - Liquid Glass with 3D Effect */}
      <div className="sticky top-0 z-10 backdrop-blur-3xl bg-white/30 dark:bg-slate-900/30 border-b border-white/30
        shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.4)]">
        <div className="container max-w-4xl mx-auto py-4 px-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            data-testid="button-back-to-feed"
            className="text-foreground hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Feed
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" data-testid="button-share" className="hover:bg-white/20">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" data-testid="button-bookmark" className="hover:bg-white/20">
              <Bookmark className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      {article.featuredImage && (
        <div className="w-full h-64 md:h-96 relative">
          <img 
            src={article.featuredImage} 
            alt={article.title || "Article featured image"}
            className="w-full h-full object-cover"
            data-testid="img-featured"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      {/* Article Content - Liquid Glass Panel with 3D Glass Effect */}
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <article className="relative backdrop-blur-3xl bg-white/30 dark:bg-slate-900/30 rounded-2xl p-6 md:p-8 
          border border-white/30
          shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.1)]
          before:absolute before:inset-0 before:rounded-2xl before:p-[1px] 
          before:bg-gradient-to-br before:from-white/50 before:via-transparent before:to-white/20 before:pointer-events-none
          after:absolute after:inset-[1px] after:rounded-[15px] after:pointer-events-none
          after:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.25),inset_-2px_-2px_4px_rgba(0,0,0,0.1)]">
          {/* Title Section */}
          <header className="mb-8">
            <h1 
              className="text-3xl md:text-4xl font-bold mb-4 text-foreground"
              data-testid="text-article-title"
            >
              {article.title || "Untitled Article"}
            </h1>
            
            {article.excerpt && (
              <p 
                className="text-xl text-muted-foreground mb-6"
                data-testid="text-article-excerpt"
              >
                {article.excerpt}
              </p>
            )}

            {/* Author & Meta */}
            <div className="flex flex-wrap items-center gap-4 py-4 border-y border-white/10">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={article.author?.avatar || undefined} />
                  <AvatarFallback>
                    {article.author?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p 
                    className="font-medium text-foreground"
                    data-testid="text-author-name"
                  >
                    {article.author?.firstName && article.author?.lastName 
                      ? `${article.author.firstName} ${article.author.lastName}`
                      : article.author?.username || "Anonymous"
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{article.author?.username || "unknown"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground ml-auto">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {article.createdAt 
                    ? format(new Date(article.createdAt), "MMMM d, yyyy")
                    : "Unknown date"
                  }
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {estimatedReadingTime} min read
                </span>
              </div>
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {article.tags.map((tag, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className="cursor-pointer bg-white/20 hover:bg-white/30 border-white/10"
                    onClick={() => navigate(`/?tag=${tag}`)}
                    data-testid={`badge-tag-${index}`}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          {/* Article Body */}
          <div 
            className="prose prose-lg dark:prose-invert max-w-none 
                       prose-headings:font-bold prose-headings:text-foreground
                       prose-p:text-foreground/90
                       prose-a:text-blue-500 hover:prose-a:underline
                       prose-img:rounded-lg prose-img:shadow-lg
                       prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-white/10 prose-blockquote:py-2 prose-blockquote:px-4
                       prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded"
            dangerouslySetInnerHTML={{ 
              __html: article.articleBody || article.content || "<p>No content available.</p>" 
            }}
            data-testid="article-body"
          />

          {/* Article Footer */}
          <footer className="mt-12 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" data-testid="button-like" className="bg-white/10 border-white/20 hover:bg-white/20">
                  <Heart className="w-4 h-4 mr-2" />
                  {article.likesCount || 0}
                </Button>
                <Button variant="outline" size="sm" data-testid="button-comment" className="bg-white/10 border-white/20 hover:bg-white/20">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {article.commentsCount || 0}
                </Button>
                <Button variant="outline" size="sm" data-testid="button-share-footer" className="bg-white/10 border-white/20 hover:bg-white/20">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => navigate("/")}
                data-testid="button-back-bottom"
                className="hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Feed
              </Button>
            </div>
          </footer>
        </article>

        {/* Author Card - Liquid Glass with 3D Glass Effect */}
        {article.author && (
          <Card className="mt-8 relative backdrop-blur-3xl bg-white/30 dark:bg-slate-900/30 
            border border-white/30
            shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.1)]
            before:absolute before:inset-0 before:rounded-xl before:p-[1px] 
            before:bg-gradient-to-br before:from-white/50 before:via-transparent before:to-white/20 before:pointer-events-none
            after:absolute after:inset-[1px] after:rounded-[11px] after:pointer-events-none
            after:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.25),inset_-2px_-2px_4px_rgba(0,0,0,0.1)]">
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={article.author.avatar || undefined} />
                  <AvatarFallback className="text-xl">
                    {article.author.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg text-foreground">
                    {article.author.firstName && article.author.lastName 
                      ? `${article.author.firstName} ${article.author.lastName}`
                      : article.author.username
                    }
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">@{article.author.username}</CardDescription>
                  {article.author.bio && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {article.author.bio}
                    </p>
                  )}
                </div>
                <Button 
                  variant="outline"
                  onClick={() => navigate(`/profile/${article.author?.username}`)}
                  data-testid="button-view-profile"
                  className="bg-white/10 border-white/20 hover:bg-white/20"
                >
                  View Profile
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
