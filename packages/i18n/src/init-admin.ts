import type { i18n as I18nInstance } from 'i18next';
import enAdmin from '../locales/en/admin.json';
import enCommon from '../locales/en/common.json';
import enEnums from '../locales/en/enums.json';
import enErrors from '../locales/en/errors.json';
import enNav from '../locales/en/nav.json';
import { createBrowserI18n } from './init-shared';
import type { Namespace } from './index';

const NS: Namespace[] = ['admin', 'common', 'nav', 'enums', 'errors'];

/** See the note in `init-web.ts` — one `import()` per namespace, so Vite splits them cleanly. */
function load(lng: string, ns: string): Promise<unknown> {
  switch (ns) {
    case 'admin':
      return import(`../locales/${lng}/admin.json`);
    case 'common':
      return import(`../locales/${lng}/common.json`);
    case 'nav':
      return import(`../locales/${lng}/nav.json`);
    case 'enums':
      return import(`../locales/${lng}/enums.json`);
    case 'errors':
      return import(`../locales/${lng}/errors.json`);
    default:
      return Promise.reject(new Error(`i18n: admin does not load namespace "${ns}"`));
  }
}

export function createAdminI18n(): I18nInstance {
  return createBrowserI18n({
    ns: NS,
    defaultNS: 'admin',
    eagerEn: { admin: enAdmin, common: enCommon, nav: enNav, enums: enEnums, errors: enErrors },
    load,
  });
}
