import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, assetUrl } from '../lib/api';

export interface BrandingValue {
  /** Resolved absolute URLs, or undefined when the admin has not uploaded one. */
  logoSrc?: string;
  appIconSrc?: string;
  faviconSrc?: string;
}

const BrandingContext = createContext<BrandingValue>({});
const DEFAULT_LOGO = '/brand/agrotraders-mark.png';
const DEFAULT_FAVICON = '/favicon-32.png';

export function useBranding(): BrandingValue {
  return useContext(BrandingContext);
}

/** Point the tab icon at an uploaded favicon. index.html is static, so this is
 *  the only way to honour a value that lives in the database. */
function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}

/**
 * Fetches the admin-managed brand assets once per session. A failure here is
 * non-fatal: consumers fall back to the built-in mark and the committed favicon.
 */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ['branding'],
    queryFn: () => api.branding.get(),
    staleTime: Infinity,
    retry: false,
  });

  const value: BrandingValue = {
    logoSrc: assetUrl(data?.logoUrl) ?? DEFAULT_LOGO,
    appIconSrc: assetUrl(data?.appIconUrl),
    faviconSrc: assetUrl(data?.faviconUrl) ?? DEFAULT_FAVICON,
  };

  useEffect(() => {
    setFavicon(value.faviconSrc ?? DEFAULT_FAVICON);
  }, [value.faviconSrc]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}
