import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface FloatingVideoContextValue {
  floatingPostId: string | null;
  activate: (postId: string) => void;
  deactivate: () => void;
}

const FloatingVideoContext = createContext<FloatingVideoContextValue | undefined>(undefined);

export function FloatingVideoProvider({ children }: { children: ReactNode }) {
  const [floatingPostId, setFloatingPostId] = useState<string | null>(null);

  useEffect(() => {
    if (floatingPostId) {
      document.body.classList.add('has-floating-video');
    } else {
      document.body.classList.remove('has-floating-video');
    }
    return () => document.body.classList.remove('has-floating-video');
  }, [floatingPostId]);

  const activate = useCallback((postId: string) => setFloatingPostId(postId), []);
  const deactivate = useCallback(() => setFloatingPostId(null), []);

  return (
    <FloatingVideoContext.Provider value={{ floatingPostId, activate, deactivate }}>
      {children}
    </FloatingVideoContext.Provider>
  );
}

export function useFloatingVideo() {
  const ctx = useContext(FloatingVideoContext);
  if (!ctx) throw new Error('useFloatingVideo must be used within FloatingVideoProvider');
  return ctx;
}
