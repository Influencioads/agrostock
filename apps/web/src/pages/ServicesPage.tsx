import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiServiceProvider } from '@agrotraders/api-client';
import { SERVICE_CATEGORIES, SERVICE_GROUPS } from '@agrotraders/types';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useCurrency } from '../currency/CurrencyContext';
import { useI18n } from '../i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { chatBus } from '../chat/chatBus';

/**
 * Public directory of service providers.
 *
 * Browsable without an account — a buyer evaluates providers before signing in,
 * and only sending an enquiry requires login. Filters live in the query string so
 * a filtered view is a shareable link.
 */
export function ServicesPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { fmtCents } = useCurrency();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  useDocumentTitle(t('service.providers'));

  const category = params.get('category') ?? '';
  const city = params.get('city') ?? '';

  const { data: providers = [], isLoading } = useQuery<ApiServiceProvider[]>({
    queryKey: ['service-providers', category, city],
    queryFn: () => api.services.providers({ category: category || undefined, city: city || undefined }),
  });

  /** Write one filter into the URL, dropping it entirely when cleared. */
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('service.providers')}</h1>
      <p className="mt-1 text-ink-soft">{t('service.sub')}</p>

      {/* Category chips, grouped the way the trade thinks about them. */}
      <div className="mt-6 space-y-3">
        {(Object.keys(SERVICE_GROUPS) as (keyof typeof SERVICE_GROUPS)[]).map((group) => (
          <div key={group} className="flex flex-wrap items-center gap-2">
            <span className="w-full text-xs font-semibold uppercase tracking-wide text-ink-soft sm:w-40">
              {t(`service.group.${group}`)}
            </span>
            {SERVICE_GROUPS[group].map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setFilter('category', category === c ? '' : c)}
                className={
                  'rounded-full border px-3 py-1.5 text-sm font-semibold transition ' +
                  (category === c
                    ? 'border-brand bg-brand-surface text-brand-dark'
                    : 'border-surface-border text-ink-soft hover:border-brand-leaf')
                }
              >
                {t(`enums:serviceCategory.${c}`)}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <input
          value={city}
          onChange={(e) => setFilter('city', e.target.value)}
          placeholder={t('service.cities')}
          className="w-full max-w-sm rounded-md border border-surface-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-leaf"
        />
      </div>

      {isLoading ? (
        <Card className="mt-6 py-16 text-center text-ink-soft">{t('common:loading')}</Card>
      ) : providers.length === 0 ? (
        <Card className="mt-6 py-16 text-center text-ink-soft">{t('service.none')}</Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <Card key={p.id} className="flex h-full flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-display text-base font-bold text-ink">
                    <span className="truncate">{p.companyName || p.user.name}</span>
                    {p.user.kycStatus === 'verified' && <Icon name="shield" size={14} className="shrink-0 text-brand" />}
                  </div>
                  <div className="text-xs text-ink-soft">{t(`enums:serviceRole.${p.user.role}`, { defaultValue: p.user.role })}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {p.categories.slice(0, 3).map((c) => (
                  <Badge key={c} tone="slate">{t(`enums:serviceCategory.${c}`)}</Badge>
                ))}
              </div>

              <dl className="space-y-0.5 text-sm text-ink-soft">
                {p.citiesServed.length > 0 && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Icon name="mapPin" size={13} className="shrink-0" />
                    <span className="truncate">{p.citiesServed.join(', ')}</span>
                  </div>
                )}
                {p.capacityPerDay != null && (
                  <div>{t('service.capacity')}: <b className="text-ink">{p.capacityPerDay}</b></div>
                )}
                {p.turnaroundDays != null && (
                  <div>{t('service.turnaround')}: <b className="text-ink">{t('service.turnaroundDays', { count: p.turnaroundDays })}</b></div>
                )}
                {p.certifications.length > 0 && (
                  <div className="truncate">{t('service.certifications')}: {p.certifications.join(', ')}</div>
                )}
              </dl>

              <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                <div className="font-display text-sm font-extrabold text-ink">
                  {p.priceFromCents != null && p.pricingBasis
                    ? t('service.priceFrom', {
                        amount: fmtCents(p.priceFromCents),
                        basis: t(`enums:servicePricingBasis.${p.pricingBasis}`),
                      })
                    : t('service.onEnquiry')}
                </div>
                {/* Browsing is open; sending the enquiry is the gated step. */}
                <Button
                  size="sm"
                  onClick={() => (user ? chatBus.openCommunityDm(p.user.id, p.companyName || p.user.name) : navigate('/login'))}
                >
                  {t('service.contact')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
