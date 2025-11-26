const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractYouTubeId(text: string): string | null {
  if (!text) return null;
  const match = text.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
}

export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'hqdefault' | 'mqdefault' | 'sddefault' | 'maxresdefault' = 'hqdefault'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
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
