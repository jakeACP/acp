import { useEffect } from "react";

export function useScrollLight() {
  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const max = document.body.scrollHeight - window.innerHeight || 1;
          const ratio = window.scrollY / max;
          document.documentElement.style.setProperty(
            "--scroll-ratio",
            ratio.toString()
          );
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}
