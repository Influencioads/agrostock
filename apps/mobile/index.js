// Hermes on Android ships Intl.NumberFormat/DateTimeFormat but not Intl.PluralRules,
// which i18next needs to pick the right plural form (Russian has 3, Arabic has 6).
// Without this, i18next silently falls back to its legacy v3 plural handling.
// Must be imported before any i18next instance is created.
import 'intl-pluralrules';
import { registerRootComponent } from 'expo';
import App from './App';

// FCM background/quit-state handler must be registered at the top level, before
// the app renders (react-native-firebase requirement). "notification" messages
// are shown by the OS automatically; this handler just satisfies the SDK and is
// where any data-only background work would go. Guarded so Expo Go (no native
// module) doesn't crash on import.
try {
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async () => {});
} catch {
  /* native messaging module unavailable (e.g. Expo Go) — push simply disabled */
}

// Local entry (instead of expo/AppEntry) so the App import resolves correctly
// under pnpm's node_modules layout.
registerRootComponent(App);
