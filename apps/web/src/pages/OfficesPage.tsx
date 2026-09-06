import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiOffice } from '@agrotraders/api-client';
import { useI18n } from '../i18n';
import { api } from '../lib/api';

/**
 * Real offices from the API — the same rows admins edit under Company → Offices.
 * This used to render a hardcoded 8-entry array keyed into `page.offices.list.*`,
 * so an office added in admin never appeared and a deleted one never went away
 * (two of the eight had no DB row at all). `type` is translated server-side on
 * read; manager names, timezones and language codes stay literal.
 */
export function OfficesPage() {
  const { t } = useI18n();
  const { data: offices = [], isLoading } = useQuery<ApiOffice[]>({
    queryKey: ['offices'],
    queryFn: () => api.offices.list(),
    staleTime: 3600e3,
    retry: 1,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <h1 className="min-w-0 break-words font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('section.offices')}</h1>
      <p className="mt-1 text-ink-soft">{t('page.offices.sub', { count: offices.length })}</p>

      {isLoading ? (
        <p className="mt-6 text-ink-soft">{t('common:loading')}</p>
      ) : offices.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-surface-border p-16 text-center text-ink-soft">{t('page.offices.empty')}</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {offices.map((o) => (
            <Card key={o.id} hoverable>
              <div className="flex items-start justify-between">
                <span className="text-3xl">{o.flag}</span>
                <Badge tone="green">{o.type}</Badge>
              </div>
              <div className="mt-2 font-display text-lg font-bold text-ink">{o.name}</div>
              <div className="text-sm text-ink-soft">{o.city}</div>
              <div className="mt-3 space-y-1 text-sm text-ink-soft">
                {o.mgr && (
                  <div className="flex items-center gap-2">
                    <Icon name="user" size={14} /> {o.mgr}
                  </div>
                )}
                {(o.tz || o.langs) && (
                  <div className="flex items-center gap-2">
                    <Icon name="clock" size={14} /> {[o.tz, o.langs].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" fullWidth className="mt-4" leftIcon={<Icon name="phone" size={14} />}>
                {t('page.offices.requestCallback')}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
