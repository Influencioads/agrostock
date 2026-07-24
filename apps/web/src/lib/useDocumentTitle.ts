import { useEffect } from 'react';

/**
 * E10: set a per-route <title> for a CSR SPA. Every route previously shared the
 * one static title from index.html, so crawlers and browser tabs couldn't tell
 * pages apart and social shares of e.g. a product link showed the generic card.
 * This is the minimal fix (runtime title); a prerender/SSR step is the fuller
 * answer for per-product OG tags.
 */
const SUFFIX = 'AgroTraders';

export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
