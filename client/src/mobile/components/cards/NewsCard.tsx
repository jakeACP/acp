import { Link } from "wouter";
import type { Post } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface NewsCardProps {
  post: Post & { author?: { username: string; avatar: string | null } };
}

export function NewsCard({ post }: NewsCardProps) {
  const timeAgo = post.createdAt 
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: false })
    : '';

  const thumbnailUrl = post.linkPreview?.image || post.image;
  const sourceName = post.newsSourceName || post.author?.username || 'ACP News';

  return (
    <Link href={`/mobile/posts/${post.id}`}>
      <article className="glass-card p-3 cursor-pointer" data-testid={`news-card-${post.id}`}>
        <div className="absolute top-3 left-3 z-10">
          <span className="type-tag news">News</span>
        </div>
        
        <div className="pt-8 flex gap-3">
          {thumbnailUrl && (
            <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
              <img 
                src={thumbnailUrl} 
                alt="" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm line-clamp-2 mb-2">
              {post.title || post.content.slice(0, 100)}
            </h3>
            <p className="text-white/60 text-xs">
              {sourceName} • {timeAgo}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
