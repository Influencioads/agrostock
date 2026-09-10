/**
 * react-native-maps is EXCLUDED from the iOS build.
 *
 * Its Google provider pod (AirGoogleMaps) cannot compile alongside
 * @react-native-firebase under `use_frameworks! :static`, which Firebase's Swift
 * dependencies require. plugins/with-ios-nonmodular-headers.js records the four
 * workarounds that were tried and the exact error each produced. The call was to
 * drop maps on iOS rather than keep fighting it — the feature was one screen.
 *
 * `platforms.ios = null` stops autolinking from adding the pod, so the native module
 * is not in the iOS binary at all. src/screens/public/TrackingMap.ios.tsx is the
 * matching JS half: it renders nothing and never imports react-native-maps, which is
 * required — importing an unlinked native module crashes at runtime.
 *
 * Android is untouched and still uses Google Maps.
 */
module.exports = {
  dependencies: {
    'react-native-maps': {
      platforms: {
        ios: null,
      },
    },
  },
};
