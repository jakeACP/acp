import { Link } from "wouter";
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PostCardProps {
  post: {
    id: string;
    authorId: string;
    content: string;
    type: string;
    image?: string | null;
    likesCount?: number;
    commentsCount?: number;
    sharesCount?: number;
    createdAt?: Date | string | null;
    author?: {
      username: string;
      firstName?: string | null;
      lastName?: string | null;
      avatar?: string | null;
    };
  };
}

export function PostCard({ post }: PostCardProps) {
  const timeAgo = post.createdAt 
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: false })
    : '';

  const displayName = post.author?.firstName && post.author?.lastName
    ? `${post.author.firstName} ${post.author.lastName}`
    : post.author?.username || 'Anonymous';

  const likeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/posts/${post.id}/like`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feeds/all'] });
    },
  });

  return (
    <article className="glass-card p-3" data-testid={`post-card-${post.id}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-blue-500 overflow-hidden flex-shrink-0">
          {post.author?.avatar ? (
            <img 
              src={post.author.avatar} 
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate">{displayName}</p>
          <p className="text-white/50 text-[10px]">{timeAgo}</p>
        </div>
        <button className="text-white/50 hover:text-white/80 p-1" data-testid={`post-more-${post.id}`}>
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <Link href={`/mobile/posts/${post.id}`}>
        <p className="text-white text-sm line-clamp-4 mb-3 cursor-pointer">
          {post.content}
        </p>
      </Link>

      {post.image && (
        <Link href={`/mobile/posts/${post.id}`}>
          <div className="rounded-lg overflow-hidden mb-3 aspect-video cursor-pointer">
            <img 
              src={post.image} 
              alt="" 
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </Link>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-white/10">
        <button 
          className="flex items-center gap-1 text-white/60 hover:text-red-400 transition-colors"
          onClick={() => likeMutation.mutate()}
          disabled={likeMutation.isPending}
          data-testid={`like-post-${post.id}`}
        >
          <Heart className={`w-4 h-4 ${likeMutation.isPending ? 'animate-pulse' : ''}`} />
          <span className="text-xs">{post.likesCount || 0}</span>
        </button>
        
        <Link href={`/mobile/posts/${post.id}`}>
          <button className="flex items-center gap-1 text-white/60 hover:text-blue-400 transition-colors" data-testid={`comment-post-${post.id}`}>
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">{post.commentsCount || 0}</span>
          </button>
        </Link>
        
        <button className="flex items-center gap-1 text-white/60 hover:text-green-400 transition-colors" data-testid={`share-post-${post.id}`}>
          <Share2 className="w-4 h-4" />
          <span className="text-xs">{post.sharesCount || 0}</span>
        </button>
      </div>
    </article>
  );
}
