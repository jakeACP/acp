import { useState, useRef, useEffect, useCallback } from "react";
import { X, Heart, MessageCircle, Share2, ChevronDown, Check } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import DOMPurify from "dompurify";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LazyYouTubePlayer, LazyTikTokPlayer } from "./LazyYouTubeThumbnail";
import { findVideoInPost } from "../utils/youtube";
import { useToast } from "@/hooks/use-toast";

interface ExpandedCardViewProps {
  item: {
    type: string;
    data: any;
    event?: any;
  };
  onClose: () => void;
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

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (item.type === 'signal') {
        return apiRequest("POST", `/api/mobile/signals/${item.data.id}/like`, {});
      }
      return apiRequest("POST", `/api/posts/${item.data.id}/like`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feeds/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/signals'] });
    },
  });

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
            
            <div className="flex items-center gap-6 pt-4 border-t border-white/10">
              <button 
                onClick={() => likeMutation.mutate()}
                className="flex items-center gap-2 text-white/70 hover:text-red-400"
              >
                <Heart className="w-6 h-6" />
                <span>{data.likesCount || 0}</span>
              </button>
              <button className="flex items-center gap-2 text-white/70 hover:text-blue-400">
                <MessageCircle className="w-6 h-6" />
                <span>{data.commentsCount || 0}</span>
              </button>
              <button className="flex items-center gap-2 text-white/70 hover:text-green-400">
                <Share2 className="w-6 h-6" />
                <span>{data.sharesCount || 0}</span>
              </button>
            </div>
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
            
            <div className="flex items-center gap-6 pt-4 border-t border-white/10">
              <button 
                onClick={() => likeMutation.mutate()}
                className="flex items-center gap-2 text-white/70 hover:text-red-400"
              >
                <Heart className="w-6 h-6" />
                <span>{data.likesCount || 0}</span>
              </button>
              <button className="flex items-center gap-2 text-white/70 hover:text-blue-400">
                <MessageCircle className="w-6 h-6" />
                <span>{data.commentsCount || 0}</span>
              </button>
              <button className="flex items-center gap-2 text-white/70 hover:text-green-400">
                <Share2 className="w-6 h-6" />
                <span>{data.sharesCount || 0}</span>
              </button>
            </div>
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
            
            <div className="flex items-center justify-between text-white/50 text-sm pt-4 border-t border-white/10">
              <span>{data.newsSourceName || author.username || 'ACP News'}</span>
              <span>{timeAgo}</span>
            </div>
            
            {data.url && !newsVideo && (
              <a 
                href={data.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="glass-button primary w-full text-center"
              >
                Read Full Article
              </a>
            )}
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
            
            <div className="flex items-center gap-6 pt-4 border-t border-white/10">
              <button 
                onClick={() => likeMutation.mutate()}
                className="flex items-center gap-2 text-white/70 hover:text-red-400"
              >
                <Heart className="w-6 h-6" />
                <span>{data.likesCount || 0}</span>
              </button>
              <button className="flex items-center gap-2 text-white/70 hover:text-blue-400">
                <MessageCircle className="w-6 h-6" />
                <span>{data.commentsCount || 0}</span>
              </button>
              <button className="flex items-center gap-2 text-white/70 hover:text-green-400">
                <Share2 className="w-6 h-6" />
                <span>{data.sharesCount || 0}</span>
              </button>
            </div>
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
