import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const SAFE_URL_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

export function sanitizeUrl(url: string | undefined | null): string {
  if (!url) return '#';
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '#';
  
  try {
    const parsed = new URL(trimmedUrl, window.location.origin);
    if (SAFE_URL_PROTOCOLS.includes(parsed.protocol)) {
      return trimmedUrl;
    }
    return '#';
  } catch {
    if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('#')) {
      return trimmedUrl;
    }
    return '#';
  }
}
