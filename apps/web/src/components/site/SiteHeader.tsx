import { Link, useNavigate } from 'react-router-dom';
import { Avatar, BrandMark, Button, Icon } from '@agrotraders/ui';
import { useI18n, LanguageSelect } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import { useBranding } from '../../branding/BrandingProvider';
import { CurrencySelect } from '../../currency/CurrencyContext';
import { PrimaryNav } from './PrimaryNav';
import { MobileNav } from './MobileNav';

export function SiteHeader() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const { logoSrc } = useBranding();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-white/95 backdrop-blur">
      {/* ribbon */}
      <div className="bg-brand-evergreen text-mint">
        {/* Separators are their own flex items: nesting them inside the following
            span made a wrapped line start with a stray "·". */}
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-3 py-1.5 text-center text-[11px] leading-snug sm:gap-x-3 sm:px-4 sm:text-[12.5px]">
          {(t('ribbon', { returnObjects: true }) as string[]).map((r, i) => (
            <span key={i} className="flex max-w-full min-w-0 items-center justify-center gap-2">
              {i > 0 && <span aria-hidden="true" className="text-mango">·</span>}
              <span className="min-w-0 break-words">{r}</span>
            </span>
          ))}
        </div>
      </div>

      {/* main bar */}
      <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-2.5 py-2.5 sm:gap-4 sm:px-4 sm:py-3 lg:px-6">
        {/* Hamburger holds the nav + auth actions below `lg`, where no language fits
            the full row. */}
        <MobileNav />

        {/* `shrink-0`: the logo was the only shrinkable child of this row, so it was
            what got crushed when translated labels grew (170px of mark squeezed
            into 130px). */}
        <Link to="/" className="min-w-0 shrink-0">
          {/* Never clip the wordmark. A `max-w` + `overflow-hidden` clamp here
              cut it to "AgroTrad" mid-letter. The full name is 170px at
              `text-xl`, but only ~145px is free once the hamburger and the auth
              buttons take their share of a 360px row — so the type scales down
              instead of the name being truncated. */}
          <BrandMark
            logoSrc={logoSrc}
            size="md"
            glyphClassName="shadow-cta"
            wordmarkClassName="text-[15px] min-[400px]:text-lg sm:text-xl"
          />
        </Link>

        {/* Measures itself and folds any overflow into «More» — see PrimaryNav. */}
        <PrimaryNav />

        {/* Auth actions stay on the bar at EVERY width. They used to be
            `hidden sm:*` wholesale, which left a phone with nothing but a
            hamburger and a logo — sign in / sign up / log out read as simply
            missing. Only the secondary controls (currency, language, Dashboard)
            still fold into the drawer; the primary action never does. */}
        <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2 xl:ms-0">
          {/* display currency */}
          <CurrencySelect className="hidden sm:block" />
          {/* language */}
          <LanguageSelect className="hidden sm:block" />

          {user ? (
            <>
              <Link to="/console" title={user.name}>
                <Avatar name={user.name} size={34} />
              </Link>
              {/* Icon-only below `sm`: the label plus the avatar plus the logo
                  will not fit 360px, but logging out must stay one tap. */}
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                aria-label={t('common:logOut')}
                title={t('common:logOut')}
                className="inline-flex min-h-9 items-center justify-center rounded-md border border-surface-border px-2 text-ink transition hover:border-brand-leaf hover:text-brand sm:hidden"
              >
                <Icon name="logout" size={18} />
              </button>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                {t('common:logOut')}
              </Button>
              <Button
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => navigate('/console')}
              >
                {t('common:dashboard')}
              </Button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="min-h-9 shrink-0 rounded-md px-2 text-sm font-bold text-ink transition hover:text-brand sm:px-3"
              >
                {t('common:signIn')}
              </button>
              <Button size="sm" className="shrink-0 px-2.5 sm:px-3" onClick={() => navigate('/register')}>
                {t('common:signUp')}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
