import firebase from '@react-native-firebase/app';

// @react-native-firebase auto-initializes the default Firebase app from the native
// config files (google-services.json on Android, GoogleService-Info.plist on iOS)
// that app.config.js wires in via `googleServicesFile`. There is no JS config object
// to pass — initialization happens natively at app launch.
//
// This module just exposes the default app for convenience. Product modules are added
// on demand, e.g.:
//   import '@react-native-firebase/messaging';  // then: firebase.messaging()
//   import '@react-native-firebase/auth';        // then: firebase.auth()
//
// NOTE: requires a dev/production build (expo-dev-client or EAS) — the native module
// is not present in the plain Expo Go client.
export const firebaseApp = firebase.app();

export default firebase;
