const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const TIKTOK_REGEX = /(?:tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com\/|tiktok\.com\/t\/)(\d+|[\w]+)/;

export function extractYouTubeId(text: string): string | null {
  if (!text) return null;
  const match = text.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
}

export function extractTikTokId(text: string): string | null {
  if (!text) return null;
  const match = text.match(TIKTOK_REGEX);
  return match ? match[1] : null;
}

export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'hqdefault' | 'mqdefault' | 'sddefault' | 'maxresdefault' = 'hqdefault'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
}

export function getTikTokEmbedUrl(videoId: string): string {
  return `https://www.tiktok.com/embed/v2/${videoId}`;
}

export type VideoInfo = {
  platform: 'youtube' | 'tiktok';
  videoId: string;
  originalUrl?: string;
} | null;

// Extract the full TikTok URL from text
function extractTikTokUrl(text: string): string | null {
  if (!text) return null;
  const urlMatch = text.match(/(https?:\/\/(?:www\.)?(?:tiktok\.com\/@[\w.-]+\/video\/\d+|vm\.tiktok\.com\/[\w]+|tiktok\.com\/t\/[\w]+))/i);
  return urlMatch ? urlMatch[1] : null;
}

export function findVideoInPost(post: {
  content?: string;
  url?: string | null;
  linkPreview?: { url?: string } | null;
}): VideoInfo {
  const sources = [post.url, post.linkPreview?.url, post.content].filter(Boolean) as string[];
  
  for (const source of sources) {
    const youtubeId = extractYouTubeId(source);
    if (youtubeId) return { platform: 'youtube', videoId: youtubeId };
    
    const tiktokId = extractTikTokId(source);
    if (tiktokId) {
      const tiktokUrl = extractTikTokUrl(source);
      return { platform: 'tiktok', videoId: tiktokId, originalUrl: tiktokUrl || undefined };
    }
  }
  
  return null;
}

export function findYouTubeInPost(post: {
  content?: string;
  url?: string | null;
  linkPreview?: { url?: string } | null;
}): string | null {
  if (post.url) {
    const id = extractYouTubeId(post.url);
    if (id) return id;
  }
  
  if (post.linkPreview?.url) {
    const id = extractYouTubeId(post.linkPreview.url);
    if (id) return id;
  }
  
  if (post.content) {
    const id = extractYouTubeId(post.content);
    if (id) return id;
  }
  
  return null;
}
