import { getToken, onMessage, isSupported, type MessagePayload } from 'firebase/messaging';
import { messaging, firebaseConfig } from './firebase';
import { api } from './api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
const TOKEN_CACHE_KEY = 'fcmToken';

function swUrl(): string {
  const p = new URLSearchParams();
  if (firebaseConfig.apiKey) p.set('apiKey', firebaseConfig.apiKey);
  if (firebaseConfig.authDomain) p.set('authDomain', firebaseConfig.authDomain);
  if (firebaseConfig.projectId) p.set('projectId', firebaseConfig.projectId);
  if (firebaseConfig.storageBucket) p.set('storageBucket', firebaseConfig.storageBucket);
  if (firebaseConfig.messagingSenderId) p.set('messagingSenderId', firebaseConfig.messagingSenderId);
  if (firebaseConfig.appId) p.set('appId', firebaseConfig.appId);
  return `/firebase-messaging-sw.js?${p.toString()}`;
}

export async function webPushSupported(): Promise<boolean> {
  if (!messaging || !VAPID_KEY) return false;
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return false;
  return isSupported().catch(() => false);
}

/** Request permission, get an FCM token and register it with the API. */
export async function enableWebPush(onForeground?: (p: MessagePayload) => void): Promise<string | null> {
  try {
    if (!(await webPushSupported()) || !messaging) return null;
    const registration = await navigator.serviceWorker.register(swUrl());
    if (Notification.permission === 'denied') return null;
    const permission =
      Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) return null;

    if (localStorage.getItem(TOKEN_CACHE_KEY) !== token) {
      await api.notifications
        .registerDevice({ platform: 'web', token, userAgent: navigator.userAgent })
        .then(() => localStorage.setItem(TOKEN_CACHE_KEY, token))
        .catch(() => {});
    }
    if (onForeground) onMessage(messaging, onForeground);
    return token;
  } catch {
    return null;
  }
}

export async function disableWebPush(): Promise<void> {
  const token = localStorage.getItem(TOKEN_CACHE_KEY);
  localStorage.removeItem(TOKEN_CACHE_KEY);
  if (token) await api.notifications.unregisterDevice(token).catch(() => {});
}
