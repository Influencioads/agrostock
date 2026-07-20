import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';

// Public Firebase web config (identifiers, not secrets — see the web app's
// firebase.ts for the rationale). Read from VITE_FIREBASE_* env; null-guarded so
// the panel boots without Firebase configured.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
export const firebaseApp: FirebaseApp | null = isConfigured ? initializeApp(firebaseConfig) : null;

let messaging: Messaging | null = null;
if (firebaseApp && typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(firebaseApp);
  } catch {
    /* web push unsupported here */
  }
}

export { messaging };
