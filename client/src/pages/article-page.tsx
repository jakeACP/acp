import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
import DOMPurify from "dompurify";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar, Clock, User, Share2, Heart, MessageCircle, Bookmark, Eye, Pencil, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ShareSheet } from "@/components/share-sheet";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import { Link as WouterLink } from "wouter";
import type { Post, User as UserType } from "@shared/schema";

type PostWithAuthor = Post & {
  author?: UserType;
};

type ArticleComment = {
  id: string;
  authorId: string;
  content: string;
  createdAt: string | null;
  authorUsername?: string;
  authorFirstName?: string;
  authorLastName?: string;
  authorAvatar?: string;
};

export default function ArticlePage() {
  const [match, params] = useRoute("/article/:id");
  const [, navigate] = useLocation();
  const articleId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const commentsRef = useRef<HTMLDivElement>(null);

  const { data: article, isLoading, error } = useQuery<PostWithAuthor>({
    queryKey: ["/api/posts", articleId],
    enabled: !!articleId,
  });

  const { data: likeStatus } = useQuery<{ liked: boolean }>({
    queryKey: ["/api/likes", articleId, "post"],
    enabled: !!user && !!articleId,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery<ArticleComment[]>({
    queryKey: [`/api/posts/${articleId}/comments`],
    enabled: !!articleId,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/likes", "POST", {
        targetId: articleId,
        targetType: "post",
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/likes", articleId, "post"] });
      const previousLikeStatus = queryClient.getQueryData(["/api/likes", articleId, "post"]);
      const currentLiked = likeStatus?.liked ?? false;
      queryClient.setQueryData(["/api/likes", articleId, "post"], { liked: !currentLiked });
      queryClient.setQueryData(["/api/posts", articleId], (old: any) =>
        old ? { ...old, likesCount: (old.likesCount || 0) + (currentLiked ? -1 : 1) } : old
      );
      return { previousLikeStatus, currentLiked };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previousLikeStatus !== undefined) {
        queryClient.setQueryData(["/api/likes", articleId, "post"], context.previousLikeStatus);
      }
      queryClient.setQueryData(["/api/posts", articleId], (old: any) =>
        old ? { ...old, likesCount: (old.likesCount || 0) + (context?.currentLiked ? 1 : -1) } : old
      );
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/likes", articleId, "post"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", articleId] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/news"] });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("/api/comments", "POST", {
        postId: articleId,
        content: content.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${articleId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", articleId] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/news"] });
      setNewComment("");
      toast({
        title: "Comment Added",
        description: "Your comment has been posted!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const handleLike = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like articles",
        variant: "destructive",
      });
      return;
    }
    likeMutation.mutate();
  };

  const handleSubmitComment = () => {
    if (!newComment.trim() || createCommentMutation.isPending) return;
    createCommentMutation.mutate(newComment);
  };

  const scrollToComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
      <div className="sticky top-0 z-10 glass-card !rounded-none border-b border-white/20">
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
            {user && article && user.id === article.authorId && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(`/write/${article.id}`)}
                data-testid="button-edit-article" 
                className="hover:bg-white/20"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            <ShareSheet
              title={article.title || "ACP Article"}
              text={article.excerpt || article.title || ""}
              url={`${window.location.origin}/read/${article.id}`}
              trigger={(open) => (
                <Button variant="ghost" size="icon" data-testid="button-share" className="hover:bg-white/20" onClick={open}>
                  <Share2 className="w-4 h-4" />
                </Button>
              )}
            />
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
        <Card className="p-6 md:p-8">
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
              __html: DOMPurify.sanitize(article.articleBody || article.content || "<p>No content available.</p>") 
            }}
            data-testid="article-body"
          />

          {/* Article Footer */}
          <footer className="mt-12 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-like"
                  onClick={handleLike}
                  disabled={likeMutation.isPending}
                  className={`bg-white/10 border-white/20 hover:bg-white/20 ${likeStatus?.liked ? "text-red-500" : ""}`}
                >
                  <Heart className={`w-4 h-4 mr-2 ${likeStatus?.liked ? "fill-current" : ""}`} />
                  {article.likesCount || 0}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-comment"
                  onClick={scrollToComments}
                  className="bg-white/10 border-white/20 hover:bg-white/20"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {article.commentsCount || 0}
                </Button>
                <ShareSheet
                  title={article.title || "ACP Article"}
                  text={article.excerpt || article.title || ""}
                  url={`${window.location.origin}/read/${article.id}`}
                  trigger={(open) => (
                    <Button variant="outline" size="sm" data-testid="button-share-footer" className="bg-white/10 border-white/20 hover:bg-white/20" onClick={open}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  )}
                />
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
        </Card>

        {/* Comments Section */}
        <Card className="mt-8 glass-card" ref={commentsRef}>
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* New comment form */}
            {user ? (
              <div className="flex gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback>
                    {user.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts on this article..."
                    className="min-h-[80px] bg-white/10 border-white/20"
                    data-testid="input-comment"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || createCommentMutation.isPending}
                      data-testid="button-submit-comment"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {createCommentMutation.isPending ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                <WouterLink href="/auth" className="text-blue-500 hover:underline">
                  Sign in
                </WouterLink>{" "}
                to join the conversation
              </p>
            )}

            {/* Comment list */}
            {commentsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-comments">
                No comments yet. Be the first to share your thoughts!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3" data-testid={`comment-${comment.id}`}>
                    <WouterLink href={`/profile/${comment.authorId}`}>
                      <Avatar className="h-9 w-9 shrink-0 cursor-pointer">
                        <AvatarImage src={comment.authorAvatar || undefined} />
                        <AvatarFallback>
                          {(comment.authorFirstName?.[0] || comment.authorUsername?.[0] || "?").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </WouterLink>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <WouterLink href={`/profile/${comment.authorId}`}>
                          <span className="text-sm font-medium text-foreground hover:text-blue-500 cursor-pointer transition-colors">
                            {comment.authorFirstName && comment.authorLastName
                              ? `${comment.authorFirstName} ${comment.authorLastName}`
                              : comment.authorUsername || "Unknown"}
                          </span>
                        </WouterLink>
                        {comment.createdAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Author Card - Liquid Glass with 3D Glass Effect */}
        {article.author && (
          <Card className="mt-8 glass-card">
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
