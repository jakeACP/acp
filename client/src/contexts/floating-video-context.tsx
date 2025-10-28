import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FloatingVideoContext {
  videoId: string | null;
  postId: string | null;
  playerRef: any | null;
  startTime: number;
  activate: (videoId: string, postId: string, playerRef: any) => void;
  deactivate: () => void;
  returnToPost: () => void;
}

const FloatingVideoContext = createContext<FloatingVideoContext | undefined>(undefined);

export function FloatingVideoProvider({ children }: { children: ReactNode }) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [playerRef, setPlayerRef] = useState<any | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const activate = useCallback((newVideoId: string, newPostId: string, newPlayerRef: any) => {
    // If there's already an active video, pause it first
    if (playerRef && playerRef.pauseVideo) {
      playerRef.pauseVideo();
    }
    
    // Get current playback time from the original player
    const currentTime = newPlayerRef && newPlayerRef.getCurrentTime ? newPlayerRef.getCurrentTime() : 0;
    
    setVideoId(newVideoId);
    setPostId(newPostId);
    setPlayerRef(newPlayerRef);
    setStartTime(currentTime);
  }, [playerRef]);

  const deactivate = useCallback(() => {
    if (playerRef && playerRef.pauseVideo) {
      playerRef.pauseVideo();
    }
    setVideoId(null);
    setPostId(null);
    setPlayerRef(null);
    setStartTime(0);
  }, [playerRef]);

  const returnToPost = useCallback(() => {
    if (postId) {
      const postElement = document.querySelector(`[data-post-id="${postId}"]`);
      if (postElement) {
        postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Deactivate after scrolling
        setTimeout(() => {
          deactivate();
        }, 500);
      }
    }
  }, [postId, deactivate]);

  return (
    <FloatingVideoContext.Provider value={{ videoId, postId, playerRef, startTime, activate, deactivate, returnToPost }}>
      {children}
    </FloatingVideoContext.Provider>
  );
}

export function useFloatingVideo() {
  const context = useContext(FloatingVideoContext);
  if (!context) {
    throw new Error('useFloatingVideo must be used within a FloatingVideoProvider');
  }
  return context;
}
