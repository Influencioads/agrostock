import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiBranding, BrandAssetKind } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { useI18n } from '../i18n';
import { api, assetUrl } from '../lib/api';

interface AssetSpec {
  kind: BrandAssetKind;
  field: keyof ApiBranding;
  /** Indexes `admin:brandingAdmin.assets`; title/hint are translated per locale. */
  key: 'logo' | 'appIcon' | 'favicon';
  /** Rendered on a dark tile when the asset is meant to sit on the brand green. */
  onDark?: boolean;
}

const ASSETS: AssetSpec[] = [
  { kind: 'logo', field: 'logoUrl', key: 'logo', onDark: true },
  { kind: 'appIcon', field: 'appIconUrl', key: 'appIcon' },
  { kind: 'favicon', field: 'faviconUrl', key: 'favicon' },
];

export function BrandingPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['branding'],
    queryFn: () => api.branding.get(),
  });

  const upload = useMutation({
    mutationFn: ({ kind, file }: { kind: BrandAssetKind; file: File }) =>
      api.admin.uploadBranding(kind, file),
    onSuccess: (next) => {
      // Same key the layout reads, so the sidebar mark swaps without a reload.
      qc.setQueryData(['branding'], next);
      setError('');
    },
    onError: (e: Error) => setError(e.message || t('brandingAdmin.uploadFailed')),
  });

  const clear = useMutation({
    mutationFn: (kind: BrandAssetKind) => api.admin.clearBranding(kind),
    onSuccess: (next) => {
      qc.setQueryData(['branding'], next);
      setError('');
    },
    onError: (e: Error) => setError(e.message || t('brandingAdmin.resetFailed')),
  });

  const busy = upload.isPending || clear.isPending;

  return (
    <div>
      <PageHeader title={t('page.branding.title')} subtitle={t('page.branding.subtitle')} />

      {error && (
        <Card className="mb-4">
          <p className="text-sm font-semibold text-red-600">{error}</p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {ASSETS.map((spec) => (
          <AssetCard
            key={spec.kind}
            spec={spec}
            src={assetUrl(data?.[spec.field])}
            loading={isLoading}
            busy={busy}
            onPick={(file) => upload.mutate({ kind: spec.kind, file })}
            onClear={() => clear.mutate(spec.kind)}
          />
        ))}
      </div>

      <Card className="mt-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-mango">
            <Icon name="shield" size={18} />
          </span>
          <div className="text-sm text-ink-soft">
            <p className="font-semibold text-ink">{t('brandingAdmin.noteTitle')}</p>
            <p className="mt-1">
              {t('brandingAdmin.noteBody')} <code>apps/mobile/assets/</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AssetCard({
  spec,
  src,
  loading,
  busy,
  onPick,
  onClear,
}: {
  spec: AssetSpec;
  src?: string;
  loading: boolean;
  busy: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const title = t(`brandingAdmin.assets.${spec.key}.title`);

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="font-display text-lg font-bold text-ink">{title}</div>
        <Badge tone={src ? 'green' : 'slate'}>{src ? t('brandingAdmin.custom') : t('brandingAdmin.default')}</Badge>
      </div>

      <div
        className={
          'mt-3 flex h-32 items-center justify-center rounded-lg border border-surface-border ' +
          (spec.onDark ? 'bg-brand-dock' : 'bg-surface-bg')
        }
      >
        {loading ? (
          <span className="text-sm text-ink-soft">{t('common:loading')}</span>
        ) : src ? (
          <img src={src} alt={title} className="max-h-24 max-w-[70%] object-contain" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-gradient text-white">
            <Icon name="leaf" size={28} />
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-ink-soft">{t(`brandingAdmin.assets.${spec.key}.hint`)}</p>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          // Reset so picking the same file twice still fires onChange.
          e.target.value = '';
        }}
      />

      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          disabled={busy}
          leftIcon={<Icon name="plus" size={14} />}
          onClick={() => input.current?.click()}
        >
          {src ? t('brandingAdmin.replace') : t('brandingAdmin.upload')}
        </Button>
        {src && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={onClear}>
            {t('brandingAdmin.reset')}
          </Button>
        )}
      </div>
    </Card>
  );
}
