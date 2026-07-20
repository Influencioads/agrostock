import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, type BadgeTone } from '@agrotraders/ui';
import { PageHeader } from '../components/widgets';
import { useI18n } from '../i18n';
import { kycQueue as mockQueue } from '../mock/data';
import { api } from '../lib/api';
import { KycDocsDrawer } from './KycDocsDrawer';

interface KycCard {
  id: string;
  company: string;
  role: string;
  country: string;
  docs: number;
  submitted: string;
  status: string;
}

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'warn',
  verified: 'green',
  rejected: 'error',
};

const FILTERS = ['pending', 'verified', 'rejected', 'all'] as const;

function relative(iso: string, t: (key: string, opts?: Record<string, unknown>) => string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3.6e6);
  if (h < 1) return t('kycAdmin.justNow');
  if (h < 24) return t('kycAdmin.hoursAgo', { count: h });
  return t('kycAdmin.daysAgo', { count: Math.floor(h / 24) });
}

export function KycPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [viewing, setViewing] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('pending');
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null);

  const { data: items = [], isError } = useQuery({
    queryKey: ['admin-kyc', filter, lang],
    queryFn: async (): Promise<KycCard[]> =>
      (await api.admin.kyc(filter)).map((k) => ({
        id: k.id,
        company: k.user.name,
        role: k.user.role,
        country: k.user.country ?? '—',
        docs: k._count?.documents ?? k.docs,
        submitted: relative(k.createdAt, t),
        status: k.status,
      })),
    retry: 1,
  });

  const decide = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: 'verified' | 'rejected'; note?: string }) =>
      api.admin.decideKyc(id, status, note),
    onSuccess: () => {
      setRejecting(null);
      qc.invalidateQueries({ queryKey: ['admin-kyc'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  // fall back to mock queue (no live mutation) when the API is unreachable
  const queue: KycCard[] = isError
    ? mockQueue.map((k) => ({ id: k.id, company: k.company, role: k.role, country: k.country, docs: k.docs, submitted: k.submitted, status: 'pending' }))
    : items;

  return (
    <div>
      <PageHeader
        title={t('page.kyc.title')}
        subtitle={t('page.kyc.subtitle', { count: queue.length })}
        action={<Badge tone={isError ? 'warn' : 'green'}>{isError ? t('apiBadge.offlineMock') : t('apiBadge.live')}</Badge>}
      />

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              'rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ' +
              (filter === f ? 'bg-brand text-white' : 'bg-brand-surface text-ink-soft hover:text-ink')
            }
          >
            {f === 'all' ? t('kycAdmin.all') : t(`enums:kyc.${f}`)}
          </button>
        ))}
      </div>

      {queue.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-surface text-brand-dark">
            <Icon name="check" size={28} />
          </span>
          <p className="mt-3 font-display text-lg font-bold text-ink">
            {filter === 'pending' ? t('kycAdmin.queueCleared') : t('kycAdmin.nothingHere')}
          </p>
          <p className="text-sm text-ink-soft">
            {filter === 'pending' ? t('kycAdmin.allReviewed') : t('kycAdmin.noneFilter', { filter })}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {queue.map((k) => (
            <Card key={k.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg font-bold text-ink">{k.company}</div>
                  <div className="text-sm capitalize text-ink-soft">
                    {k.country} · {k.role}
                  </div>
                </div>
                <Badge tone={STATUS_TONE[k.status] ?? 'slate'}>{t(`enums:kyc.${k.status}`)}</Badge>
              </div>

              <div className="mt-4 flex items-center gap-4 rounded-md bg-brand-surface px-4 py-3 text-sm">
                <span className="flex items-center gap-2 text-ink">
                  <Icon name="box" size={16} /> {t('kycAdmin.docsCount', { count: k.docs })}
                </span>
                <span className="flex items-center gap-2 text-ink-soft">
                  <Icon name="clock" size={16} /> {k.submitted}
                </span>
              </div>

              {rejecting?.id === k.id ? (
                <div className="mt-4 flex flex-col gap-2">
                  <Input
                    placeholder={t('kycAdmin.rejectPh')}
                    value={rejecting.reason}
                    onChange={(e) => setRejecting({ id: k.id, reason: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button
                      fullWidth
                      variant="danger"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: k.id, status: 'rejected', note: rejecting.reason })}
                    >
                      {t('kycAdmin.confirmReject')}
                    </Button>
                    <Button variant="ghost" onClick={() => setRejecting(null)}>
                      {t('common:cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex gap-2">
                  {k.status === 'pending' && (
                    <>
                      <Button
                        fullWidth
                        disabled={isError || decide.isPending}
                        onClick={() => decide.mutate({ id: k.id, status: 'verified' })}
                        leftIcon={<Icon name="check" size={16} />}
                      >
                        {t('kycAdmin.approve')}
                      </Button>
                      <Button
                        fullWidth
                        variant="danger"
                        disabled={isError || decide.isPending}
                        onClick={() => setRejecting({ id: k.id, reason: '' })}
                        leftIcon={<Icon name="x" size={16} />}
                      >
                        {t('kycAdmin.reject')}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    disabled={isError}
                    onClick={() => setViewing(k.id)}
                    leftIcon={<Icon name="file" size={16} />}
                  >
                    {t('kycAdmin.docs')}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {viewing && <KycDocsDrawer recordId={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
