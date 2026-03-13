import { extractVideoEmbeds, type VideoEmbed } from "@/lib/video-embed";
import { YouTubeEmbed } from "./youtube-embed";
import { TikTokEmbed } from "./tiktok-embed";

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
    <div className="space-y-3 mb-4">
      {embeds.map((embed, index) => (
        <div
          key={`${embed.type}-${embed.id}-${index}`}
          className="rounded-xl overflow-hidden"
        >
          {embed.type === 'youtube' && (
            <YouTubeEmbed videoId={embed.id} postId={postId} />
          )}
          {embed.type === 'tiktok' && (
            <TikTokEmbed videoId={embed.id} tiktokUrl={embed.url} />
          )}
        </div>
      ))}
    </div>
  );
}
