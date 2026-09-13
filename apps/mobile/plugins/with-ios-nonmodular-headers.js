const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Podfile settings for the iOS build.
 *
 * What this DOES fix: @react-native-firebase's ObjC sources import React-Core
 * headers non-modularly, which Xcode promotes to an error under
 * `use_frameworks! :linkage => :static`. Allowing non-modular includes on the
 * Pods targets clears it — that was the failure on build 92182d0a.
 *
 * WHAT IS STILL BROKEN, and why the obvious fixes do not work.
 * react-native-maps and @react-native-firebase have opposed, real requirements:
 *
 *  1. Firebase's Swift dependencies cannot be static libraries. Remove
 *     `ios.useFrameworks` (app.config.js) and `pod install` fails outright:
 *     "The following Swift pods cannot yet be integrated as static libraries".
 *     Tried; does not work. `$RNFirebaseAsStaticFramework` does not avoid it.
 *  2. Under use_frameworks, react-native-maps compiles as a Clang module and its
 *     own non-modular import is rejected: "declaration of 'RCTViewManager' must
 *     be imported from module 'react_native_maps.AIRMapCalloutManager'".
 *  3. Setting CLANG_ENABLE_MODULES=NO for the map pods only trades that for
 *     "use of '@import' when modules are disabled" — maps uses @import itself.
 *  4. Forcing the map pods to static_library via a `pre_install` build_type
 *     override gets past maps and mirrors the same error onto Firebase:
 *     "declaration of 'RCTPromiseRejectBlock' must be imported from module
 *     'RNFBApp.RNFBAppModule'".
 *
 * All four were attempted on EAS, and (1)-(3) were reproduced locally on Xcode 26.5.
 *
 * RESOLVED — react-native-maps is no longer in the iOS build.
 * The four failures above are kept so nobody retries them. What was actually done:
 *
 *  - react-native.config.js excludes react-native-maps from iOS autolinking, so
 *    neither AirMaps nor AirGoogleMaps is compiled or linked on iOS.
 *  - app.config.js no longer injects `ios.config.googleMapsApiKey`. That key is what
 *    made prebuild add the `react-native-google-maps` pod in the first place.
 *  - src/screens/public/TrackingMap.ios.tsx renders nothing, so the iOS bundle never
 *    imports the module. The Live Tracking screen still shows route, distance, ETA
 *    and status on iOS — only the map itself is gone.
 *
 * Android is unchanged and still uses Google Maps. If iOS needs a map again, use
 * `expo-maps`; re-enabling react-native-maps means re-fighting the Firebase conflict.
 *
 * WALL 2 — @react-native-firebase, which was HIDDEN behind the maps failure.
 * Once maps stopped failing first, RNFBMessaging failed with:
 *   "declaration of 'RCTPromiseRejectBlock' must be imported from module
 *    'RNFBApp.RNFBAppModule' before it is required"
 * This is NOT a missing import — RNFBMessaging+AppDelegate.h already imports
 * <React/RCTBridgeModule.h>. React-Core headers get textually included into two
 * different Clang modules, so the declaration ends up owned by RNFBApp rather than
 * React, and CLANG_ALLOW_NON_MODULAR_INCLUDES (which IS applied) is simply the wrong
 * diagnostic for it.
 *
 * Also tried and FAILED: `$RNFirebaseAsStaticFramework = true` *together with*
 * `use_frameworks! :static`. pod install succeeds, but the compile error is
 * unchanged. (Note this is a different experiment from the one in (1), which used
 * that flag *instead of* useFrameworks and died at pod install.)
 *
 * FIXED by CLANG_ENABLE_MODULES = NO, scoped to the RNFB* pod targets only — see the
 * snippet below for why that scoping is load-bearing.
 */
const MARKER = 'AgroTraders: iOS pod build settings';

const POST_INSTALL_SNIPPET = `
    # ${MARKER}
    installer.pods_project.targets.each do |pod_target|
      pod_target.build_configurations.each do |pod_config|
        pod_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        # @react-native-firebase only. Its ObjC sources contain no \`@import\`, so
        # turning Clang modules off for these targets is safe and is what stops
        # React-Core declarations being attributed to the RNFBApp module. Do NOT
        # widen this to every pod: react-native-maps DOES use \`@import\` and fails
        # with "use of '@import' when modules are disabled" (workaround 3 below).
        if pod_target.name.start_with?('RNFB')
          pod_config.build_settings['CLANG_ENABLE_MODULES'] = 'NO'
        end
      end
    end
`;

module.exports = (config) =>
  withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const src = fs.readFileSync(podfile, 'utf8');
      // Idempotent: `expo prebuild` without --clean re-runs mods over an existing Podfile.
      if (src.includes(MARKER)) return cfg;

      const hookPattern = /post_install do \|installer\|\n/;
      if (!hookPattern.test(src)) {
        throw new Error(
          '[with-ios-nonmodular-headers] No `post_install do |installer|` block in the generated Podfile — ' +
            'the Expo template changed. Update this plugin instead of letting the build fail on pod integration.',
        );
      }

      fs.writeFileSync(podfile, src.replace(hookPattern, (m) => m + POST_INSTALL_SNIPPET), 'utf8');
      return cfg;
    },
  ]);
