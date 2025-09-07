import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Post, PostWithAuthor, Comment } from "@shared/schema";
import { Heart, MessageCircle, Share, Flag, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

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
    queryKey: ["/api/posts", post.id, "comments"],
    enabled: showComments && !!post.id,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/likes", "POST", {
        targetId: post.id,
        targetType: "post",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/likes", post.id, "post"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/posts", post.id, "comments"] });
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

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/posts/${post.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out this post",
          text: post.content.slice(0, 100) + (post.content.length > 100 ? "..." : ""),
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback: copy to clipboard
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
    }
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {post.authorId.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold text-slate-900">{getDisplayName()}</h4>
              <p className="text-sm text-slate-500">
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
        <p className="text-slate-900 mb-4 whitespace-pre-wrap">
          {post.content}
        </p>
        
        {post.image && (
          <img
            src={post.image}
            alt="Post content"
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}
        
        <div className="flex items-center justify-between text-slate-500">
          <div className="flex space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={likeMutation.isPending}
              className={`flex items-center gap-2 ${
                likeStatus?.liked ? "text-red-500" : "hover:text-red-500"
              }`}
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
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-sm text-slate-600 mb-2">Original Post:</p>
                    <p className="text-slate-900">{post.content}</p>
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
                      <p className="text-center text-slate-500 py-4">No comments yet</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {comment.authorId.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{getDisplayName()}</span>
                            <span className="text-xs text-slate-500">
                              {comment.createdAt && formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-slate-900">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="flex items-center gap-2 hover:text-primary"
              data-testid="button-share"
            >
              <Share className="h-4 w-4" />
              Share
            </Button>
          </div>
          
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
      </CardContent>
    </Card>
  );
}
