import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getMessaging, type Messaging } from 'firebase/messaging';

// Firebase web config. These values are read from VITE_FIREBASE_* env vars (loaded
// from the monorepo-root .env, which is gitignored) so they never live in committed
// source. NOTE: web config values are shipped in the public client bundle by design —
// they are identifiers, not secrets. Actual protection comes from Firebase Security
// Rules, App Check, and API-key referrer restrictions in the Google Cloud console.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Only initialize when the config is actually present, so local/dev environments
// without Firebase credentials don't crash on boot.
const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const firebaseApp: FirebaseApp | null = isConfigured
  ? initializeApp(firebaseConfig)
  : null;

// Analytics only works in supported browser environments; guard so it never throws.
let analytics: Analytics | null = null;
if (firebaseApp && firebaseConfig.measurementId) {
  isSupported()
    .then((ok) => {
      if (ok && firebaseApp) analytics = getAnalytics(firebaseApp);
    })
    .catch(() => {
      /* analytics unavailable — safe to ignore */
    });
}

export { analytics };

// Cloud Messaging (web push). Guarded: unsupported browsers (Safari <16.4, some
// in-app webviews) return no messaging instance, and getMessaging can throw when
// the environment lacks the required APIs — callers must null-check.
let messaging: Messaging | null = null;
if (firebaseApp && typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(firebaseApp);
  } catch {
    /* messaging unsupported here — web push simply stays disabled */
  }
}

export { messaging };
