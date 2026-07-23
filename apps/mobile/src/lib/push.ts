import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type FirebaseMessaging from '@react-native-firebase/messaging';
import { api } from './api';
import { translateGlobal } from '../i18n';
import { routeForNotification } from '../navigation/navigationRef';

// The native FCM module is absent in Expo Go, and importing it at module scope
// crashes the whole app on launch there. Load it lazily instead so the app boots
// in Expo Go (push simply stays disabled); dev/EAS builds resolve it normally.
// Returns null when the native module is unavailable.
function loadMessaging(): typeof FirebaseMessaging | null {
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    // In Expo Go the JS module resolves, but the native `RNFBAppModule` is
    // absent — the failure only surfaces when messaging() first constructs its
    // native event emitter. Probe it here so an unavailable module returns null
    // (push stays disabled) instead of throwing an uncaught error at launch.
    messaging();
    return messaging;
  } catch {
    return null;
  }
}

const TOKEN_CACHE_KEY = 'agrotraders_fcm_token';
const ANDROID_CHANNEL = 'default';

/**
 * Foreground presentation: FCM "notification" messages are shown by the OS only
 * when the app is backgrounded/quit. While the app is foregrounded we present a
 * local notification ourselves via expo-notifications.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let androidChannelReady = false;
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || androidChannelReady) return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    // Channel creation runs lazily (first push registration/presentation), so
    // the i18n instance exists by then; the fallback only covers early boots.
    name: translateGlobal('mobile:pubX.notif.channelGeneral', 'General'),
    importance: Notifications.AndroidImportance.HIGH,
  });
  androidChannelReady = true;
}

/** Present an incoming FCM message as a local notification (foreground only). */
async function present(remote: { title?: string | null; body?: string | null; data?: Record<string, unknown> }) {
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: remote.title ?? 'AgroTraders',
      body: remote.body ?? '',
      data: remote.data ?? {},
    },
    trigger: null,
  });
}

let unsubscribers: Array<() => void> = [];

/**
 * Request permission, obtain the FCM token, register it with the API, and wire
 * up foreground + tap listeners. Idempotent-ish: safe to call once per signed-in
 * session. Requires a dev/EAS build — the native module is absent in Expo Go, so
 * every call is a guarded no-op there. Returns the token or null.
 */
export async function registerForPush(): Promise<string | null> {
  const messaging = loadMessaging();
  if (!messaging) return null;
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (!enabled) return null;

    await ensureAndroidChannel();

    const token = await messaging().getToken();
    if (!token) return null;

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await api.notifications.registerDevice({ platform, token }).catch(() => {});

    // Clear any previous listeners before re-subscribing.
    unsubscribers.forEach((u) => u());
    unsubscribers = [];

    // Foreground messages → present a local notification.
    unsubscribers.push(
      messaging().onMessage(async (msg) => {
        await present({ title: msg.notification?.title, body: msg.notification?.body, data: msg.data });
      }),
    );
    // Token rotation → re-register.
    unsubscribers.push(
      messaging().onTokenRefresh(async (next) => {
        await api.notifications.registerDevice({ platform, token: next }).catch(() => {});
      }),
    );
    // Tap while app is backgrounded → deep-link.
    unsubscribers.push(
      messaging().onNotificationOpenedApp((msg) => routeForNotification(msg?.data)),
    );
    // Tap on an expo-notifications banner (foreground-presented) → deep-link.
    const sub = Notifications.addNotificationResponseReceivedListener((res) =>
      routeForNotification(res.notification.request.content.data as Record<string, unknown>),
    );
    unsubscribers.push(() => sub.remove());

    // Cold start from a notification tap.
    const initial = await messaging().getInitialNotification();
    if (initial?.data) routeForNotification(initial.data);

    return token;
  } catch {
    return null;
  }
}

/** Delete this device's token on logout (best-effort). */
export async function unregisterForPush(): Promise<void> {
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
  const messaging = loadMessaging();
  if (!messaging) return;
  try {
    const token = await messaging().getToken();
    if (token) await api.notifications.unregisterDevice(token).catch(() => {});
  } catch {
    /* native module unavailable (Expo Go) — nothing to unregister */
  }
}

export { TOKEN_CACHE_KEY };
