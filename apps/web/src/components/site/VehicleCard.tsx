import { Link } from 'react-router-dom';
import { Badge, Card, Icon } from '@agrotraders/ui';
import type { ApiPublicVehicle } from '@agrotraders/api-client';
import { vehicleCapacity } from '@agrotraders/types';
import { useCurrency } from '../../currency/CurrencyContext';
import { useI18n } from '../../i18n';
import { VehiclePhoto } from './VehiclePhoto';

/**
 * One vehicle, as a buyer scans it.
 *
 * Deliberately NOT the full spec sheet: photo, what it is, how much it carries,
 * where it is, what it costs, and the two facts that decide a reefer booking
 * (temperature range, GPS). Everything else lives on the detail page — a card
 * that lists sixteen fields is a card nobody reads.
 */
export function VehicleCard({ v }: { v: ApiPublicVehicle }) {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();

  // The transporter's own words are the fallback: a vehicle listed before
  // `vehicleType` existed still has a meaningful heading.
  const title = v.vehicleType ? t(`enums:vehicleType.${v.vehicleType}`) : v.type;
  const capacity = vehicleCapacity(v.capacityTons, v.capacityMt);
  const location = [v.city, v.country].filter(Boolean).join(', ');

  const availability =
    v.status === 'on_trip'
      ? { label: t('vehicle.onTrip'), tone: 'slate' as const }
      : v.status === 'maintenance'
        ? { label: t('vehicle.maintenance'), tone: 'warn' as const }
        : v.availableFrom && new Date(v.availableFrom) > new Date()
          ? { label: t('vehicle.availableFrom', { date: new Date(v.availableFrom).toLocaleDateString() }), tone: 'info' as const }
          : { label: t('vehicle.availableNow'), tone: 'green' as const };

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <Link to={`/vehicle/${v.id}`} className="block">
        <VehiclePhoto
          src={v.photoUrl}
          vehicleType={v.vehicleType}
          alt={t('vehicle.photoAlt', { type: title })}
          className="h-40 w-full"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={availability.tone}>{availability.label}</Badge>
          {v.refrigerated && (
            <Badge tone="info" icon={<Icon name="snowflake" size={11} />}>{t('vehicle.refrigerated')}</Badge>
          )}
          {v.gpsTracking && <Badge tone="slate">{t('vehicle.gps')}</Badge>}
        </div>

        <Link to={`/vehicle/${v.id}`} className="font-display text-base font-bold text-ink hover:text-brand">
          {title}
        </Link>

        <dl className="space-y-1 text-sm text-ink-soft">
          {capacity && (
            <div className="flex items-center gap-1.5">
              <Icon name="box" size={13} className="shrink-0" />
              <span>
                {t('vehicle.capacity')}:{' '}
                <b className="font-semibold text-ink">
                  {'tons' in capacity ? t('vehicle.capacityTons', { count: capacity.tons }) : capacity.text}
                </b>
              </span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-1.5 truncate">
              <Icon name="mapPin" size={13} className="shrink-0" />
              <span className="truncate">{t('vehicle.location')}: <b className="font-semibold text-ink">{location}</b></span>
            </div>
          )}
          {/* Only for reefers — `tempRange` is null on everything else, so a dry
              van can never show a temperature it cannot hold. */}
          {v.tempRange && (
            <div className="flex items-center gap-1.5">
              <Icon name="snowflake" size={13} className="shrink-0" />
              <span>{t('vehicle.temperature')}: <b className="font-semibold text-ink">{v.tempRange}</b></span>
            </div>
          )}
        </dl>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0">
            {v.ratePerKmCents != null && (
              <div className="font-display text-lg font-extrabold text-ink">
                {t('vehicle.ratePerKmValue', { amount: fmtCents(v.ratePerKmCents) })}
              </div>
            )}
            {v.ratePerTripCents != null && (
              <div className="text-xs text-ink-soft">
                {t('vehicle.ratePerTrip')}: {fmtCents(v.ratePerTripCents)}
              </div>
            )}
          </div>
          <Link
            to={`/vehicle/${v.id}`}
            className="shrink-0 rounded-lg border border-surface-border px-3 py-1.5 text-sm font-semibold text-brand transition hover:border-brand-leaf hover:bg-brand-surface"
          >
            {t('vehicle.view')}
          </Link>
        </div>
      </div>
    </Card>
  );
}
