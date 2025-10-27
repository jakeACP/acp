export type VideoEmbedType = 'youtube' | 'tiktok' | null;

export interface VideoEmbed {
  type: VideoEmbedType;
  id: string;
  url: string;
}

export function extractVideoEmbeds(text: string): VideoEmbed[] {
  const embeds: VideoEmbed[] = [];
  
  // YouTube patterns
  const youtubePatterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/gi,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/gi,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/gi,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/gi,
  ];
  
  // TikTok patterns
  const tiktokPatterns = [
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/gi,
    /(?:https?:\/\/)?(?:www\.)?vm\.tiktok\.com\/([a-zA-Z0-9]+)/gi,
  ];
  
  // Extract YouTube videos
  youtubePatterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern);
    while ((match = regex.exec(text)) !== null) {
      const id = match[1];
      if (id && !embeds.find(e => e.id === id)) {
        embeds.push({
          type: 'youtube',
          id,
          url: match[0],
        });
      }
    }
  });
  
  // Extract TikTok videos
  tiktokPatterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern);
    while ((match = regex.exec(text)) !== null) {
      const id = match[1];
      if (id && !embeds.find(e => e.id === id)) {
        embeds.push({
          type: 'tiktok',
          id,
          url: match[0],
        });
      }
    }
  });
  
  return embeds;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

export function getTikTokEmbedUrl(videoId: string): string {
  // TikTok embed URL format
  return `https://www.tiktok.com/embed/v2/${videoId}`;
}

export function extractTikTokVideoId(url: string): string | null {
  // Match full TikTok video URLs
  const fullMatch = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
  if (fullMatch) return fullMatch[1];
  
  // Match short TikTok URLs (vm.tiktok.com)
  const shortMatch = url.match(/vm\.tiktok\.com\/([a-zA-Z0-9]+)/);
  if (shortMatch) return shortMatch[1];
  
  return null;
}
