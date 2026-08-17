import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import { api, assetUrl } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useCurrency } from '../currency/CurrencyContext';
import { useI18n } from '../i18n';
import { VehicleCard } from '../components/site/VehicleCard';
import { chatBus } from '../chat/chatBus';
import { HireModal, type HireTarget } from '../components/site/HireModal';
import { ReviewList } from '../console/components/ReviewList';
import { rateLabel } from '../console/sections/LabourOfferings';
import { hireTargetForRoles, isServiceRole, servicePriceLabel, unitSuffix } from '@agrotraders/types';

function locationLabel(city: string | null | undefined, country: string | null | undefined): string {
  const place = city?.trim();
  const nation = country?.trim();
  if (place && nation && place.toLocaleLowerCase().includes(nation.toLocaleLowerCase())) return place;
  return [place, nation].filter(Boolean).join(', ');
}

/**
 * Public profile. Contact details are intentionally masked — the API never
 * sends them; users connect via chat instead (privacy rule: admin-only).
 */
export function PublicProfilePage() {
  const { t } = useI18n();
  const { userId } = useParams();
  const { user: me } = useAuth();
  const { fmtPrice, fmtCents } = useCurrency();
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

  // Service-provider extras. Both endpoints 404 for a user who is not a LISTED
  // provider, so they are only asked for once the roles say it is worth asking —
  // and a 404 on either still leaves the rest of the profile rendering.
  const isProvider = !!p && [p.role, ...(p.roles ?? [])].some(isServiceRole);
  const { data: provider } = useQuery({
    queryKey: ['service-provider', userId],
    queryFn: () => api.services.provider(userId!),
    enabled: !!userId && isProvider,
    retry: false,
  });
  const { data: providerServices = [] } = useQuery({
    queryKey: ['service-provider-services', userId],
    queryFn: () => api.services.providerServices(userId!),
    enabled: !!userId && isProvider,
    retry: false,
  });

  // Labour. A loading company's crew roster is private, so what it publishes —
  // and what shows here — is which KINDS of worker it supplies and the rates.
  const suppliesLabour =
    !!p && [p.role, ...(p.roles ?? [])].some((r) => r === 'loaderco' || r === 'workerco' || r === 'worker');
  const { data: offerings = [] } = useQuery({
    queryKey: ['labour-offerings', userId],
    queryFn: () => api.labour.offerings(userId!),
    enabled: !!userId && suppliesLabour,
    retry: false,
  });

  if (isLoading || !p) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-ink-soft">{isLoading ? t('page.profile.loading') : t('page.profile.notFound')}</div>;
  }

  const roles = Array.from(new Set([p.role, ...(p.roles ?? [])]));
  // Shared with the directory and with mobile — this chain had already drifted
  // three ways, and `workerco` was missing from every copy of it.
  const hireType: HireTarget['targetType'] | null = hireTargetForRoles(roles);
  const counts = p._count ?? {};
  const isMe = me?.id === p.id;
  const homeLocation = locationLabel(
    p.workerProfile?.originCity ?? p.profile?.originCity ?? p.profile?.location,
    p.workerProfile?.originCountry ?? p.profile?.originCountry ?? p.country,
  );
  const operatingAreas = [
    ...(p.workerProfile?.operatingCities ?? p.profile?.operatingCities ?? []),
    ...(p.workerProfile?.operatingCountries ?? p.profile?.operatingCountries ?? []),
  ];
  const supplyingAreas = [
    ...(p.profile?.supplyingCities ?? []),
    ...(p.profile?.supplyingCountries ?? []),
  ];

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
            {homeLocation && (
              <span className="flex items-center gap-1.5"><Icon name="mapPin" size={14} /> {homeLocation}</span>
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
          {(operatingAreas.length > 0 || supplyingAreas.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              {operatingAreas.length > 0 && (
                <Badge tone="slate" icon={<Icon name="mapPin" size={10} />}>
                  {t('page.directory.operatesIn', { areas: operatingAreas.join(', ') })}
                </Badge>
              )}
              {supplyingAreas.length > 0 && (
                <Badge tone="info">{t('page.directory.suppliesTo', { areas: supplyingAreas.join(', ') })}</Badge>
              )}
            </div>
          )}
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

      {/* labour — what kinds of worker this account supplies, and the rates.
          For a loading company this REPLACED a published list of its individual
          staff: the crew count above is the capacity signal, the people are the
          company's own and are never named here. */}
      {offerings.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 font-display text-xl font-extrabold text-ink">{t('labour.types')}</h2>
          {(roles.includes('loaderco') || roles.includes('workerco')) && (
            <div className="mb-3 rounded-md bg-brand-surface px-4 py-2.5 text-xs text-ink-soft">
              <Icon name="shield" size={13} className="me-1.5 inline text-brand-dark" />
              {t('labour.rosterPrivate')}
            </div>
          )}
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[32rem] text-start text-sm">
              <thead className="border-b border-surface-border text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{t('labour.types')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('service.priceCol')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('labour.headcount')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('labour.minHours')}</th>
                </tr>
              </thead>
              <tbody>
                {offerings.map((o) => (
                  <tr key={o.id} className="border-b border-surface-border align-top last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{o.workerType.name}</div>
                      {o.notes && <div className="mt-0.5 text-xs text-ink-soft">{o.notes}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-display font-bold text-ink">{rateLabel(o, t, fmtCents)}</div>
                      {o.isNegotiable && <Badge tone="mango">{t('labour.negotiable')}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{o.headcount ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {o.minHours != null ? t('labour.minHoursShort', { count: o.minHours }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* service provider — the business card, then every service it prices.
          A card in the directory truncates all of this; here it is in full. */}
      {provider && (
        <div className="mt-8">
          <h2 className="mb-4 font-display text-xl font-extrabold text-ink">{t('service.about')}</h2>
          <Card className="space-y-4">
            {provider.blurb && <p className="text-sm text-ink-soft">{provider.blurb}</p>}

            {provider.categories.length > 0 && (
              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">{t('service.categories')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {provider.categories.map((c) => (
                    <Badge key={c} tone="green">{t(`enums:serviceCategory.${c}`, { defaultValue: c })}</Badge>
                  ))}
                </div>
              </div>
            )}

            <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <Field label={t('service.basedIn')} value={provider.country} />
              <Field label={t('service.cities')} value={provider.citiesServed.join(', ')} />
              <Field label={t('service.countriesServed')} value={provider.countriesServed.join(', ')} />
              <Field label={t('service.productsHandled')} value={provider.productsHandled.join(', ')} />
              <Field label={t('service.capacity')} value={provider.capacityPerDay} />
              <Field
                label={t('service.turnaround')}
                value={provider.turnaroundDays != null ? t('service.turnaroundDays', { count: provider.turnaroundDays }) : null}
              />
              <Field label={t('service.minOrder')} value={provider.minOrderQty} />
              <Field label={t('service.certifications')} value={provider.certifications.join(', ')} />
              <Field
                label={t('service.international')}
                value={provider.acceptsInternationalOrders ? t('common:yes') : t('common:no')}
              />
              <Field
                label={t('service.pricing')}
                value={
                  provider.priceFromCents != null && provider.pricingBasis
                    ? t('service.priceFrom', {
                        amount: fmtCents(provider.priceFromCents),
                        basis: t(`enums:servicePricingBasis.${provider.pricingBasis}`, { defaultValue: provider.pricingBasis }),
                      })
                    : t('service.onEnquiry')
                }
              />
            </dl>
          </Card>

          <h2 className="mb-4 mt-8 font-display text-xl font-extrabold text-ink">
            {t('service.priceList', { count: providerServices.length })}
          </h2>
          {providerServices.length === 0 ? (
            <Card className="py-10 text-center text-sm text-ink-soft">{t('service.noPriceList')}</Card>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[34rem] text-start text-sm">
                <thead className="border-b border-surface-border text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">{t('service.serviceCol')}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t('service.priceCol')}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t('service.minOrder')}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t('service.leadTime')}</th>
                  </tr>
                </thead>
                <tbody>
                  {providerServices.map((s) => (
                    <tr key={s.id} className="border-b border-surface-border last:border-0 align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink">{s.serviceNode.name ?? s.serviceNode.nameEn}</div>
                        {s.notes && <div className="mt-0.5 text-xs text-ink-soft">{s.notes}</div>}
                        {s.capacityNote && <div className="mt-0.5 text-xs text-ink-soft">{s.capacityNote}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-display font-bold text-ink">{servicePriceLabel(s, t, fmtCents)}</div>
                        {s.isNegotiable && <Badge tone="mango">{t('service.negotiable')}</Badge>}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {s.minOrderQty != null ? `${s.minOrderQty}${s.minOrderUnit ? ` ${s.minOrderUnit}` : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {s.leadTimeDays != null ? t('service.turnaroundDays', { count: s.leadTimeDays }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* seller listings */}
      {(p.products?.length ?? 0) > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 font-display text-xl font-extrabold text-ink">{t('page.profile.listings')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.products!.map((prod) => (
              <Link key={prod.id} to={`/product/${prod.slug}`} className="flex items-center gap-3 rounded-lg border border-surface-border bg-white p-3 shadow-card transition hover:-translate-y-0.5 hover:border-brand-leaf">
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-brand-surface text-2xl">
                  {prod.imageUrl ? <img src={assetUrl(prod.imageUrl)} alt="" className="h-full w-full object-cover" /> : prod.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-bold text-ink">{prod.name}</span>
                  <span className="text-xs text-ink-soft">{fmtPrice({ price: prod.price, priceCents: prod.priceCents })}{unitSuffix(prod.unit, t)}</span>
                </span>
                <Icon name="chevronRight" size={16} className="text-ink-soft" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* transporter fleet — the actual vehicles, not just the count.
          The `Vehicles` stat above remains as the header figure; this is what
          the client asked for and what the stat must never stand in for. */}
      {roles.includes('transporter') && (
        <div className="mt-8">
          <h2 className="mb-4 font-display text-xl font-extrabold text-ink">
            {t('vehicle.count', { count: p.vehicles?.length ?? counts.vehicles ?? 0 })}
          </h2>
          {(p.vehicles?.length ?? 0) > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {p.vehicles!.map((v) => (
                <VehicleCard key={v.id} v={v} />
              ))}
            </div>
          ) : (
            <Card className="py-10 text-center text-sm text-ink-soft">{t('vehicle.none')}</Card>
          )}
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

/** One label/value row, dropped entirely when the provider left the field blank. */
function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="text-ink">{value}</dd>
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
