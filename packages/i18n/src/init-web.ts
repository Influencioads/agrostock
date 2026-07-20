import type { i18n as I18nInstance } from 'i18next';
import enAttrs from '../locales/en/attrs.json';
import enCommon from '../locales/en/common.json';
import enEnums from '../locales/en/enums.json';
import enErrors from '../locales/en/errors.json';
import enNav from '../locales/en/nav.json';
import enWeb from '../locales/en/web.json';
import { createBrowserI18n } from './init-shared';
import type { Namespace } from './index';

const NS: Namespace[] = ['web', 'common', 'nav', 'enums', 'errors', 'attrs'];

/**
 * One `import()` per namespace rather than a single `${ns}` template: Vite only
 * code-splits statically analyzable paths, and enumerating the namespaces keeps
 * the `admin` and `mobile` catalogs out of the web build entirely.
 */
function load(lng: string, ns: string): Promise<unknown> {
  switch (ns) {
    case 'web':
      return import(`../locales/${lng}/web.json`);
    case 'common':
      return import(`../locales/${lng}/common.json`);
    case 'nav':
      return import(`../locales/${lng}/nav.json`);
    case 'enums':
      return import(`../locales/${lng}/enums.json`);
    case 'errors':
      return import(`../locales/${lng}/errors.json`);
    case 'attrs':
      return import(`../locales/${lng}/attrs.json`);
    default:
      return Promise.reject(new Error(`i18n: web does not load namespace "${ns}"`));
  }
}

export function createWebI18n(): I18nInstance {
  return createBrowserI18n({
    ns: NS,
    defaultNS: 'web',
    eagerEn: { web: enWeb, common: enCommon, nav: enNav, enums: enEnums, errors: enErrors, attrs: enAttrs },
    load,
  });
}
