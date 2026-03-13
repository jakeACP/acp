import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ShareToMessagesModal } from "@/components/share-to-messages-modal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { sanitizeUrl } from "@/lib/utils";
import { Post, PostWithAuthor, Comment, Event } from "@shared/schema";
import { Heart, MessageCircle, Share, Flag, Send, Trash2, Link2, Repeat2, ThumbsDown, MapPin, Calendar, Users, ExternalLink, FileText, Clock, HandHeart, Briefcase, Mail, Phone, AlertCircle, CheckCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";
import { Link as WouterLink } from "wouter";
import { VideoEmbedDisplay } from "@/components/video-embed";
import { extractVideoEmbeds } from "@/lib/video-embed";

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
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [showShareToMessages, setShowShareToMessages] = useState(false);
  const [showVolunteerSignup, setShowVolunteerSignup] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");

  const { data: likeStatus } = useQuery<{ liked: boolean }>({
    queryKey: ["/api/likes", post.id, "post"],
    enabled: !!user && !!post.id,
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/posts/${post.id}/comments`],
    enabled: showComments && !!post.id,
  });

  const { data: userVoteData } = useQuery<{ optionId: string } | null>({
    queryKey: ["/api/polls", post.pollId, "my-vote"],
    enabled: !!user && !!post.pollId,
  });

  const { data: eventData, isLoading: eventLoading, isError: eventError } = useQuery<Event>({
    queryKey: [`/api/events/${post.eventId}`],
    enabled: !!post.eventId && post.type === "event",
    staleTime: 10 * 60 * 1000, // Cache event data for 10 minutes
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
      
      // Optimistically update the likes count in all feed variants
      const updateFeed = (old: any) => {
        if (!old) return old;
        return old.map((p: PostWithAuthor) => 
          p.id === post.id 
            ? { ...p, likesCount: (p.likesCount || 0) + (currentLiked ? -1 : 1) }
            : p
        );
      };
      
      queryClient.setQueryData(["/api/feeds/all"], updateFeed);
      queryClient.setQueryData(["/api/feeds/following"], updateFeed);
      queryClient.setQueryData(["/api/feeds/news"], updateFeed);
      
      // Return context for rollback
      return { previousLikeStatus, currentLiked };
    },
    onError: (err, variables, context: any) => {
      // Rollback on error
      if (context?.previousLikeStatus !== undefined) {
        queryClient.setQueryData(["/api/likes", post.id, "post"], context.previousLikeStatus);
      }
      // Revert the count in all feed variants
      const revertFeed = (old: any) => {
        if (!old) return old;
        return old.map((p: PostWithAuthor) => 
          p.id === post.id 
            ? { ...p, likesCount: (p.likesCount || 0) + (context?.currentLiked ? 1 : -1) }
            : p
        );
      };
      
      queryClient.setQueryData(["/api/feeds/all"], revertFeed);
      queryClient.setQueryData(["/api/feeds/following"], revertFeed);
      queryClient.setQueryData(["/api/feeds/news"], revertFeed);
    },
    onSettled: () => {
      // Refetch after mutation completes (success or error)
      queryClient.invalidateQueries({ queryKey: ["/api/likes", post.id, "post"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/news"] });
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

  const pollVoteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      if (!post.pollId) throw new Error("No poll ID");
      return await apiRequest(`/api/polls/${post.pollId}/vote`, "POST", { optionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls", post.pollId, "my-vote"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/news"] });
      toast({
        title: "Vote Cast",
        description: "Your vote has been recorded successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cast vote",
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
      // Immediately remove from feeds
      const removeFromFeed = (old: any) => {
        if (!old) return old;
        return old.filter((p: PostWithAuthor) => p.id !== post.id);
      };
      
      queryClient.setQueryData(["/api/feeds/all"], removeFromFeed);
      queryClient.setQueryData(["/api/feeds/following"], removeFromFeed);
      queryClient.setQueryData(["/api/feeds/news"], removeFromFeed);
    },
  });

  const hidePostMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/flags", "POST", {
        targetId: post.id,
        targetType: "post",
        reason: "not_interested",
      });
    },
    onSuccess: () => {
      // Immediately remove from feeds
      const removeFromFeed = (old: any) => {
        if (!old) return old;
        return old.filter((p: PostWithAuthor) => p.id !== post.id);
      };
      
      queryClient.setQueryData(["/api/feeds/all"], removeFromFeed);
      queryClient.setQueryData(["/api/feeds/following"], removeFromFeed);
      queryClient.setQueryData(["/api/feeds/news"], removeFromFeed);
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/posts/${post.id}`, "DELETE");
    },
    onSuccess: () => {
      // Immediately remove from feeds
      const removeFromFeed = (old: any) => {
        if (!old) return old;
        return old.filter((p: PostWithAuthor) => p.id !== post.id);
      };
      
      queryClient.setQueryData(["/api/feeds/all"], removeFromFeed);
      queryClient.setQueryData(["/api/feeds/following"], removeFromFeed);
      queryClient.setQueryData(["/api/feeds/news"], removeFromFeed);
      
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

  const volunteerSignupMutation = useMutation({
    mutationFn: async () => {
      const creatorName = post.author?.firstName && post.author?.lastName
        ? `${post.author.firstName} ${post.author.lastName}`
        : post.author?.username || "the organizer";
      const opportunityTitle = (post as any).volunteerTitle || "Volunteer Opportunity";

      // Record the signup
      await apiRequest(`/api/volunteer/${post.id}/signup`, "POST", {
        email: signupEmail.trim(),
        phone: signupPhone.trim(),
        message: `Name: ${signupName.trim()}\nEmail: ${signupEmail.trim()}\nPhone: ${signupPhone.trim()}`,
      });

      // Send a direct message to the creator
      const messageContent =
        `📋 Volunteer Sign-Up: ${opportunityTitle}\n\n` +
        `${signupName.trim()} would like to volunteer.\n\n` +
        `Name: ${signupName.trim()}\n` +
        `Email: ${signupEmail.trim()}\n` +
        `Phone: ${signupPhone.trim()}`;

      await apiRequest("/api/messages", "POST", {
        recipientId: post.authorId,
        content: messageContent,
      });
    },
    onSuccess: () => {
      setShowVolunteerSignup(false);
      toast({
        title: "Signed Up!",
        description: "Your info has been sent to the organizer.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sign up. You may have already signed up.",
        variant: "destructive",
      });
    },
  });

  const handleOpenVolunteerSignup = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to sign up for volunteer opportunities",
        variant: "destructive",
      });
      return;
    }
    const fullName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username || "";
    setSignupName(fullName);
    setSignupEmail((user as any).email || "");
    setSignupPhone((user as any).phoneNumber || "");
    setShowVolunteerSignup(true);
  };

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

  const handleHidePost = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to hide posts",
        variant: "destructive",
      });
      return;
    }
    hidePostMutation.mutate();
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
    <>
    <ShareToMessagesModal
      open={showShareToMessages}
      onOpenChange={setShowShareToMessages}
      postId={post.id}
      postContent={post.content}
    />
    <Card data-post-id={post.id}>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <WouterLink href={`/profile/${post.authorId}`}>
              <Avatar className="cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarImage src={post.author?.avatar || undefined} alt={getDisplayName()} />
                <AvatarFallback>
                  {post.authorId.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </WouterLink>
            <div>
              <WouterLink href={`/profile/${post.authorId}`}>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 hover:text-primary cursor-pointer transition-colors" data-testid={`link-author-${post.authorId}`}>
                  {getDisplayName()}
                </h4>
              </WouterLink>
              <p className="text-sm text-white">
                {timeAgo || "Recently"}
              </p>
            </div>
          </div>
          
          {post.tags && post.tags.length > 0 && (
            post.tags[0].startsWith("@") ? (
              <WouterLink href={`/politicians/handle/${post.tags[0].slice(1)}`}>
                <Badge className="bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
                  {post.tags[0]}
                </Badge>
              </WouterLink>
            ) : (
              <Badge className={getTagColor(post.tags[0])}>
                {post.tags[0]}
              </Badge>
            )
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Article/Blog type posts */}
        {post.type === "blog" ? (
          <WouterLink href={`/article/${post.id}`}>
            <div className="group cursor-pointer mb-4">
              {/* Featured Image */}
              {post.featuredImage && (
                <div className="relative overflow-hidden rounded-lg mb-4">
                  <img 
                    src={post.featuredImage} 
                    alt={post.title || "Article image"}
                    className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
              
              {/* Article Badge */}
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Article
                </Badge>
                {post.readingTime && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readingTime} min read
                  </span>
                )}
              </div>
              
              {/* Title */}
              {post.title && (
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
                  {post.title}
                </h3>
              )}
              
              {/* Excerpt/Description */}
              <p className="text-slate-600 dark:text-slate-300 line-clamp-3 mb-3">
                {post.excerpt || post.content}
              </p>
              
              {/* Read More Link */}
              <span className="text-primary font-medium group-hover:underline flex items-center gap-1">
                Read full article
                <ExternalLink className="w-4 h-4" />
              </span>
            </div>
          </WouterLink>
        ) : (
          <>
            <p className="text-slate-900 dark:text-slate-100 mb-4 whitespace-pre-wrap">
              {post.content}
            </p>
        
        {post.linkPreview && extractVideoEmbeds(post.linkPreview.url).length === 0 && (
          <div className="mb-4 border border-border rounded-lg overflow-hidden bg-card hover:bg-accent/10 transition-colors">
            <a href={sanitizeUrl(post.linkPreview.url)} target="_blank" rel="noopener noreferrer" className="block">
              {post.linkPreview.image && (
                <div className="w-full h-48 bg-muted">
                  <img 
                    src={post.linkPreview.image} 
                    alt={post.linkPreview.title || 'Link preview'} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                {post.linkPreview.siteName && (
                  <p className="text-xs text-muted-foreground mb-1">{post.linkPreview.siteName}</p>
                )}
                {post.linkPreview.title && (
                  <h4 className="font-semibold text-foreground mb-1 line-clamp-2">{post.linkPreview.title}</h4>
                )}
                {post.linkPreview.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{post.linkPreview.description}</p>
                )}
                <p className="text-xs text-primary mt-2">{new URL(post.linkPreview.url).hostname}</p>
              </div>
            </a>
          </div>
        )}
        
        {post.image && (
          <div
            className="mb-4 border border-border rounded-xl overflow-hidden bg-card cursor-pointer group"
            onClick={() => setExpandedImage(post.image)}
            data-testid={`image-post-${post.id}`}
          >
            <img
              src={post.image}
              alt="Post content"
              className="w-full h-auto max-h-96 object-contain group-hover:opacity-90 transition-opacity"
            />
          </div>
        )}
        
        {/* Image Expand Modal */}
        <Dialog open={!!expandedImage} onOpenChange={(open) => !open && setExpandedImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex items-center justify-center p-2">
            {expandedImage && (
              <img
                src={expandedImage}
                alt="Expanded post content"
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>
        
        {post.pollOptions && post.pollOptions.length > 0 && (
          <div className="mb-4 border border-border rounded-lg p-4 bg-card">
            {post.pollTitle && (
              <h3 className="font-semibold text-foreground mb-2">{post.pollTitle}</h3>
            )}
            {post.pollDescription && (
              <p className="text-sm text-muted-foreground mb-4">{post.pollDescription}</p>
            )}
            <div className="space-y-2">
              {post.pollOptions.map((option: any) => {
                const hasVoted = !!userVoteData?.optionId;
                const isUserChoice = userVoteData?.optionId === option.id;
                const percentage = post.pollTotalVotes ? Math.round((option.votes / post.pollTotalVotes) * 100) : 0;
                
                return (
                  <div key={option.id}>
                    {hasVoted ? (
                      <div className="relative bg-muted rounded p-3">
                        <div 
                          className="absolute inset-0 bg-primary/20 rounded transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                        <div className="relative flex items-center justify-between">
                          <span className={`font-medium ${isUserChoice ? 'text-primary' : 'text-foreground'}`}>
                            {option.text} {isUserChoice && '✓'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {option.votes} ({percentage}%)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          if (!user) {
                            toast({
                              title: "Login Required",
                              description: "Please log in to vote on polls",
                              variant: "destructive",
                            });
                            return;
                          }
                          pollVoteMutation.mutate(option.id);
                        }}
                        disabled={pollVoteMutation.isPending}
                        data-testid={`button-poll-option-${option.id}`}
                      >
                        {option.text}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between">
              <span>{post.pollTotalVotes || 0} {(post.pollTotalVotes || 0) === 1 ? 'vote' : 'votes'}</span>
              {post.pollEndDate && (
                <span>Ends {formatDistanceToNow(new Date(post.pollEndDate), { addSuffix: true })}</span>
              )}
            </div>
          </div>
        )}
        
        {post.type === "event" && post.eventId && (
          <div className="mb-4 border border-border rounded-lg overflow-hidden bg-gradient-to-br from-primary/5 to-blue-500/5">
            {eventLoading ? (
              <div className="p-4 space-y-3">
                <div className="h-6 w-3/4 bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-5/6 bg-muted animate-pulse rounded"></div>
                <div className="h-10 w-full bg-muted animate-pulse rounded"></div>
              </div>
            ) : eventError || !eventData ? (
              <div className="p-4 text-center text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Event details unavailable</p>
              </div>
            ) : (
              <>
                {eventData.image && (
                  <div className="w-full h-48 bg-muted">
                    <img 
                      src={eventData.image} 
                      alt={eventData.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-foreground mb-2">{eventData.title}</h3>
                  {eventData.description && (
                    <p className="text-sm text-muted-foreground mb-3">{eventData.description}</p>
                  )}
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2 text-sm">
                      <Calendar className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <div>
                        <div className="font-medium text-foreground">
                          {format(new Date(eventData.startDate), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                        </div>
                        {eventData.endDate && (
                          <div className="text-xs text-muted-foreground">
                            Until {format(new Date(eventData.endDate), "h:mm a")}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <div>
                        {eventData.isVirtual ? (
                          <div>
                            <div className="font-medium text-foreground">Virtual Event</div>
                            {eventData.virtualLink && (
                              <a 
                                href={sanitizeUrl(eventData.virtualLink)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                Join online <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-foreground">{eventData.location}</div>
                            {eventData.address && (
                              <div className="text-xs text-muted-foreground">{eventData.address}</div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {eventData.city}, {eventData.state} {eventData.zipCode || ''}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {eventData.maxAttendees && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="text-foreground">
                          {eventData.currentAttendees || 0} / {eventData.maxAttendees} attendees
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <WouterLink href={`/events`}>
                    <Button variant="default" className="w-full" size="sm">
                      View Event Details
                    </Button>
                  </WouterLink>
                </div>
              </>
            )}
          </div>
        )}

        {post.type === "volunteer" && (
          <div className="mb-4 border border-border rounded-lg overflow-hidden bg-card border-l-4 border-l-teal-500">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-teal-500/15">
                    <HandHeart className="h-5 w-5 text-teal-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{(post as any).volunteerTitle || "Volunteer Opportunity"}</h3>
                    {(post as any).volunteerOrganization && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {(post as any).volunteerOrganization}
                      </p>
                    )}
                  </div>
                </div>
                {(post as any).volunteerUrgency && (post as any).volunteerUrgency !== "normal" && (
                  <Badge variant={(post as any).volunteerUrgency === "critical" ? "destructive" : "secondary"} className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {(post as any).volunteerUrgency === "critical" ? "Urgent Need" : "Urgent"}
                  </Badge>
                )}
              </div>

              <div className="space-y-2 mb-3">
                {((post as any).volunteerLocation || (post as any).volunteerIsRemote) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-teal-500" />
                    <span className="text-foreground">
                      {(post as any).volunteerIsRemote ? "Remote / Virtual" : (post as any).volunteerLocation}
                    </span>
                  </div>
                )}

                {((post as any).volunteerStartDate || (post as any).volunteerEndDate) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-teal-500" />
                    <span className="text-foreground">
                      {(post as any).volunteerStartDate && format(new Date((post as any).volunteerStartDate), "MMM d, yyyy")}
                      {(post as any).volunteerEndDate && ` - ${format(new Date((post as any).volunteerEndDate), "MMM d, yyyy")}`}
                    </span>
                  </div>
                )}

                {(post as any).volunteerCommitment && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-teal-500" />
                    <span className="text-foreground">{(post as any).volunteerCommitment}</span>
                  </div>
                )}

                {(post as any).volunteerSpotsTotal && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-teal-500" />
                    <span className="text-foreground">
                      {(post as any).volunteerSpotsAvailable || (post as any).volunteerSpotsTotal} spots available
                    </span>
                  </div>
                )}
              </div>

              {(post as any).volunteerSkills && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Skills Needed:</p>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const raw = (post as any).volunteerSkills;
                      const skillsArray: string[] = Array.isArray(raw)
                        ? raw
                        : typeof raw === "string"
                        ? raw.split(",").map((s: string) => s.trim()).filter((s: string) => s)
                        : [];
                      return (
                        <>
                          {skillsArray.slice(0, 5).map((skill: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs bg-teal-500/10 border-teal-500/30 text-foreground">
                              {skill}
                            </Badge>
                          ))}
                          {skillsArray.length > 5 && (
                            <Badge variant="outline" className="text-xs">+{skillsArray.length - 5} more</Badge>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {(post as any).volunteerRequirements && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Requirements:</p>
                  <p className="text-sm text-foreground">{(post as any).volunteerRequirements}</p>
                </div>
              )}

              {(post as any).volunteerCategory && (
                <Badge variant="secondary" className="mb-3 capitalize">
                  {(post as any).volunteerCategory}
                </Badge>
              )}

              {((post as any).volunteerContactEmail || (post as any).volunteerContactPhone) && (
                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border">
                  {(post as any).volunteerContactEmail && (
                    <a 
                      href={`mailto:${(post as any).volunteerContactEmail}`}
                      className="flex items-center gap-1 text-sm text-teal-500 hover:underline"
                      data-testid={`link-volunteer-email-${post.id}`}
                    >
                      <Mail className="h-3 w-3" />
                      Email
                    </a>
                  )}
                  {(post as any).volunteerContactPhone && (
                    <a 
                      href={`tel:${(post as any).volunteerContactPhone}`}
                      className="flex items-center gap-1 text-sm text-teal-500 hover:underline"
                      data-testid={`link-volunteer-phone-${post.id}`}
                    >
                      <Phone className="h-3 w-3" />
                      Call
                    </a>
                  )}
                </div>
              )}

              <Button 
                variant="default" 
                className="w-full mt-3 bg-teal-600 hover:bg-teal-700"
                size="sm"
                onClick={handleOpenVolunteerSignup}
                data-testid={`button-volunteer-signup-${post.id}`}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Sign Up to Volunteer
              </Button>

              <Dialog open={showVolunteerSignup} onOpenChange={setShowVolunteerSignup}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <HandHeart className="h-5 w-5 text-teal-600" />
                      Sign Up to Volunteer
                    </DialogTitle>
                    <DialogDescription>
                      Can we share this info with{" "}
                      <span className="font-semibold text-foreground">
                        {post.author?.firstName && post.author?.lastName
                          ? `${post.author.firstName} ${post.author.lastName}`
                          : post.author?.username || "the organizer"}
                      </span>
                      ?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                      <Input
                        placeholder="Your full name"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                      <Input
                        type="tel"
                        placeholder="Your phone number"
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                      <Input
                        type="email"
                        placeholder="Your email address"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowVolunteerSignup(false)}
                        disabled={volunteerSignupMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-teal-600 hover:bg-teal-700"
                        onClick={() => volunteerSignupMutation.mutate()}
                        disabled={volunteerSignupMutation.isPending || !signupName.trim() || !signupEmail.trim()}
                      >
                        {volunteerSignupMutation.isPending ? "Submitting..." : "Submit"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
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
                              <WouterLink href={`/profile/${comment.authorId}`}>
                                <Avatar className="h-6 w-6 cursor-pointer hover:opacity-80 transition-opacity">
                                  <AvatarFallback className="text-xs">
                                    {comment.authorId.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </WouterLink>
                              <WouterLink href={`/profile/${comment.authorId}`}>
                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-primary cursor-pointer transition-colors" data-testid={`link-comment-author-${comment.authorId}`}>
                                  {comment.authorId}
                                </span>
                              </WouterLink>
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
                  className="hover:text-primary p-2"
                  data-testid="button-share"
                  title="Share"
                >
                  <Share className="h-4 w-4" />
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
                  onClick={() => setShowShareToMessages(true)}
                  data-testid="button-share-to-messages"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Share in Messages
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
          
          <div className="flex items-center gap-1">
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleHidePost}
                className="hover:text-orange-500 p-2"
                data-testid="button-hide"
                title="Not interested"
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            )}
            
            {user && (user.id === post.authorId || user.role === 'admin' || user.role === 'moderator') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeletePost}
                disabled={deletePostMutation.isPending}
                className="hover:text-red-500 text-red-600 p-2"
                data-testid="button-delete-post"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFlag}
              className="hover:text-red-500 p-2"
              data-testid="button-flag"
              title="Report"
            >
              <Flag className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </>
        )}
      </CardContent>
    </Card>
    {post.type !== "blog" && <VideoEmbedDisplay content={post.content} postId={post.id} />}
    </>
  );
}
