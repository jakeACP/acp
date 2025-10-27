import { extractVideoEmbeds, getYouTubeEmbedUrl, getTikTokEmbedUrl, type VideoEmbed } from "@/lib/video-embed";

interface VideoEmbedDisplayProps {
  content: string;
}

export function VideoEmbedDisplay({ content }: VideoEmbedDisplayProps) {
  const embeds = extractVideoEmbeds(content);

  if (embeds.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-4">
      {embeds.map((embed, index) => (
        <div key={`${embed.type}-${embed.id}-${index}`} className="w-full">
          {embed.type === 'youtube' && (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={getYouTubeEmbedUrl(embed.id)}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                data-testid={`youtube-embed-${embed.id}`}
              />
            </div>
          )}
          
          {embed.type === 'tiktok' && (
            <div className="relative w-full mx-auto max-w-[325px]" style={{ paddingBottom: '177.78%' }}>
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
