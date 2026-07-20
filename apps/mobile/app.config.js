/**
 * Extends app.json. Exists for one reason: cleartext HTTP.
 *
 * The `preview` EAS profile builds a *release* APK that talks to a plain-http
 * API on a temp IP, and Android blocks cleartext in release builds unless the
 * manifest opts in. That attribute used to be hand-edited into the generated
 * AndroidManifest.xml, which `expo prebuild --clean` silently discards. Setting
 * it through expo-build-properties makes it survive a prebuild.
 *
 * Production must never ship the exception — it talks to https://api.agrotraders.org.
 * EAS sets EAS_BUILD_PROFILE during a cloud build; locally it is undefined, so
 * dev/preview keep working against a LAN IP.
 *
 * Also layers on the Firebase native config file paths. The files
 * (google-services.json / GoogleService-Info.plist) are gitignored so they never
 * live in committed source. For local builds they sit at the default paths below.
 * For EAS cloud builds, register them as file secrets so they're injected without
 * being committed:
 *   eas secret:create --scope project --name GOOGLE_SERVICES_JSON       --type file --value ./google-services.json
 *   eas secret:create --scope project --name GOOGLE_SERVICES_INFO_PLIST --type file --value ./GoogleService-Info.plist
 * EAS exposes each file secret as an env var holding the path to the restored file,
 * which the fallbacks below pick up automatically.
 *
 * NOTE: these values ship inside the installed app binary by design — they are project
 * identifiers, not secrets. Real protection is Firebase Security Rules, App Check, and
 * restricting the API keys to this app's package/bundle + SHA-256 in the Google Cloud
 * console. Gitignoring them is hygiene, not a security boundary.
 *
 * The Google Maps API key (used by react-native-maps on Android, and iOS if the Google
 * provider is used) is read from GOOGLE_MAPS_API_KEY. Locally it comes from the
 * gitignored apps/mobile/.env (Expo auto-loads it); for EAS builds set it as a secret:
 *   eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value <key>
 * Same reality as above: it ends up in the app binary, so restrict it in the Google Cloud
 * console (Android: package + SHA-1; iOS: bundle id; limit to the Maps SDKs).
 */
module.exports = ({ config }) => {
  const isProduction = process.env.EAS_BUILD_PROFILE === 'production';
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      config: {
        ...config.android?.config,
        // Only inject when present so a missing key doesn't write an empty manifest entry.
        ...(mapsApiKey ? { googleMaps: { apiKey: mapsApiKey } } : {}),
      },
    },
    ios: {
      ...config.ios,
      googleServicesFile: process.env.GOOGLE_SERVICES_INFO_PLIST ?? './GoogleService-Info.plist',
      config: {
        ...config.ios?.config,
        ...(mapsApiKey ? { googleMapsApiKey: mapsApiKey } : {}),
      },
    },
    plugins: [
      ...config.plugins.filter((p) => p !== 'expo-build-properties'),
      [
        'expo-build-properties',
        {
          android: { usesCleartextTraffic: !isProduction },
          // @react-native-firebase requires the iOS Firebase SDK to be linked as
          // static frameworks, otherwise the CocoaPods install fails.
          ios: { useFrameworks: 'static' },
        },
      ],
    ],
  };
};
