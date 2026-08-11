import { useState } from 'react';
import { Icon } from '@agrotraders/ui';
import type { ApiPublicVehicle } from '@agrotraders/api-client';
import { assetUrl } from '../../lib/api';

/**
 * A vehicle photo, or a proper placeholder — never a broken image.
 *
 * Two distinct failure modes, both of which used to render as the browser's
 * torn-page icon:
 *   1. the transporter never uploaded a photo (`src` is null), and
 *   2. they did, but the file 404s (moved storage, failed upload, stale row).
 *
 * Both land on the same drawn placeholder, tinted by body type so a grid of
 * photo-less vehicles still reads as a fleet rather than a column of grey boxes.
 */
export function VehiclePhoto({
  src,
  vehicleType,
  alt,
  className = '',
}: {
  src?: string | null;
  vehicleType?: ApiPublicVehicle['vehicleType'];
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = src ? assetUrl(src) : '';
  const showPhoto = !!url && !failed;

  return (
    <div className={'relative flex items-center justify-center overflow-hidden bg-brand-surface ' + className}>
      {showPhoto ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
          // The placeholder replaces the image rather than hiding it, so the
          // layout never collapses to zero height mid-grid.
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-brand-dark/40"
        >
          <Icon name="truck" size={40} />
          {vehicleType === 'reefer' && <Icon name="snowflake" size={16} className="opacity-70" />}
        </div>
      )}
    </div>
  );
}
