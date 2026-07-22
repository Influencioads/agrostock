import type { Resource } from 'i18next';

// Metro does not code-split `import()` and its package-`exports` subpath support is
// behind a flag, so every catalog is imported statically by relative path and the
// whole set ships in the bundle. Mobile loads 6 namespaces per locale
// (mobile/common/nav/enums/errors/attrs); add a locale block here when its JSON
// lands. `attrs` is the generated product-attribute catalog (~160KB per locale) —
// the bulk of this bundle; move it behind a lazy fetch if startup ever suffers.
import enCommon from '../locales/en/common.json';
import enEnums from '../locales/en/enums.json';
import enErrors from '../locales/en/errors.json';
import enMobile from '../locales/en/mobile.json';
import enNav from '../locales/en/nav.json';
import enAttrs from '../locales/en/attrs.json';

import ruCommon from '../locales/ru/common.json';
import ruEnums from '../locales/ru/enums.json';
import ruErrors from '../locales/ru/errors.json';
import ruMobile from '../locales/ru/mobile.json';
import ruNav from '../locales/ru/nav.json';
import ruAttrs from '../locales/ru/attrs.json';

import zhCommon from '../locales/zh-Hans/common.json';
import zhEnums from '../locales/zh-Hans/enums.json';
import zhErrors from '../locales/zh-Hans/errors.json';
import zhMobile from '../locales/zh-Hans/mobile.json';
import zhNav from '../locales/zh-Hans/nav.json';
import zhAttrs from '../locales/zh-Hans/attrs.json';

import esCommon from '../locales/es/common.json';
import esEnums from '../locales/es/enums.json';
import esErrors from '../locales/es/errors.json';
import esMobile from '../locales/es/mobile.json';
import esNav from '../locales/es/nav.json';
import esAttrs from '../locales/es/attrs.json';

import hiCommon from '../locales/hi/common.json';
import hiEnums from '../locales/hi/enums.json';
import hiErrors from '../locales/hi/errors.json';
import hiMobile from '../locales/hi/mobile.json';
import hiNav from '../locales/hi/nav.json';
import hiAttrs from '../locales/hi/attrs.json';

import arCommon from '../locales/ar/common.json';
import arEnums from '../locales/ar/enums.json';
import arErrors from '../locales/ar/errors.json';
import arMobile from '../locales/ar/mobile.json';
import arNav from '../locales/ar/nav.json';
import arAttrs from '../locales/ar/attrs.json';

import ptCommon from '../locales/pt/common.json';
import ptEnums from '../locales/pt/enums.json';
import ptErrors from '../locales/pt/errors.json';
import ptMobile from '../locales/pt/mobile.json';
import ptNav from '../locales/pt/nav.json';
import ptAttrs from '../locales/pt/attrs.json';

import frCommon from '../locales/fr/common.json';
import frEnums from '../locales/fr/enums.json';
import frErrors from '../locales/fr/errors.json';
import frMobile from '../locales/fr/mobile.json';
import frNav from '../locales/fr/nav.json';
import frAttrs from '../locales/fr/attrs.json';

import deCommon from '../locales/de/common.json';
import deEnums from '../locales/de/enums.json';
import deErrors from '../locales/de/errors.json';
import deMobile from '../locales/de/mobile.json';
import deNav from '../locales/de/nav.json';
import deAttrs from '../locales/de/attrs.json';

import jaCommon from '../locales/ja/common.json';
import jaEnums from '../locales/ja/enums.json';
import jaErrors from '../locales/ja/errors.json';
import jaMobile from '../locales/ja/mobile.json';
import jaNav from '../locales/ja/nav.json';
import jaAttrs from '../locales/ja/attrs.json';

import faCommon from '../locales/fa/common.json';
import faEnums from '../locales/fa/enums.json';
import faErrors from '../locales/fa/errors.json';
import faMobile from '../locales/fa/mobile.json';
import faNav from '../locales/fa/nav.json';
import faAttrs from '../locales/fa/attrs.json';

/** Every supported locale ships its mobile catalog. Keys missing in a locale fall back to `en`. */
export const resources: Resource = {
  en: { mobile: enMobile, common: enCommon, nav: enNav, enums: enEnums, errors: enErrors, attrs: enAttrs },
  ru: { mobile: ruMobile, common: ruCommon, nav: ruNav, enums: ruEnums, errors: ruErrors, attrs: ruAttrs },
  'zh-Hans': { mobile: zhMobile, common: zhCommon, nav: zhNav, enums: zhEnums, errors: zhErrors, attrs: zhAttrs },
  es: { mobile: esMobile, common: esCommon, nav: esNav, enums: esEnums, errors: esErrors, attrs: esAttrs },
  hi: { mobile: hiMobile, common: hiCommon, nav: hiNav, enums: hiEnums, errors: hiErrors, attrs: hiAttrs },
  ar: { mobile: arMobile, common: arCommon, nav: arNav, enums: arEnums, errors: arErrors, attrs: arAttrs },
  pt: { mobile: ptMobile, common: ptCommon, nav: ptNav, enums: ptEnums, errors: ptErrors, attrs: ptAttrs },
  fr: { mobile: frMobile, common: frCommon, nav: frNav, enums: frEnums, errors: frErrors, attrs: frAttrs },
  de: { mobile: deMobile, common: deCommon, nav: deNav, enums: deEnums, errors: deErrors, attrs: deAttrs },
  ja: { mobile: jaMobile, common: jaCommon, nav: jaNav, enums: jaEnums, errors: jaErrors, attrs: jaAttrs },
  fa: { mobile: faMobile, common: faCommon, nav: faNav, enums: faEnums, errors: faErrors, attrs: faAttrs },
};
