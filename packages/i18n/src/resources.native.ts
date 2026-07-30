import type { Resource } from 'i18next';

// Metro does not code-split `import()` and its package-`exports` subpath support is
// behind a flag, so every catalog is imported statically by relative path and the
// whole set ships in the bundle. Mobile loads 5 namespaces per locale
// (mobile/common/nav/enums/errors); add a locale block here when its JSON lands.
import enCommon from '../locales/en/common.json';
import enEnums from '../locales/en/enums.json';
import enErrors from '../locales/en/errors.json';
import enMobile from '../locales/en/mobile.json';
import enNav from '../locales/en/nav.json';

import ruCommon from '../locales/ru/common.json';
import ruEnums from '../locales/ru/enums.json';
import ruErrors from '../locales/ru/errors.json';
import ruMobile from '../locales/ru/mobile.json';
import ruNav from '../locales/ru/nav.json';

/** Every supported locale ships its mobile catalog. Keys missing in a locale fall back to `en`. */
export const resources: Resource = {
  en: { mobile: enMobile, common: enCommon, nav: enNav, enums: enEnums, errors: enErrors },
  ru: { mobile: ruMobile, common: ruCommon, nav: ruNav, enums: ruEnums, errors: ruErrors },
};
