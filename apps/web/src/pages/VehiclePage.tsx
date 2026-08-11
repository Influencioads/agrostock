import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiPublicVehicleDetail } from '@agrotraders/api-client';
import { vehicleCapacity } from '@agrotraders/types';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useCurrency } from '../currency/CurrencyContext';
import { useI18n } from '../i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { chatBus } from '../chat/chatBus';
import { VehiclePhoto } from '../components/site/VehiclePhoto';

/** A spec row, omitted entirely when the transporter left the field blank. */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '' || value === false) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-surface-border py-2.5 text-sm">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-end font-semibold text-ink">{value}</dd>
    </div>
  );
}

/**
 * Public vehicle detail. Readable with no account — the whole point of the
 * change: a buyer evaluates the actual truck before deciding to sign in.
 *
 * Only contacting the transporter requires login, and that gate lives on the
 * button, not on the page.
 */
export function VehiclePage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { fmtCents } = useCurrency();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);

  const { data: v, isLoading, isError } = useQuery<ApiPublicVehicleDetail>({
    queryKey: ['public-vehicle', id],
    queryFn: () => api.transport.publicVehicle(id!),
    enabled: !!id,
    retry: 0,
  });

  const title = v ? (v.vehicleType ? t(`enums:vehicleType.${v.vehicleType}`) : v.type) : '';
  useDocumentTitle(title || undefined);

  if (isLoading) return <div className="py-24 text-center text-ink-soft">{t('common:loading')}</div>;
  if (isError || !v) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-ink-soft">{t('vehicle.notFound')}</p>
        <Link to="/transporters" className="mt-4 inline-block font-bold text-brand">{t('nav:primary.transporters')}</Link>
      </div>
    );
  }

  const capacity = vehicleCapacity(v.capacityTons, v.capacityMt);
  const location = [v.city, v.country].filter(Boolean).join(', ');
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(lang) : null);
  const photos = v.photos ?? [];
  const cover = photos[Math.min(active, Math.max(0, photos.length - 1))] ?? v.photoUrl;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="mb-4 flex items-center gap-2 text-sm text-ink-soft">
        <Link to="/transporters" className="hover:text-brand">{t('nav:primary.transporters')}</Link>
        <span>›</span>
        {v.owner && (
          <>
            <Link to={`/u/${v.owner.id}`} className="hover:text-brand">{v.owner.name}</Link>
            <span>›</span>
          </>
        )}
        <span className="truncate font-semibold text-ink">{title}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* ── photos ─────────────────────────────────────────────────── */}
        <div>
          <VehiclePhoto
            src={cover}
            vehicleType={v.vehicleType}
            alt={t('vehicle.photoAlt', { type: title })}
            className="h-72 w-full rounded-2xl sm:h-96"
          />
          {photos.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {photos.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={t('vehicle.photoAlt', { type: title })}
                  aria-current={i === active}
                  className={
                    'h-16 w-20 overflow-hidden rounded-lg border-2 transition ' +
                    (i === active ? 'border-brand' : 'border-transparent hover:border-surface-border')
                  }
                >
                  <VehiclePhoto src={src} vehicleType={v.vehicleType} alt="" className="h-full w-full" />
                </button>
              ))}
            </div>
          )}
          {photos.length === 0 && (
            <p className="mt-2 text-xs text-ink-soft">{t('vehicle.noPhoto')}</p>
          )}
        </div>

        {/* ── headline + booking ─────────────────────────────────────── */}
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            {v.refrigerated && (
              <Badge tone="info" icon={<Icon name="snowflake" size={11} />}>{t('vehicle.refrigerated')}</Badge>
            )}
            {v.gpsTracking && <Badge tone="green">{t('vehicle.gps')}</Badge>}
            <Badge tone={v.status === 'available' ? 'green' : 'slate'}>
              {v.status === 'available' ? t('vehicle.availableNow') : v.status === 'on_trip' ? t('vehicle.onTrip') : t('vehicle.maintenance')}
            </Badge>
          </div>

          <h1 className="mt-3 font-display text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
          {location && (
            <p className="mt-1 flex items-center gap-1.5 text-ink-soft">
              <Icon name="mapPin" size={14} /> {location}
            </p>
          )}

          <Card className="mt-4">
            {v.ratePerKmCents != null && (
              <div className="font-display text-2xl font-extrabold text-ink">
                {t('vehicle.ratePerKmValue', { amount: fmtCents(v.ratePerKmCents) })}
              </div>
            )}
            {v.ratePerTripCents != null && (
              <div className="mt-1 text-sm text-ink-soft">
                {t('vehicle.ratePerTrip')}: <b className="text-ink">{fmtCents(v.ratePerTripCents)}</b>
              </div>
            )}
            <p className="mt-1 text-xs text-ink-soft">
              {v.loadingIncluded ? t('vehicle.loadingIncluded') : t('vehicle.loadingExcluded')}
            </p>

            {/* The ONLY gated action on this page. Browsing stays open. */}
            <Button
              className="mt-4 w-full"
              leftIcon={<Icon name="message" size={16} />}
              onClick={() => {
                if (!user) return navigate('/login');
                if (v.owner) chatBus.openCommunityDm(v.owner.id, v.owner.name);
              }}
            >
              {t('vehicle.book')}
            </Button>
            {!user && <p className="mt-2 text-center text-xs text-ink-soft">{t('vehicle.loginToContact')}</p>}
          </Card>

          {v.owner && (
            <Card className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t('vehicle.operator')}</div>
              <Link to={`/u/${v.owner.id}`} className="mt-1 flex items-center gap-2 font-display text-lg font-bold text-ink hover:text-brand">
                {v.owner.name}
                {v.owner.kycStatus === 'verified' && <Icon name="shield" size={15} className="text-brand" />}
              </Link>
              {v.owner.profile?.location && <div className="text-sm text-ink-soft">{v.owner.profile.location}</div>}
              {v.owner.routes.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t('vehicle.routes')}</div>
                  <ul className="mt-1 space-y-0.5 text-sm text-ink-soft">
                    {v.owner.routes.map((r) => (
                      <li key={r.name}>{r.fromCity} → {r.toCity}{r.distanceKm ? ` · ${r.distanceKm} km` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* ── full spec sheet ──────────────────────────────────────────── */}
      <Card className="mt-6">
        <h2 className="font-display text-lg font-extrabold text-ink">{t('vehicle.specs')}</h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
          <Row label={t('vehicle.capacity')} value={capacity ? ('tons' in capacity ? t('vehicle.capacityTons', { count: capacity.tons }) : capacity.text) : null} />
          <Row label={t('vehicle.bodyLength')} value={v.bodyLengthFt ? t('vehicle.bodyLengthValue', { value: v.bodyLengthFt }) : null} />
          {/* Masked server-side — the raw plate never reaches this component. */}
          <Row
            label={t('vehicle.registration')}
            value={v.plateMasked ? <span title={t('vehicle.registrationNote')}>{v.plateMasked}</span> : null}
          />
          <Row label={t('vehicle.makeModel')} value={v.makeModel} />
          <Row label={t('vehicle.year')} value={v.year} />
          <Row label={t('vehicle.refrigerated')} value={v.refrigerated ? t('vehicle.yes') : null} />
          <Row label={t('vehicle.tempRange')} value={v.tempRange} />
          <Row label={t('vehicle.gps')} value={v.gpsTracking ? t('vehicle.gpsAvailable') : t('vehicle.gpsUnavailable')} />
          <Row label={t('vehicle.drivers')} value={v.driverCount ? t('vehicle.driversValue', { count: v.driverCount }) : null} />
          <Row label={t('vehicle.insuranceValid')} value={date(v.insuranceExpiry)} />
          <Row label={t('vehicle.permitValid')} value={date(v.permitExpiry)} />
          <Row label={t('vehicle.location')} value={location} />
          <Row label={t('vehicle.servicing')} value={v.servicingCities.length ? v.servicingCities.join(', ') : null} />
          <Row label={t('vehicle.availability')} value={v.availableFrom ? t('vehicle.availableFrom', { date: date(v.availableFrom) }) : t('vehicle.availableNow')} />
          <Row label={t('vehicle.ratePerKm')} value={v.ratePerKmCents != null ? t('vehicle.ratePerKmValue', { amount: fmtCents(v.ratePerKmCents) }) : null} />
          <Row label={t('vehicle.ratePerTrip')} value={v.ratePerTripCents != null ? fmtCents(v.ratePerTripCents) : null} />
          <Row label={t('vehicle.loadingIncluded')} value={v.loadingIncluded ? t('vehicle.yes') : null} />
        </dl>
        {v.notes && <p className="mt-4 rounded-lg bg-brand-surface px-3 py-2 text-sm text-ink-soft">{v.notes}</p>}
      </Card>
    </div>
  );
}
