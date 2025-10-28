import { createPortal } from 'react-dom';
import { useFloatingVideo } from '@/contexts/floating-video-context';
import { YouTubeEmbed } from './youtube-embed';
import { Button } from './ui/button';
import { X, Maximize2 } from 'lucide-react';

export function FloatingVideoPlayer() {
  const { videoId, postId, deactivate, returnToPost } = useFloatingVideo();

  if (!videoId || !postId) {
    return null;
  }

  return createPortal(
    <div
      className="fixed bottom-4 right-4 z-50 shadow-2xl rounded-lg overflow-hidden bg-black"
      style={{ width: '400px' }}
      data-testid="floating-video-player"
    >
      <div className="relative">
        <YouTubeEmbed videoId={videoId} postId={postId} isFloating={true} />
        
        <div className="absolute top-2 right-2 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 bg-black/70 hover:bg-black/90 text-white"
            onClick={returnToPost}
            title="Return to post"
            data-testid="button-return-to-post"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 bg-black/70 hover:bg-black/90 text-white"
            onClick={deactivate}
            title="Close"
            data-testid="button-close-floating-video"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
