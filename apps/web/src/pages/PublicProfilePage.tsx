import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useCurrency } from '../currency/CurrencyContext';
import { useI18n } from '../i18n';
import { chatBus } from '../chat/chatBus';
import { HireModal, type HireTarget } from '../components/site/HireModal';
import { ReviewList } from '../console/components/ReviewList';
import { unitSuffix } from '@agrotraders/types';

/**
 * Public profile. Contact details are intentionally masked — the API never
 * sends them; users connect via chat instead (privacy rule: admin-only).
 */
export function PublicProfilePage() {
  const { t } = useI18n();
  const { userId } = useParams();
  const { user: me } = useAuth();
  const { fmtPrice } = useCurrency();
  const [hire, setHire] = useState<HireTarget | null>(null);

  const { data: p, isLoading } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => api.directory.profile(userId!),
    enabled: !!userId,
  });

  const { data: reviewSummary } = useQuery({
    queryKey: ['reviews', 'user', userId],
    queryFn: () => api.reviews.forUser(userId!),
    enabled: !!userId,
  });

  if (isLoading || !p) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-ink-soft">{isLoading ? t('page.profile.loading') : t('page.profile.notFound')}</div>;
  }

  const roles = Array.from(new Set([p.role, ...(p.roles ?? [])]));
  const hireType: HireTarget['targetType'] | null = roles.includes('transporter')
    ? 'transporter'
    : roles.includes('loaderco')
      ? 'loaderco'
      : roles.includes('worker')
        ? 'worker'
        : null;
  const counts = p._count ?? {};
  const isMe = me?.id === p.id;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
      {/* header card */}
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-brand-surface text-4xl">
          {p.profile?.avatarEmoji ?? '🏢'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold text-ink">{p.name}</h1>
            {p.kycStatus === 'verified' && (
              <Badge tone="green" icon={<Icon name="shield" size={11} />}>{t('page.profile.kycVerified')}</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <Badge key={r} tone="slate">{t(`page.profile.role.${r}`, { defaultValue: r })}</Badge>
            ))}
            {p.profile?.market && <Badge tone="mango">{p.profile.market.flag} {p.profile.market.name}</Badge>}
          </div>
          {p.profile?.bio && <p className="mt-2 text-sm text-ink-soft">{p.profile.bio}</p>}
          <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm text-ink-soft sm:grid-cols-2">
            {(p.profile?.location || p.country) && (
              <span className="flex items-center gap-1.5"><Icon name="mapPin" size={14} /> {p.profile?.location ?? p.country}</span>
            )}
            {p.profile?.availableFrom && p.profile?.availableTo && (
              <span className="flex items-center gap-1.5"><Icon name="clock" size={14} /> {t('page.profile.available', { from: p.profile.availableFrom, to: p.profile.availableTo, tz: p.profile.timezone ?? '' })}</span>
            )}
            {p.profile?.languages && (
              <span className="flex items-center gap-1.5"><Icon name="globe" size={14} /> {p.profile.languages}</span>
            )}
            {p.contactMasked?.phone && (
              <span className="flex items-center gap-1.5" title={t('page.profile.contactPrivate')}>
                <Icon name="phone" size={14} /> {p.contactMasked.phone}
              </span>
            )}
          </div>
        </div>
        {!isMe && (
          <div className="flex shrink-0 gap-2 sm:flex-col">
            <Button leftIcon={<Icon name="message" size={16} />} onClick={() => chatBus.openCommunityDm(p.id, p.name)}>
              {t('page.profile.chat')}
            </Button>
            {hireType && (
              <Button variant="accent" leftIcon={<Icon name="check" size={16} />} onClick={() => setHire({ targetType: hireType, targetUserId: p.id, workerId: p.workerProfile?.id, name: p.name })}>
                {t('page.profile.hire')}
              </Button>
            )}
          </div>
        )}
      </Card>

      <div className="mt-3 rounded-md bg-brand-surface px-4 py-2.5 text-xs text-ink-soft">
        <Icon name="shield" size={13} className="me-1.5 inline text-brand-dark" />
        {t('page.profile.privacyNote')}
      </div>

      {/* stats strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {roles.includes('seller') && (
          <>
            <Stat label={t('page.profile.products')} value={counts.products ?? 0} />
            <Stat label={t('page.profile.ordersFulfilled')} value={counts.sellerOrders ?? 0} />
          </>
        )}
        {roles.includes('transporter') && (
          <>
            <Stat label={t('page.profile.vehicles')} value={counts.vehicles ?? 0} />
            <Stat label={t('page.profile.tripsDelivered')} value={counts.trips ?? 0} />
          </>
        )}
        {roles.includes('loaderco') && (
          <>
            <Stat label={t('page.profile.workers')} value={counts.workers ?? 0} />
            <Stat label={t('page.profile.teams')} value={counts.teams ?? 0} />
          </>
        )}
        {p.workerProfile && (
          <>
            <Stat label={t('page.profile.rating')} value={p.workerProfile.rating ?? '—'} />
            <Stat label={t('page.profile.status')} value={t(`console.dash.workerStatus.${p.workerProfile.status}`, { defaultValue: p.workerProfile.status.replace('_', ' ') })} />
          </>
        )}
        <Stat label={t('page.profile.memberSince')} value={new Date(p.createdAt).getFullYear()} />
      </div>

      {/* seller listings */}
      {(p.products?.length ?? 0) > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 font-display text-xl font-extrabold text-ink">{t('page.profile.listings')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.products!.map((prod) => (
              <Link key={prod.id} to={`/product/${prod.slug}`} className="flex items-center gap-3 rounded-lg border border-surface-border bg-white p-3 shadow-card transition hover:-translate-y-0.5 hover:border-brand-leaf">
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-brand-surface text-2xl">
                  {prod.imageUrl ? <img src={prod.imageUrl} alt="" className="h-full w-full object-cover" /> : prod.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-bold text-ink">{prod.name}</span>
                  <span className="text-xs text-ink-soft">{fmtPrice({ price: prod.price, priceCents: prod.priceCents })}{unitSuffix(prod.unit)}</span>
                </span>
                <Icon name="chevronRight" size={16} className="text-ink-soft" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* transporter routes */}
      {(p.routes?.length ?? 0) > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 font-display text-xl font-extrabold text-ink">{t('page.profile.activeRoutes')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {p.routes!.map((r) => (
              <Card key={r.name} className="flex items-center gap-3 py-3">
                <Icon name="truck" size={18} className="text-brand" />
                <span className="font-semibold text-ink">{r.name}</span>
                {r.distanceKm && <span className="ms-auto text-xs text-ink-soft">{t('console.order.distanceKm', { km: r.distanceKm })}</span>}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* reviews */}
      <div className="mt-8">
        <h2 className="mb-4 font-display text-xl font-extrabold text-ink">{t('page.profile.reviews')}</h2>
        <Card>
          {reviewSummary ? (
            <ReviewList summary={reviewSummary} />
          ) : (
            <p className="text-sm text-ink-soft">{t('common:loading')}</p>
          )}
        </Card>
      </div>

      {hire && <HireModal target={hire} onClose={() => setHire(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="py-4 text-center">
      <div className="font-display text-2xl font-extrabold text-ink">{value}</div>
      <div className="mt-0.5 text-xs text-ink-soft">{label}</div>
    </Card>
  );
}
