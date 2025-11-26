import { useState, useRef, useEffect, useCallback } from "react";
import { X, Heart, MessageCircle, Share2, ChevronDown } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LazyYouTubePlayer, LazyTikTokPlayer } from "./LazyYouTubeThumbnail";
import { findVideoInPost } from "../utils/youtube";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

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
        const pollOptions = Array.isArray(data.pollOptions) ? data.pollOptions : [];
        const totalVotes = pollOptions.reduce((sum: number, opt: any) => sum + (opt.votes || 0), 0);
        return (
          <div className="space-y-4">
            <span className="inline-block px-3 py-1 rounded-full border border-blue-500 text-white text-sm font-semibold">
              Poll
            </span>
            
            <h3 className="text-white font-bold text-xl">{data.pollTitle}</h3>
            
            {data.pollDescription && (
              <p className="text-white/70">{data.pollDescription}</p>
            )}
            
            <div className="space-y-3">
              {pollOptions.map((option: any, idx: number) => {
                const percentage = totalVotes > 0 
                  ? Math.round((option.votes / totalVotes) * 100) 
                  : 0;
                return (
                  <button 
                    key={option.id || idx}
                    className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-left relative overflow-hidden"
                  >
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-red-500/30 to-blue-500/30"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative flex justify-between">
                      <span className="text-white">{option.text}</span>
                      <span className="text-white/70">{percentage}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <p className="text-white/50 text-sm text-center">
              {totalVotes} total votes
              {data.pollEndDate && ` • Ends ${format(new Date(data.pollEndDate), 'MMM d, yyyy')}`}
            </p>
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
