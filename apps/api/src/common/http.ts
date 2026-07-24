/**
 * SEC-06: build a safe `Content-Disposition` header value from a possibly
 * user-controlled filename (e.g. a KYC document's uploaded `originalName`).
 *
 * Embedding the raw name as `filename="${name}"` let a name containing a quote,
 * backslash, or CR/LF smuggle extra header directives or corrupt the header the
 * reviewing admin's browser sees. We emit BOTH a sanitized ASCII `filename=`
 * (control chars, quotes, backslashes and path separators stripped) and an
 * RFC 5987 `filename*=UTF-8''…` with the original percent-encoded, so unicode
 * names still render correctly without ever putting raw bytes in the header.
 */
export function contentDisposition(name: string, disposition: 'inline' | 'attachment' = 'inline'): string {
  const fallback =
    name
      .replace(/[\r\n"\\/ -]/g, '') // header-breaking + path chars
      .replace(/[^\x20-\x7e]/g, '_') // remaining non-ASCII → placeholder for the legacy param
      .trim()
      .slice(0, 200) || 'download';
  // RFC 5987: percent-encode everything outside the token-safe set.
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
