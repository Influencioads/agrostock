import { Link } from 'react-router-dom';
import { BrandMark } from '@agrotraders/ui';
import { useBranding } from '../../branding/BrandingProvider';
import { useI18n } from '../../i18n';

/**
 * Column headings and link labels are catalog keys (`site.footer.*`), not
 * English strings: the label is what the user reads, the `to` is what the
 * router needs, and keeping them apart is what lets the footer translate.
 * The `/p/...` targets are CMS slugs — do not re-derive them from the label.
 */
const COLS: { h: string; links: [key: string, to: string][] }[] = [
  {
    h: 'marketplace',
    links: [
      ['buyProducts', '/market'],
      ['sellProducts', '/register'],
      ['liveAuctions', '/auctions'],
      ['offers', '/market'],
      ['intlTrade', '/market'],
    ],
  },
  {
    h: 'services',
    links: [
      ['bookTransport', '/transporters'],
      ['hireLoaders', '/loaders'],
      ['safeDeal', '/safe-deal'],
      ['wallet', '/console'],
      ['logistics', '/transporters'],
    ],
  },
  {
    h: 'company',
    links: [
      ['offices', '/offices'],
      ['community', '/'],
      ['about', '/p/about'],
      ['careers', '/p/careers'],
      ['press', '/p/press'],
    ],
  },
  {
    h: 'support',
    links: [
      ['help', '/p/help-centre'],
      ['contact', '/p/contact'],
      ['kyc', '/p/kyc-verification'],
      ['disputes', '/p/disputes'],
      ['languages', '/p/en-ru-support'],
    ],
  },
];

export function SiteFooter() {
  const { t } = useI18n();
  const { logoSrc } = useBranding();
  return (
    <footer className="bg-brand-evergreen text-mint/90">
      <div className="mx-auto grid grid-cols-1 max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:gap-10 sm:px-6 sm:py-14 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <BrandMark
            logoSrc={logoSrc}
            size="md"
            suffixClassName="text-brand-leaf"
            className="text-white"
          />
          <p className="mt-4 max-w-xs text-sm text-mint/70">{t('site.footerTagline')}</p>
        </div>
        {COLS.map((col) => (
          <div key={col.h}>
            <h4 className="font-display text-sm font-bold text-white">{t(`site.footer.col.${col.h}`)}</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map(([key, to]) => (
                <li key={key}>
                  <Link to={to} className="text-mint/70 transition hover:text-mango">
                    {t(`site.footer.link.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-xs text-mint/60 sm:flex-row sm:px-6 sm:text-start">
          <span>{t('site.copyright', { year: new Date().getFullYear() })}</span>
          <span className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link to="/p/terms" className="hover:text-mango">{t('site.terms')}</Link>
            <Link to="/p/privacy" className="hover:text-mango">{t('site.privacy')}</Link>
            <Link to="/p/cookies" className="hover:text-mango">{t('site.cookies')}</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
