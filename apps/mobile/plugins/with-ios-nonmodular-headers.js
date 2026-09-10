const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Makes @react-native-firebase and react-native-maps coexist on iOS.
 *
 * RNFB needs the Firebase pods linked statically. The obvious way to get that is
 * `use_frameworks! :linkage => :static` (what `expo-build-properties`'
 * `ios.useFrameworks` sets), but that is also what breaks react-native-maps:
 * under it, maps compiles as a Clang module and its non-modular RCTViewManager
 * import is rejected outright —
 *
 *   declaration of 'RCTViewManager' must be imported from module
 *   'react_native_maps.AIRMapCalloutManager' before it is required
 *
 * and disabling modules for that one pod only trades it for "use of '@import'
 * when modules are disabled", because maps uses @import itself. Both are
 * symptoms of use_frameworks.
 *
 * `$RNFirebaseAsStaticFramework` is RNFB's supported alternative (RNFBApp.podspec
 * :66-68 in the pinned app@25.1.0): the Firebase pods mark themselves
 * `static_framework`, so the project needs no use_frameworks at all and maps
 * builds normally. `useFrameworks` is correspondingly dropped from app.config.js.
 *
 * The post_install setting stays as cheap insurance for any pod that still mixes
 * modular and non-modular React headers; it was what cleared the original RNFB
 * failure (build 92182d0a) and costs nothing now.
 */
const MARKER = 'AgroTraders: allow non-modular includes';

const FIREBASE_GLOBAL = '$RNFirebaseAsStaticFramework = true\n';

const SNIPPET = `
    # ${MARKER} — see plugins/with-ios-nonmodular-headers.js
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
            'the Expo template changed. Update this plugin instead of letting the build fail on RNFB headers.',
        );
      }

      const withGlobal = src.includes('RNFirebaseAsStaticFramework') ? src : FIREBASE_GLOBAL + src;
      fs.writeFileSync(podfile, withGlobal.replace(hookPattern, (m) => m + SNIPPET), 'utf8');
      return cfg;
    },
  ]);
