import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FloatingVideoContext {
  floatingPostId: string | null;
  activate: (postId: string) => void;
  deactivate: () => void;
  returnToPost: () => void;
}

const FloatingVideoContext = createContext<FloatingVideoContext | undefined>(undefined);

export function FloatingVideoProvider({ children }: { children: ReactNode }) {
  const [floatingPostId, setFloatingPostId] = useState<string | null>(null);

  const activate = useCallback((postId: string) => {
    setFloatingPostId(postId);
  }, []);

  const deactivate = useCallback(() => {
    setFloatingPostId(null);
  }, []);

  const returnToPost = useCallback(() => {
    if (floatingPostId) {
      const postElement = document.querySelector(`[data-post-id="${floatingPostId}"]`);
      if (postElement) {
        postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Deactivate after scrolling
        setTimeout(() => {
          deactivate();
        }, 500);
      }
    }
  }, [floatingPostId, deactivate]);

  return (
    <FloatingVideoContext.Provider value={{ floatingPostId, activate, deactivate, returnToPost }}>
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
