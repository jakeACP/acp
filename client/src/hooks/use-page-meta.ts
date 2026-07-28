import { useEffect } from "react";

interface PageMetaOptions {
  title: string;
  description?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
}

const SITE_NAME = "ACP Democracy";
const DEFAULT_DESCRIPTION =
  "The Anti-Corruption Party platform for transparent democratic participation, candidate tracking, and civic engagement.";

function setMeta(name: string, content: string, isProp = false) {
  const attr = isProp ? "property" : "name";
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function usePageMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogType = "website",
  ogImage,
}: PageMetaOptions) {
  useEffect(() => {
    const fullTitle = `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    const canonicalHref =
      canonical ?? `${window.location.origin}${window.location.pathname}`;

    setMeta("description", description);
    setCanonical(canonicalHref);

    setMeta("og:type", ogType, true);
    setMeta("og:site_name", SITE_NAME, true);
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:url", canonicalHref, true);
    if (ogImage) setMeta("og:image", ogImage, true);

    setMeta("twitter:card", ogImage ? "summary_large_image" : "summary");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    if (ogImage) setMeta("twitter:image", ogImage);

    return () => {
      document.title = `${SITE_NAME} - Anti-Corruption Party Platform`;
    };
  }, [title, description, canonical, ogType, ogImage]);
}
