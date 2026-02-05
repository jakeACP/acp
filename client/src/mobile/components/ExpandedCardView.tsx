import { useState, useRef, useEffect, useCallback } from "react";
import { X, Heart, MessageCircle, Share2, ChevronDown, Check, Flag, Send, Trash2, Copy, CheckCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import DOMPurify from "dompurify";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { sanitizeUrl } from "@/lib/utils";
import { LazyYouTubePlayer, LazyTikTokPlayer } from "./LazyYouTubeThumbnail";
import { findVideoInPost } from "../utils/youtube";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface Comment {
  id: string;
  content: string;
  authorId: string;
  createdAt?: string | Date | null;
  author?: {
    username: string;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  };
}

interface ExpandedCardViewProps {
  item: {
    type: string;
    data: any;
    event?: any;
  };
  onClose: () => void;
}

function PostActionBar({ postId, postType, likesCount, commentsCount, sharesCount }: {
  postId: string;
  postType: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showReported, setShowReported] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const isSignal = postType === 'signal';

  const { data: likeStatus } = useQuery<{ liked: boolean }>({
    queryKey: ["/api/likes", postId, "post"],
    enabled: !!user && !!postId && !isSignal,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: [`/api/posts/${postId}/comments`],
    enabled: showComments && !!postId && !isSignal,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (isSignal) {
        return apiRequest("POST", `/api/mobile/signals/${postId}/like`, {});
      }
      return apiRequest("/api/likes", "POST", {
        targetId: postId,
        targetType: "post",
      });
    },
    onMutate: async () => {
      if (isSignal) return;
      await queryClient.cancelQueries({ queryKey: ["/api/likes", postId, "post"] });
      const prev = queryClient.getQueryData(["/api/likes", postId, "post"]);
      const currentLiked = likeStatus?.liked ?? false;
      queryClient.setQueryData(["/api/likes", postId, "post"], { liked: !currentLiked });
      return { prev };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.prev) {
        queryClient.setQueryData(["/api/likes", postId, "post"], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/likes", postId, "post"] });
      queryClient.invalidateQueries({ queryKey: ['/api/feeds/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/signals'] });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("/api/comments", "POST", {
        postId,
        content,
      });
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ['/api/feeds/all'] });
      toast({ title: "Comment posted" });
    },
    onError: () => {
      toast({ title: "Failed to post comment", variant: "destructive" });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/flags", "POST", {
        postId,
        reason: "inappropriate",
      });
    },
    onSuccess: () => {
      setShowReported(true);
      toast({ title: "Post reported", description: "Thank you for helping keep the community safe." });
    },
    onError: () => {
      toast({ title: "Could not report post", variant: "destructive" });
    },
  });

  const handleShare = async () => {
    const isMobile = window.location.pathname.startsWith('/mobile');
    const url = `${window.location.origin}${isMobile ? `/mobile/posts/${postId}` : `/posts/${postId}`}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      toast({ title: "Link copied!" });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy link", variant: "destructive" });
    }
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate(newComment.trim());
  };

  const liked = likeStatus?.liked ?? false;

  return (
    <div className="space-y-3 pt-4 border-t border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button
            onClick={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
            className={`flex items-center gap-2 transition-colors ${liked ? "text-red-400" : "text-white/70 hover:text-red-400"}`}
          >
            <Heart className={`w-6 h-6 ${liked ? "fill-current" : ""}`} />
            <span className="text-sm">{likesCount || 0}</span>
          </button>

          {!isSignal && (
            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-2 transition-colors ${showComments ? "text-blue-400" : "text-white/70 hover:text-blue-400"}`}
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-sm">{commentsCount || 0}</span>
            </button>
          )}

          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-white/70 hover:text-green-400 transition-colors"
          >
            {linkCopied ? <CheckCircle className="w-6 h-6 text-green-400" /> : <Share2 className="w-6 h-6" />}
            <span className="text-sm">{sharesCount || 0}</span>
          </button>
        </div>

        {user && !isSignal && (
          <button
            onClick={() => flagMutation.mutate()}
            disabled={flagMutation.isPending || showReported}
            className={`p-2 transition-colors ${showReported ? "text-red-400" : "text-white/40 hover:text-red-400"}`}
            title="Report"
          >
            <Flag className={`w-5 h-5 ${showReported ? "fill-current" : ""}`} />
          </button>
        )}
      </div>

      {showComments && !isSignal && (
        <div className="space-y-3">
          {user && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
                placeholder="Write a comment..."
                className="flex-1 bg-white/10 rounded-full px-4 py-2 text-white text-sm placeholder-white/40 outline-none focus:ring-1 focus:ring-white/30"
              />
              <button
                onClick={handleSubmitComment}
                disabled={createCommentMutation.isPending || !newComment.trim()}
                className="p-2 text-white/70 hover:text-blue-400 disabled:opacity-40 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {commentsLoading ? (
              <div className="text-white/50 text-sm text-center py-3">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="text-white/50 text-sm text-center py-3">No comments yet. Be the first!</div>
            ) : (
              comments.map((comment) => {
                const commentAuthor = comment.author;
                const cName = commentAuthor?.firstName && commentAuthor?.lastName
                  ? `${commentAuthor.firstName} ${commentAuthor.lastName}`
                  : commentAuthor?.username || 'Anonymous';
                const cTime = comment.createdAt
                  ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
                  : '';
                return (
                  <div key={comment.id} className="flex gap-2 p-2 rounded-lg bg-white/5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-blue-500 overflow-hidden flex-shrink-0">
                      {commentAuthor?.avatar ? (
                        <img src={commentAuthor.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">
                          {cName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-white text-xs font-semibold">{cName}</span>
                        <span className="text-white/40 text-[10px]">{cTime}</span>
                      </div>
                      <p className="text-white/80 text-sm">{comment.content}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ExpandedCardView({ item, onClose }: ExpandedCardViewProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [localVotes, setLocalVotes] = useState<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const { toast } = useToast();

  const pollId = item.type === 'poll' 
    ? ('pollId' in item.data ? item.data.pollId : item.data.id) 
    : null;

  const { data: existingVote } = useQuery<{ optionId?: string }>({
    queryKey: ['/api/polls', pollId, 'my-vote'],
    enabled: !!pollId && item.type === 'poll',
  });

  useEffect(() => {
    if (existingVote?.optionId && !votedOptionId) {
      setVotedOptionId(existingVote.optionId);
    }
  }, [existingVote, votedOptionId]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      setDragY(diff);
      setOpacity(Math.max(0.3, 1 - diff / 400));
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (dragY > 150) {
      onClose();
    } else {
      setDragY(0);
      setOpacity(1);
    }
  }, [dragY, onClose]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startY.current = e.clientY;
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientY - startY.current;
    if (diff > 0) {
      setDragY(diff);
      setOpacity(Math.max(0.3, 1 - diff / 400));
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (dragY > 150) {
      onClose();
    } else {
      setDragY(0);
      setOpacity(1);
    }
  }, [dragY, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const renderExpandedContent = () => {
    const { type, data, event } = item;
    
    const timeAgo = data.createdAt 
      ? formatDistanceToNow(new Date(data.createdAt), { addSuffix: true })
      : '';
    
    const author = data.author || {};
    const displayName = author.firstName && author.lastName
      ? `${author.firstName} ${author.lastName}`
      : author.username || 'Anonymous';

    switch (type) {
      case 'signal':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-blue-500 overflow-hidden">
                {author.avatar ? (
                  <img src={author.avatar} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-white font-semibold">{displayName}</p>
                <p className="text-white/50 text-sm">{timeAgo}</p>
              </div>
            </div>
            
            {data.videoUrl && (
              <div className="rounded-xl overflow-hidden aspect-[9/16] bg-black">
                <video 
                  src={data.videoUrl} 
                  controls 
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            
            <div>
              <h3 className="text-white font-bold text-lg mb-2">{data.title}</h3>
              <p className="text-white/80">{data.description}</p>
            </div>
            
            <PostActionBar
              postId={data.id}
              postType="signal"
              likesCount={data.likesCount || 0}
              commentsCount={data.commentsCount || 0}
              sharesCount={data.sharesCount || 0}
            />
          </div>
        );

      case 'post':
        const postVideo = findVideoInPost(data);
        const contentWithoutLinks = data.content?.replace(/https?:\/\/[^\s]+/g, '').trim() || '';
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-blue-500 overflow-hidden">
                {author.avatar ? (
                  <img src={author.avatar} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-white font-semibold">{displayName}</p>
                <p className="text-white/50 text-sm">{timeAgo}</p>
              </div>
            </div>
            
            {postVideo && (
              postVideo.platform === 'youtube' ? (
                <LazyYouTubePlayer 
                  videoId={postVideo.videoId}
                  className="rounded-xl overflow-hidden aspect-video"
                />
              ) : (
                <LazyTikTokPlayer 
                  videoId={postVideo.videoId}
                  tiktokUrl={postVideo.originalUrl}
                  className="rounded-xl overflow-hidden aspect-[9/16] max-h-[60vh]"
                />
              )
            )}
            
            <p className="text-white text-lg leading-relaxed">
              {postVideo ? contentWithoutLinks : data.content}
            </p>
            
            {!postVideo && data.image && (
              <div className="rounded-xl overflow-hidden">
                <img src={data.image} alt="" className="w-full" loading="lazy" />
              </div>
            )}
            
            <PostActionBar
              postId={data.id}
              postType="post"
              likesCount={data.likesCount || 0}
              commentsCount={data.commentsCount || 0}
              sharesCount={data.sharesCount || 0}
            />
          </div>
        );

      case 'news':
        const newsVideo = findVideoInPost(data);
        const thumbnailUrl = data.linkPreview?.image || data.image;
        return (
          <div className="space-y-4">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-500 text-white text-sm font-semibold">
              News
            </span>
            
            {newsVideo ? (
              newsVideo.platform === 'youtube' ? (
                <LazyYouTubePlayer 
                  videoId={newsVideo.videoId}
                  className="rounded-xl overflow-hidden aspect-video"
                />
              ) : (
                <LazyTikTokPlayer 
                  videoId={newsVideo.videoId}
                  tiktokUrl={newsVideo.originalUrl}
                  className="rounded-xl overflow-hidden aspect-[9/16] max-h-[60vh]"
                />
              )
            ) : thumbnailUrl && (
              <div className="rounded-xl overflow-hidden aspect-video">
                <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}
            
            <h3 className="text-white font-bold text-xl">
              {data.title || data.linkPreview?.title || 'News Article'}
            </h3>
            
            <p className="text-white/80 leading-relaxed">{data.content}</p>
            
            {data.linkPreview?.description && (
              <p className="text-white/60 text-sm italic">{data.linkPreview.description}</p>
            )}
            
            <div className="flex items-center justify-between text-white/50 text-sm">
              <span>{data.newsSourceName || author.username || 'ACP News'}</span>
              <span>{timeAgo}</span>
            </div>
            
            {data.url && !newsVideo && (
              <a 
                href={sanitizeUrl(data.url)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="glass-button primary w-full text-center"
              >
                Read Full Article
              </a>
            )}

            <PostActionBar
              postId={data.id}
              postType="news"
              likesCount={data.likesCount || 0}
              commentsCount={data.commentsCount || 0}
              sharesCount={data.sharesCount || 0}
            />
          </div>
        );

      case 'poll':
        const pollId = 'pollId' in data ? data.pollId : data.id;
        const pollOptionsData = 'pollOptions' in data ? data.pollOptions : ('options' in data ? data.options : []);
        const pollOptionsArray = Array.isArray(pollOptionsData) ? pollOptionsData : [];
        const pollTitleText = 'pollTitle' in data ? data.pollTitle : ('title' in data ? data.title : 'Poll');
        const pollDescText = 'pollDescription' in data ? data.pollDescription : ('description' in data ? data.description : null);
        const pollEndDateVal = 'pollEndDate' in data ? data.pollEndDate : ('endDate' in data ? data.endDate : null);
        
        const optionsWithLocalVotes = pollOptionsArray.map((opt: any) => ({
          ...opt,
          votes: localVotes[opt.id] !== undefined ? localVotes[opt.id] : (opt.votes || 0)
        }));
        const totalVotes = optionsWithLocalVotes.reduce((sum: number, opt: any) => sum + opt.votes, 0);
        
        const handleVote = async (optionId: string) => {
          if (votedOptionId || !pollId) return;
          
          setVotedOptionId(optionId);
          
          const newLocalVotes: Record<string, number> = {};
          pollOptionsArray.forEach((opt: any) => {
            newLocalVotes[opt.id] = (opt.votes || 0) + (opt.id === optionId ? 1 : 0);
          });
          setLocalVotes(newLocalVotes);
          
          try {
            await apiRequest(`/api/polls/${pollId}/vote`, 'POST', { optionId });
            toast({ title: 'Vote recorded!', description: 'Thank you for voting.' });
            
            queryClient.invalidateQueries({ queryKey: ['/api/polls'] });
            queryClient.invalidateQueries({ queryKey: ['/api/feeds/all'] });
            
            setTimeout(() => {
              onClose();
            }, 1000);
          } catch (error: any) {
            const errorMessage = error?.message || 'Failed to record vote.';
            if (errorMessage.includes('already voted')) {
              toast({ title: 'Already voted', description: 'You have already voted on this poll.' });
              setTimeout(() => onClose(), 1500);
            } else {
              toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
              setVotedOptionId(null);
              setLocalVotes({});
            }
          }
        };
        
        return (
          <div className="space-y-4">
            <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 text-white text-sm font-semibold">
              Poll
            </span>
            
            <h3 className="text-white font-bold text-xl">{pollTitleText}</h3>
            
            {pollDescText && (
              <p className="text-white/70">{pollDescText}</p>
            )}
            
            <div className="space-y-3">
              {optionsWithLocalVotes.map((option: any, idx: number) => {
                const percentage = totalVotes > 0 
                  ? Math.round((option.votes / totalVotes) * 100) 
                  : 0;
                const isSelected = votedOptionId === option.id;
                return (
                  <button 
                    key={option.id || idx}
                    onClick={() => handleVote(option.id)}
                    disabled={!!votedOptionId}
                    className={`w-full p-4 rounded-xl text-left relative overflow-hidden transition-all active:scale-[0.98] ${
                      isSelected 
                        ? 'bg-gradient-to-r from-purple-500/30 to-violet-500/30 border-2 border-purple-400' 
                        : votedOptionId 
                          ? 'bg-white/5 border border-white/10 opacity-70'
                          : 'bg-white/10 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <div 
                      className={`absolute inset-0 ${isSelected ? 'bg-gradient-to-r from-purple-500/50 to-violet-500/50' : 'bg-gradient-to-r from-purple-500/30 to-violet-500/30'}`}
                      style={{ width: `${percentage}%`, transition: 'width 0.5s ease-out' }}
                    />
                    <div className="relative flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {isSelected && <Check className="w-5 h-5 text-purple-300" />}
                        <span className={`font-medium ${isSelected ? 'text-white' : 'text-white'}`}>{option.text}</span>
                      </div>
                      <span className={`${isSelected ? 'text-purple-200 font-bold' : 'text-white/70'}`}>{percentage}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <p className="text-white/50 text-sm text-center">
              {totalVotes} total votes
              {pollEndDateVal && ` • Ends ${format(new Date(pollEndDateVal), 'MMM d, yyyy')}`}
            </p>
            
            {!votedOptionId && (
              <p className="text-white/40 text-xs text-center">
                Tap an option to vote
              </p>
            )}
          </div>
        );

      case 'announcement':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold">
                Official Announcement
              </span>
            </div>
            
            {data.title && (
              <h3 className="text-white font-bold text-xl">{data.title}</h3>
            )}
            
            <p className="text-white text-lg leading-relaxed">{data.content}</p>
            
            <p className="text-white/50 text-sm">
              ACP Official • {timeAgo}
            </p>

            <PostActionBar
              postId={data.id}
              postType="announcement"
              likesCount={data.likesCount || 0}
              commentsCount={data.commentsCount || 0}
              sharesCount={data.sharesCount || 0}
            />
          </div>
        );

      case 'event':
        return (
          <div className="space-y-4">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-500 text-white text-sm font-semibold">
              Event
            </span>
            
            {event?.image && (
              <div className="rounded-xl overflow-hidden aspect-video">
                <img src={event.image} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            
            <h3 className="text-white font-bold text-xl">
              {event?.title || data.content}
            </h3>
            
            {event?.description && (
              <p className="text-white/80">{event.description}</p>
            )}
            
            {event?.startDate && (
              <div className="flex items-center gap-2 text-white/70">
                <span>📅</span>
                <span>{format(new Date(event.startDate), 'EEEE, MMMM d, yyyy • h:mm a')}</span>
              </div>
            )}
            
            {event?.location && (
              <div className="flex items-center gap-2 text-white/70">
                <span>📍</span>
                <span>{event.location}</span>
              </div>
            )}
            
            <button className="glass-button primary w-full">
              RSVP to Event
            </button>

            <PostActionBar
              postId={data.id}
              postType="event"
              likesCount={data.likesCount || 0}
              commentsCount={data.commentsCount || 0}
              sharesCount={data.sharesCount || 0}
            />
          </div>
        );

      case 'petition':
        const progress = data.targetSignatures 
          ? Math.min(100, Math.round((data.currentSignatures || 0) / data.targetSignatures * 100))
          : 0;
        return (
          <div className="space-y-4">
            <span className="inline-block px-3 py-1 rounded-full bg-red-500 text-white text-sm font-semibold">
              Petition
            </span>
            
            <h3 className="text-white font-bold text-xl">{data.title}</h3>
            
            {data.objective && (
              <p className="text-white/80">{data.objective}</p>
            )}
            
            <div className="space-y-2">
              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-blue-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-white/70 text-sm">
                <span>{(data.currentSignatures || 0).toLocaleString()} signatures</span>
                <span>Goal: {(data.targetSignatures || 0).toLocaleString()}</span>
              </div>
            </div>
            
            <button className="glass-button primary w-full">
              Sign This Petition
            </button>
          </div>
        );

      case 'blog':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-semibold">
                Article
              </span>
              {data.readingTime && (
                <span className="text-white/50 text-sm">{data.readingTime} min read</span>
              )}
            </div>
            
            {data.featuredImage && (
              <div className="rounded-xl overflow-hidden aspect-video -mx-4">
                <img 
                  src={data.featuredImage} 
                  alt="" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            
            <h3 className="text-white font-bold text-2xl leading-tight">{data.title || 'Untitled Article'}</h3>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-blue-500 overflow-hidden">
                {author.avatar ? (
                  <img src={author.avatar} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-white font-medium">{displayName}</p>
                <p className="text-white/50 text-sm">{timeAgo}</p>
              </div>
            </div>
            
            <div className="article-body prose prose-invert prose-sm max-w-none">
              {data.articleBody ? (
                <div 
                  className="text-white/90 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.articleBody) }}
                />
              ) : (
                <p className="text-white/90 leading-relaxed">{data.content}</p>
              )}
            </div>
            
            {data.articleImages && data.articleImages.length > 0 && (
              <div className="space-y-4">
                {data.articleImages.map((img: any, idx: number) => (
                  <div key={idx} className="rounded-xl overflow-hidden">
                    <img 
                      src={img.url} 
                      alt={img.caption || ''} 
                      className="w-full"
                      loading="lazy"
                    />
                    {img.caption && (
                      <p className="text-white/50 text-sm text-center mt-2 italic">{img.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {data.tags && data.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                {data.tags.map((tag: string) => (
                  <span 
                    key={tag} 
                    className="px-2 py-1 rounded-full bg-white/10 text-white/70 text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            
            <PostActionBar
              postId={data.id}
              postType="blog"
              likesCount={data.likesCount || 0}
              commentsCount={data.commentsCount || 0}
              sharesCount={data.sharesCount || 0}
            />
          </div>
        );

      default:
        return (
          <div className="text-white">
            <p>{data.content || 'No content available'}</p>
          </div>
        );
    }
  };

  return (
    <div 
      className="expanded-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ opacity }}
    >
      <div className="expanded-close-bar" />
      <button 
        className="expanded-close-button"
        onClick={onClose}
        data-testid="close-expanded"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div 
        ref={containerRef}
        className={`expanded-card-container ${isDragging ? 'dragging' : ''}`}
        style={{ transform: `translateY(${dragY}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="expanded-card-content">
          {renderExpandedContent()}
        </div>
        
        <div className="swipe-indicator flex items-center justify-center gap-2 mt-4">
          <ChevronDown className="w-4 h-4" />
          <span>Swipe down to close</span>
        </div>
      </div>
    </div>
  );
}
