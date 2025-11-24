import { Request } from "express";

export function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers['x-forwarded-for'];
  
  if (forwardedFor) {
    if (typeof forwardedFor === 'string') {
      const ips = forwardedFor.split(',');
      return ips[0].trim();
    } else if (Array.isArray(forwardedFor)) {
      return forwardedFor[0];
    }
  }
  
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp;
  }
  
  return req.socket.remoteAddress || null;
}

export async function getCountryFromIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return 'Local';
  }
  
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country`, {
      headers: { 'User-Agent': 'ACP-Platform/1.0' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      console.error(`IP geolocation API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.country) {
      return data.country;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching country from IP:', error);
    return null;
  }
}
