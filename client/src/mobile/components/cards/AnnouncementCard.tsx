import { Link } from "wouter";
import { Megaphone, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sanitizeUrl } from "@/lib/utils";

interface AnnouncementCardProps {
  post: {
    id: string;
    content: string;
    title?: string | null;
    url?: string | null;
    createdAt?: Date | string | null;
    author?: {
      username: string;
      firstName?: string | null;
      lastName?: string | null;
      avatar?: string | null;
    };
  };
}

export function AnnouncementCard({ post }: AnnouncementCardProps) {
  const timeAgo = post.createdAt 
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: false })
    : '';

  return (
    <article className="glass-card p-3 border-l-4 border-red-500" data-testid={`announcement-card-${post.id}`}>
      <div className="absolute top-3 left-3 z-10">
        <span className="type-tag announcement flex items-center gap-1">
          <Megaphone className="w-3 h-3" />
          Official
        </span>
      </div>
      
      <div className="pt-10">
        {post.title && (
          <h3 className="text-white font-bold text-sm mb-2">
            {post.title}
          </h3>
        )}
        
        <p className="text-white/90 text-sm line-clamp-4 mb-3">
          {post.content}
        </p>
        
        <div className="flex items-center justify-between">
          <p className="text-white/50 text-xs">
            ACP Official • {timeAgo}
          </p>
          
          {post.url && (
            <a 
              href={sanitizeUrl(post.url)} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 text-xs hover:underline"
              data-testid={`announcement-link-${post.id}`}
            >
              <ExternalLink className="w-3 h-3" />
              Learn more
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
