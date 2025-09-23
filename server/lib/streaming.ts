import { z } from "zod";

// Streaming provider interface
export interface StreamingProvider {
  createInput(title: string): Promise<StreamInput>;
  deleteInput(inputId: string): Promise<void>;
  verifyWebhook(body: string, signature: string): boolean;
  getPlaybackUrl(playbackId: string): string;
}

// Standard stream input format
export interface StreamInput {
  inputId: string;
  playbackId: string;
  rtmpUrl: string;
  streamKey: string;
  playbackUrl: string;
}

// Webhook event types
export const webhookEventSchema = z.object({
  type: z.enum(['stream.created', 'stream.live', 'stream.ended', 'stream.error']),
  streamId: z.string(),
  playbackId: z.string(),
  timestamp: z.string(),
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;

// Mock/Cloudflare Stream Provider
export class CloudflareStreamProvider implements StreamingProvider {
  private apiKey: string;
  private accountId: string;
  private webhookSecret: string;

  constructor(apiKey?: string, accountId?: string, webhookSecret?: string) {
    // For now, use mock values if not provided
    this.apiKey = apiKey || 'mock-api-key';
    this.accountId = accountId || 'mock-account-id';
    this.webhookSecret = webhookSecret || 'mock-webhook-secret';
  }

  async createInput(title: string): Promise<StreamInput> {
    // For development, return mock data
    // In production, this would make actual API calls to Cloudflare Stream
    if (this.apiKey === 'mock-api-key') {
      const mockInputId = `mock-input-${Date.now()}`;
      const mockPlaybackId = `mock-playback-${Date.now()}`;
      const mockStreamKey = `mock-key-${Math.random().toString(36).substr(2, 20)}`;
      
      return {
        inputId: mockInputId,
        playbackId: mockPlaybackId,
        rtmpUrl: `rtmp://stream.acp-democracy.org/live`,
        streamKey: mockStreamKey,
        playbackUrl: `https://demo.cloudflare.com/stream/${mockPlaybackId}/manifest/video.m3u8`,
      };
    }

    // Production Cloudflare Stream API call would go here
    // const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/live_inputs`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     meta: { name: title },
    //     recording: { mode: 'automatic' },
    //   }),
    // });
    
    throw new Error('Production Cloudflare Stream integration not implemented yet');
  }

  async deleteInput(inputId: string): Promise<void> {
    if (this.apiKey === 'mock-api-key') {
      // Mock deletion - just return success
      console.log(`Mock: Deleted input ${inputId}`);
      return;
    }

    // Production deletion would go here
    throw new Error('Production Cloudflare Stream integration not implemented yet');
  }

  verifyWebhook(body: string, signature: string): boolean {
    if (this.webhookSecret === 'mock-webhook-secret') {
      // In development, always return true
      return true;
    }

    // Production webhook verification would go here using HMAC
    // const expectedSignature = crypto
    //   .createHmac('sha256', this.webhookSecret)
    //   .update(body)
    //   .digest('hex');
    // return signature === expectedSignature;
    
    return false;
  }

  getPlaybackUrl(playbackId: string): string {
    if (this.apiKey === 'mock-api-key') {
      return `https://demo.cloudflare.com/stream/${playbackId}/manifest/video.m3u8`;
    }

    // Production playback URL format
    return `https://customer-${this.accountId}.cloudflarestream.com/${playbackId}/manifest/video.m3u8`;
  }
}

// Factory function to create the appropriate provider
export function createStreamingProvider(): StreamingProvider {
  // Check for environment variables for production
  const apiKey = process.env.CLOUDFLARE_STREAM_API_KEY;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const webhookSecret = process.env.CLOUDFLARE_WEBHOOK_SECRET;

  return new CloudflareStreamProvider(apiKey, accountId, webhookSecret);
}

// Utility functions
export function generateStreamKey(): string {
  return Math.random().toString(36).substr(2, 32);
}

export function hashStreamKey(streamKey: string): string {
  // In production, use proper hashing with salt
  // For now, simple hash for development
  return `hash_${streamKey.substr(0, 8)}...`;
}