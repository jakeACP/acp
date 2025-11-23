import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Post, PostWithAuthor, Comment } from "@shared/schema";
import { Heart, MessageCircle, Share, Flag, Send, Trash2, Link2, Repeat2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Link } from "wouter";
import { VideoEmbedDisplay } from "@/components/video-embed";

interface PostCardProps {
  post: PostWithAuthor;
}

export function PostCard({ post }: PostCardProps) {
  const getDisplayName = () => {
    if (post.author?.firstName && post.author?.lastName) {
      return `${post.author.firstName} ${post.author.lastName}`;
    } else if (post.author?.username) {
      return post.author.username;
    }
    return "Community Member";
  };
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  const { data: likeStatus } = useQuery<{ liked: boolean }>({
    queryKey: ["/api/likes", post.id, "post"],
    enabled: !!user && !!post.id,
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/posts/${post.id}/comments`],
    enabled: showComments && !!post.id,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/likes", "POST", {
        targetId: post.id,
        targetType: "post",
      });
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/likes", post.id, "post"] });
      
      // Snapshot the previous value
      const previousLikeStatus = queryClient.getQueryData(["/api/likes", post.id, "post"]);
      
      // Optimistically update the like status
      const currentLiked = likeStatus?.liked ?? false;
      queryClient.setQueryData(["/api/likes", post.id, "post"], { liked: !currentLiked });
      
      // Optimistically update the likes count in the feed
      queryClient.setQueriesData({ queryKey: ["/api/feeds"] }, (old: any) => {
        if (!old) return old;
        return old.map((p: PostWithAuthor) => 
          p.id === post.id 
            ? { ...p, likesCount: (p.likesCount || 0) + (currentLiked ? -1 : 1) }
            : p
        );
      });
      
      // Return context for rollback
      return { previousLikeStatus, currentLiked };
    },
    onError: (err, variables, context: any) => {
      // Rollback on error
      if (context?.previousLikeStatus !== undefined) {
        queryClient.setQueryData(["/api/likes", post.id, "post"], context.previousLikeStatus);
      }
      // Revert the count
      queryClient.setQueriesData({ queryKey: ["/api/feeds"] }, (old: any) => {
        if (!old) return old;
        return old.map((p: PostWithAuthor) => 
          p.id === post.id 
            ? { ...p, likesCount: (p.likesCount || 0) + (context?.currentLiked ? 1 : -1) }
            : p
        );
      });
    },
    onSettled: () => {
      // Refetch after mutation completes (success or error)
      queryClient.invalidateQueries({ queryKey: ["/api/likes", post.id, "post"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds"] });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("/api/comments", "POST", {
        postId: post.id,
        content: content.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setNewComment("");
      toast({
        title: "Comment Added",
        description: "Your comment has been posted successfully!",
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

  const flagMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/flags", "POST", {
        targetId: post.id,
        targetType: "post",
        reason: "inappropriate_content",
      });
    },
    onSuccess: () => {
      toast({
        title: "Content Flagged",
        description: "Thank you for reporting this content. We'll review it shortly.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to flag content",
        variant: "destructive",
      });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/posts/${post.id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Post Deleted",
        description: "Your post has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return await apiRequest(`/api/comments/${commentId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.id}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Comment Deleted",
        description: "Your comment has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const shareToFeedMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/posts/${post.id}/share`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Shared!",
        description: "This post has been shared to your feed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to share post",
        variant: "destructive",
      });
    },
  });

  const handleLike = () => {
    if (user) {
      likeMutation.mutate();
    }
  };

  const handleComment = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to comment on posts",
        variant: "destructive",
      });
      return;
    }
    setShowComments(true);
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/posts/${post.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied",
        description: "Post link has been copied to your clipboard!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleShareToFeed = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to share posts",
        variant: "destructive",
      });
      return;
    }
    shareToFeedMutation.mutate();
  };

  const handleFlag = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to flag content",
        variant: "destructive",
      });
      return;
    }
    flagMutation.mutate();
  };

  const handleDeletePost = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to delete posts",
        variant: "destructive",
      });
      return;
    }
    deletePostMutation.mutate();
  };

  const handleDeleteComment = (commentId: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to delete comments",
        variant: "destructive",
      });
      return;
    }
    deleteCommentMutation.mutate(commentId);
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) {
      toast({
        title: "Empty Comment",
        description: "Please enter a comment before submitting",
        variant: "destructive",
      });
      return;
    }
    createCommentMutation.mutate(newComment);
  };

  const getTagColor = (tag: string) => {
    switch (tag.toLowerCase()) {
      case "climate":
        return "bg-green-100 text-green-800";
      case "education":
        return "bg-blue-100 text-blue-800";
      case "corruption":
        return "bg-red-100 text-red-800";
      case "healthcare":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const timeAgo = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
    : "";

  return (
    <Card data-post-id={post.id}>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.authorId}`}>
              <Avatar className="cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarFallback>
                  {post.authorId.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link href={`/profile/${post.authorId}`}>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 hover:text-primary cursor-pointer transition-colors" data-testid={`link-author-${post.authorId}`}>
                  {getDisplayName()}
                </h4>
              </Link>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {timeAgo || "Recently"}
              </p>
            </div>
          </div>
          
          {post.tags && post.tags.length > 0 && (
            <Badge className={getTagColor(post.tags[0])}>
              {post.tags[0]}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-slate-900 dark:text-slate-100 mb-4 whitespace-pre-wrap">
          {post.content}
        </p>
        
        <VideoEmbedDisplay content={post.content} postId={post.id} />
        
        {post.image && (
          <img
            src={post.image}
            alt="Post content"
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}
        
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <div className="flex space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`flex items-center gap-2 ${
                likeStatus?.liked ? "text-red-500" : "hover:text-red-500"
              }`}
              data-testid={`button-like-${post.id}`}
            >
              <Heart className={`h-4 w-4 ${likeStatus?.liked ? "fill-current" : ""}`} />
              <span>{post.likesCount || 0}</span>
            </Button>
            
            <Dialog open={showComments} onOpenChange={setShowComments}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleComment}
                  className="flex items-center gap-2 hover:text-primary"
                  data-testid="button-comment"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{post.commentsCount || 0}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Comments</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Original Post:</p>
                    <p className="text-slate-900 dark:text-slate-100">{post.content}</p>
                  </div>
                  
                  {user && (
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1"
                        data-testid="input-comment"
                      />
                      <Button
                        onClick={handleSubmitComment}
                        disabled={createCommentMutation.isPending || !newComment.trim()}
                        size="sm"
                        data-testid="button-submit-comment"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-center text-slate-500 dark:text-slate-400 py-4">No comments yet</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Link href={`/profile/${comment.authorId}`}>
                                <Avatar className="h-6 w-6 cursor-pointer hover:opacity-80 transition-opacity">
                                  <AvatarFallback className="text-xs">
                                    {comment.authorId.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </Link>
                              <Link href={`/profile/${comment.authorId}`}>
                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-primary cursor-pointer transition-colors" data-testid={`link-comment-author-${comment.authorId}`}>
                                  {comment.authorId}
                                </span>
                              </Link>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {comment.createdAt && formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            
                            {user && (user.id === comment.authorId || user.role === 'admin' || user.role === 'moderator') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteComment(comment.id)}
                                disabled={deleteCommentMutation.isPending}
                                className="flex items-center gap-1 hover:text-red-500 text-red-600 h-6 px-2"
                                data-testid={`button-delete-comment-${comment.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                                <span className="text-xs">
                                  {deleteCommentMutation.isPending ? "..." : "Delete"}
                                </span>
                              </Button>
                            )}
                          </div>
                          <p className="text-slate-900 dark:text-slate-100">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 hover:text-primary"
                  data-testid="button-share"
                >
                  <Share className="h-4 w-4" />
                  Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem 
                  onClick={handleShareToFeed}
                  disabled={shareToFeedMutation.isPending}
                  data-testid="button-share-to-feed"
                >
                  <Repeat2 className="h-4 w-4 mr-2" />
                  Share to My Feed
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleCopyLink}
                  data-testid="button-copy-link"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center gap-2">
            {user && (user.id === post.authorId || user.role === 'admin' || user.role === 'moderator') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeletePost}
                disabled={deletePostMutation.isPending}
                className="flex items-center gap-2 hover:text-red-500 text-red-600"
                data-testid="button-delete-post"
              >
                <Trash2 className="h-4 w-4" />
                {deletePostMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFlag}
              disabled={flagMutation.isPending}
              className="flex items-center gap-2 hover:text-red-500"
              data-testid="button-flag"
            >
              <Flag className="h-4 w-4" />
              {flagMutation.isPending ? "Flagging..." : "Flag"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
