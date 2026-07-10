/**
 * Signal video URL utilities — classify a signal's videoUrl so the
 * player knows whether to render a <video>, a YouTube iframe, or a TikTok embed.
 */

export type SignalVideoType = 'youtube' | 'tiktok' | 'upload' | 'unknown';

const YT_PATTERN =
  /(?:youtube\.com\/watch\?.*v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/;

const TT_FULL = /tiktok\.com\/@[\w.-]+\/video\/(\d+)/;
const TT_SHORT = /vm\.tiktok\.com\/[a-zA-Z0-9]+/;

export interface SignalVideoInfo {
  type: SignalVideoType;
  /** Autoplay-ready embed URL for iframe rendering (YouTube / TikTok only) */
  embedUrl?: string;
  /** YouTube video ID (only when type === 'youtube') */
  youtubeId?: string;
  /** Fallback thumbnail for YouTube (from YouTube's CDN — no auth needed) */
  youtubeThumbnailUrl?: string;
}

/** Classify a signal's stored videoUrl for the renderer. */
export function classifySignalUrl(videoUrl: string | null | undefined): SignalVideoInfo {
  if (!videoUrl) return { type: 'unknown' };

  const ytMatch = videoUrl.match(YT_PATTERN);
  if (ytMatch?.[1]) {
    const id = ytMatch[1];
    return {
      type: 'youtube',
      youtubeId: id,
      embedUrl:
        `https://www.youtube.com/embed/${id}` +
        `?autoplay=1&mute=1&playsinline=1&rel=0&controls=1&modestbranding=1`,
      youtubeThumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  const ttFull = videoUrl.match(TT_FULL);
  if (ttFull) {
    return {
      type: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${ttFull[1]}`,
    };
  }

  if (TT_SHORT.test(videoUrl)) {
    return { type: 'tiktok', embedUrl: undefined };
  }

  if (videoUrl.startsWith('/uploads/') || /\.(mp4|webm|m3u8|mov)(\?|$)/i.test(videoUrl)) {
    return { type: 'upload' };
  }

  return { type: 'unknown' };
}

/** Client-side URL validation before submitting a pasted link to the server. */
export interface PastedUrlValidation {
  valid: boolean;
  type?: 'youtube' | 'tiktok' | 'direct';
  canonicalUrl?: string;
  error?: string;
  youtubeThumbnailUrl?: string;
  youtubeId?: string;
}

export function validatePastedSignalUrl(url: string): PastedUrlValidation {
  if (!url.trim()) return { valid: false, error: 'Please enter a URL.' };

  const ytMatch = url.trim().match(YT_PATTERN);
  if (ytMatch?.[1]) {
    const id = ytMatch[1];
    return {
      valid: true,
      type: 'youtube',
      canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
      youtubeId: id,
      youtubeThumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  const ttFull = url.trim().match(TT_FULL);
  if (ttFull || TT_SHORT.test(url.trim())) {
    return { valid: true, type: 'tiktok', canonicalUrl: url.trim() };
  }

  if (/\.(mp4|webm|m3u8)(\?[^#]*)?$/i.test(url.trim())) {
    return { valid: true, type: 'direct', canonicalUrl: url.trim() };
  }

  return {
    valid: false,
    error:
      'Unsupported link. Paste a YouTube video link, TikTok video link, or a direct .mp4 / .webm URL.',
  };
}
