const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * @react-native-firebase's Objective-C sources `#import` React-Core headers
 * (RCTConvert.h, RCTBridgeModule.h, RCTEventEmitter.h) non-modularly. RNFB also
 * requires `useFrameworks: 'static'` (set in app.config.js), and under static
 * frameworks Xcode promotes -Wnon-modular-include-in-framework-module to an
 * error — so every RNFBApp target fails to compile and the whole iOS build dies
 * in "Run fastlane". That is exactly what killed build 92182d0a on 2026-07-20:
 *
 *   include of non-modular header inside framework module
 *   'RNFBApp.RCTConvert_FIRApp' ... [-Werror,-Wnon-modular-include-in-framework-module]
 *
 * The setting has to land on the *Pods* targets, which CocoaPods generates on
 * the build machine, so it cannot come from app.json or expo-build-properties
 * (which exposes no arbitrary build settings). It has to be a post_install hook
 * in the Podfile, which is what this writes.
 *
 * Scoped to the Pods project only — the app target keeps the strict warning.
 */
const MARKER = 'AgroTraders: allow non-modular includes';

/**
 * Pods whose ObjC headers import React-Core types non-modularly AND are
 * themselves compiled as a module under static frameworks. Clang then rejects
 * the import outright ("declaration of 'RCTViewManager' must be imported from
 * module 'react_native_maps.AIRMapCalloutManager' before it is required") —
 * allowing non-modular includes is not enough, the target has to stop being
 * built with module semantics. Kept to a named list: Firebase needs its modules
 * for Swift interop, so this must never be applied project-wide.
 */
const NO_MODULES_PODS = ['react-native-maps', 'react-native-google-maps'];

const SNIPPET = `
    # ${MARKER} — see plugins/with-ios-nonmodular-headers.js
    installer.pods_project.targets.each do |pod_target|
      pod_target.build_configurations.each do |pod_config|
        pod_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        if ${JSON.stringify(NO_MODULES_PODS)}.include?(pod_target.name)
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

      const hook = /post_install do \|installer\|\n/;
      if (!hook.test(src)) {
        throw new Error(
          '[with-ios-nonmodular-headers] No `post_install do |installer|` block in the generated Podfile — ' +
            'the Expo template changed. Update this plugin instead of letting the build fail on RNFB headers.',
        );
      }
      fs.writeFileSync(podfile, src.replace(hook, (m) => m + SNIPPET), 'utf8');
      return cfg;
    },
  ]);
