const DEFAULT_API_BASE = 'http://localhost:3100';

export function resolveApiBase(value = process.env.EXPO_PUBLIC_API_URL): string {
  const raw = value?.trim() || DEFAULT_API_BASE;
  return raw.replace(/\/+$/, '');
}

export function assetUrlFromBase(path: string | null | undefined, baseURL: string): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  return `${baseURL.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}
