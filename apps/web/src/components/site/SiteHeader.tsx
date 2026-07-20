import { Link, useNavigate } from 'react-router-dom';
import { Avatar, BrandMark, Button } from '@agrotraders/ui';
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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-1.5 text-[12.5px]">
          {(t('ribbon', { returnObjects: true }) as string[]).map((r, i) => (
            <span key={i} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden="true" className="text-mango">·</span>}
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* main bar */}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:px-6">
        {/* Hamburger holds the nav + auth actions below `lg`, where no language fits
            the full row. */}
        <MobileNav />

        {/* `shrink-0`: the logo was the only shrinkable child of this row, so it was
            what got crushed when translated labels grew (170px of mark squeezed
            into 130px). */}
        <Link to="/" className="shrink-0">
          <BrandMark logoSrc={logoSrc} size="md" glyphClassName="shadow-cta" />
        </Link>

        {/* Measures itself and folds any overflow into «More» — see PrimaryNav. */}
        <PrimaryNav />

        <div className="ms-auto flex shrink-0 items-center gap-2 xl:ms-0">
          {/* display currency */}
          <CurrencySelect className="hidden sm:block" />
          {/* language */}
          <LanguageSelect />

          {user ? (
            <>
              <Link to="/console" title={user.name} className="hidden sm:block">
                <Avatar name={user.name} size={34} />
              </Link>
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
                className="hidden rounded-md px-3 py-2 text-sm font-bold text-ink hover:text-brand sm:block"
              >
                {t('common:signIn')}
              </button>
              <Button
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => navigate('/register')}
              >
                {t('common:signUp')}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
