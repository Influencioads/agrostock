import { describe, expect, it } from 'vitest';
import { contentDisposition } from '../src/common/http';

describe('contentDisposition (SEC-06)', () => {
  it('neutralizes a header-injection filename', () => {
    const h = contentDisposition('a"; attachment; x="\r\nSet-Cookie: p=1');
    // No CR/LF → the payload can't start a new header line.
    expect(h).not.toMatch(/[\r\n]/);
    // Exactly the two quotes of the legacy filename="" param survive → the
    // injected quotes can't break out of the quoted value (any leftover text is
    // inert inside it). The RFC 5987 param carries the rest percent-encoded.
    const legacy = h.match(/filename="([^]*)"; filename\*/)?.[1];
    expect(legacy).toBeDefined();
    expect(legacy).not.toContain('"');
    expect((h.match(/"/g) ?? []).length).toBe(2);
  });

  it('strips path separators from the legacy filename param', () => {
    const h = contentDisposition('../../etc/passwd');
    // No path separator survives, so a browser can't be steered to a path.
    expect(h).not.toContain('/');
    expect(h).not.toContain('\\');
  });

  it('preserves the unicode name via a decodable RFC 5987 param', () => {
    const name = 'facturé—δ.pdf';
    const h = contentDisposition(name);
    const encoded = h.match(/filename\*=UTF-8''(\S+)$/)?.[1];
    expect(encoded).toBeTruthy();
    expect(decodeURIComponent(encoded!)).toBe(name);
  });

  it('falls back to a safe default for an all-illegal name', () => {
    expect(contentDisposition('"""')).toContain('filename="download"');
  });
});
