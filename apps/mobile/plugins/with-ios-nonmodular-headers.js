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
 * All four were attempted on EAS. The practical way out is to stop using
 * react-native-maps on iOS — it is imported in exactly one screen
 * (src/screens/public/LiveTracking.tsx) — either by moving to `expo-maps`, which
 * is built for this toolchain, or by loading the map lazily on Android only.
 * That is a product decision, so it is written down here rather than guessed at.
 */
const MARKER = 'AgroTraders: iOS pod build settings';

const POST_INSTALL_SNIPPET = `
    # ${MARKER}
    installer.pods_project.targets.each do |pod_target|
      pod_target.build_configurations.each do |pod_config|
        pod_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
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
