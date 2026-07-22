import { Link } from 'react-router-dom';
import { BrandMark } from '@agrotraders/ui';
import { useBranding } from '../../branding/BrandingProvider';
import { useI18n } from '../../i18n';
import { footerCols } from '../../mock/data';

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Map a footer label to a real destination; unknown labels fall to a CMS page. */
const LINK_MAP: Record<string, string> = {
  'Buy Products': '/market',
  'Sell Products': '/register',
  'Live Auctions': '/auctions',
  'Offers': '/market',
  'International Trade': '/market',
  'Book Transport': '/transporters',
  'Hire Loaders': '/loaders',
  'Safe Deal': '/safe-deal',
  'Wallet': '/console',
  'Logistics': '/transporters',
  'Global Offices': '/offices',
  'Community': '/',
};
const hrefFor = (label: string) => LINK_MAP[label] ?? `/p/${slugify(label)}`;

export function SiteFooter() {
  const { t } = useI18n();
  const { logoSrc } = useBranding();
  return (
    <footer className="bg-brand-evergreen text-mint/90">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:gap-10 sm:px-6 sm:py-14 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <BrandMark
            logoSrc={logoSrc}
            size="md"
            suffixClassName="text-brand-leaf"
            className="text-white"
          />
          <p className="mt-4 max-w-xs text-sm text-mint/70">{t('site.footerTagline')}</p>
        </div>
        {footerCols.map((col) => (
          <div key={col.h}>
            <h4 className="font-display text-sm font-bold text-white">{col.h}</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l}>
                  <Link to={hrefFor(l)} className="text-mint/70 transition hover:text-mango">
                    {l}
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
