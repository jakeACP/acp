import * as cheerio from 'cheerio';

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

function isValidPublicUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }

    const hostname = url.hostname.toLowerCase();
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return false;
    }
    
    if (hostname.match(/^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\./)) {
      return false;
    }
    
    if (hostname.match(/^169\.254\.|^fe80:/)) {
      return false;
    }
    
    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  if (!isValidPublicUrl(url)) {
    throw new Error('Invalid or non-public URL');
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const preview: LinkPreview = { url };

    preview.title = 
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      undefined;

    preview.description = 
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      undefined;

    const imageUrl = 
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      undefined;

    if (imageUrl) {
      preview.image = new URL(imageUrl, url).href;
    }

    preview.siteName = 
      $('meta[property="og:site_name"]').attr('content') ||
      new URL(url).hostname ||
      undefined;

    return preview;
  } catch (error) {
    console.error('Error fetching link preview:', error);
    return {
      url,
      title: new URL(url).hostname,
    };
  }
}
