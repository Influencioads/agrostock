import { Platform } from 'react-native';

/**
 * Cross-platform key/value store: SecureStore on native (encrypted, lazily
 * required so it never loads in the web bundle), localStorage on web.
 * Keys must be alphanumeric + underscore for SecureStore.
 */
type SecureStoreModule = {
  getItemAsync: (k: string) => Promise<string | null>;
  setItemAsync: (k: string, v: string) => Promise<void>;
  deleteItemAsync: (k: string) => Promise<void>;
};

let secure: SecureStoreModule | null = null;
function getSecure(): SecureStoreModule {
  if (!secure) secure = require('expo-secure-store') as SecureStoreModule;
  return secure;
}

export const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return getSecure().getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* ignore */
      }
      return;
    }
    await getSecure().setItemAsync(key, value);
  },
  async del(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        /* ignore */
      }
      return;
    }
    await getSecure().deleteItemAsync(key);
  },
};
