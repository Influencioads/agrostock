const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Makes @react-native-firebase and react-native-maps coexist on iOS.
 *
 * The two pull in opposite directions and both constraints are real:
 *
 *  - Firebase's Swift dependencies CANNOT be built as static libraries. Without
 *    `use_frameworks! :linkage => :static` (set by `ios.useFrameworks` in
 *    app.config.js) `pod install` fails outright with "The following Swift pods
 *    cannot yet be integrated as static libraries". So use_frameworks stays.
 *
 *  - react-native-maps cannot be built as a framework. Under use_frameworks it
 *    compiles as a Clang module and its own non-modular React import is rejected:
 *    "declaration of 'RCTViewManager' must be imported from module
 *    'react_native_maps.AIRMapCalloutManager' before it is required". Turning
 *    modules off for that pod only trades it for "use of '@import' when modules
 *    are disabled", because maps uses @import itself.
 *
 * `use_frameworks!` is project-wide, but CocoaPods lets an individual pod opt out
 * by overriding its `build_type` in `pre_install`. That is what the hook below
 * does: everything keeps frameworks (Firebase is happy), and only the map pods
 * fall back to static libraries (maps is happy).
 *
 * The post_install setting is separate and still earns its place: it is what
 * cleared the ORIGINAL failure on this project (build 92182d0a), where RNFB's
 * own ObjC sources import React-Core headers non-modularly.
 */
const MARKER = 'AgroTraders: iOS pod build settings';

/** Pods that must stay static libraries even though the project uses frameworks. */
const STATIC_LIBRARY_PODS = ['react-native-maps', 'react-native-google-maps'];

const PRE_INSTALL = `
# ${MARKER} — see plugins/with-ios-nonmodular-headers.js
pre_install do |installer|
  installer.pod_targets.each do |pod|
    if ${JSON.stringify(STATIC_LIBRARY_PODS)}.include?(pod.name)
      def pod.build_type
        Pod::BuildType.static_library
      end
    end
  end
end
`;

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

      // pre_install must be top level, not nested inside the target block.
      const next = PRE_INSTALL + src.replace(hookPattern, (m) => m + POST_INSTALL_SNIPPET);
      fs.writeFileSync(podfile, next, 'utf8');
      return cfg;
    },
  ]);
