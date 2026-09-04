const { withAndroidManifest } = require('expo/config-plugins');

/**
 * expo-notifications and @react-native-firebase/messaging both declare the FCM
 * system-tray defaults. expo-notifications writes our branded icon/color into
 * the app manifest; the messaging AAR ships android:resource="@color/white" for
 * default_notification_color. The merger refuses to pick a winner and fails
 * :app:processReleaseMainManifest, so say explicitly that ours replaces theirs.
 *
 * Both keys are covered because either one can start colliding when the two
 * libraries are upgraded independently.
 */
const KEYS = [
  'com.google.firebase.messaging.default_notification_color',
  'com.google.firebase.messaging.default_notification_icon',
];

module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    for (const meta of app?.['meta-data'] ?? []) {
      if (KEYS.includes(meta.$['android:name'])) meta.$['tools:replace'] = 'android:resource';
    }
    return cfg;
  });
