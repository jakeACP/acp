import { extractVideoEmbeds, getTikTokEmbedUrl, type VideoEmbed } from "@/lib/video-embed";
import { YouTubeEmbed } from "./youtube-embed";

interface VideoEmbedDisplayProps {
  content: string;
  postId: string;
}

export function VideoEmbedDisplay({ content, postId }: VideoEmbedDisplayProps) {
  const embeds = extractVideoEmbeds(content);

  if (embeds.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {embeds.map((embed, index) => (
        <div key={`${embed.type}-${embed.id}-${index}`} className="w-full">
          {embed.type === 'youtube' && (
            <YouTubeEmbed videoId={embed.id} postId={postId} />
          )}
          
          {embed.type === 'tiktok' && (
            <div className="relative w-full mx-auto max-w-[325px] mb-4" style={{ paddingBottom: '177.78%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={getTikTokEmbedUrl(embed.id)}
                title="TikTok video player"
                frameBorder="0"
                allow="encrypted-media"
                allowFullScreen
                data-testid={`tiktok-embed-${embed.id}`}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
