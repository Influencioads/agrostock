import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiKycDocument } from '@agrotraders/api-client';
import { api } from '../lib/api';
import { useI18n } from '../i18n';

const humanize = (s: string) => s.replace(/_/g, ' ');
const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Opens a KYC file in a new tab via a short-lived signed URL (admin-allowed). */
async function openDoc(id: string) {
  const w = window.open('', '_blank');
  try {
    const url = await api.kyc.docUrl(id);
    if (w) w.location.href = url;
  } catch {
    w?.close();
  }
}

/** Admin viewer for the documents a user submitted for KYC verification. */
export function KycDocsDrawer({ recordId, onClose }: { recordId: string; onClose: () => void }) {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-kyc-detail', recordId],
    queryFn: () => api.admin.kycDetail(recordId),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-s border-surface-border bg-surface-bg p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">{t('kycDocs.title')}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <Icon name="x" size={18} />
          </Button>
        </div>

        {isLoading || !data ? (
          <Card className="py-14 text-center text-ink-soft">{t('common:loading')}</Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display font-bold text-ink">{data.user.name}</div>
                  <div className="text-xs capitalize text-ink-soft">
                    {data.user.country ?? '—'} · {data.user.role}
                  </div>
                </div>
                <Badge tone={data.status === 'verified' ? 'green' : data.status === 'rejected' ? 'error' : 'warn'}>
                  {t(`enums:kyc.${data.status}`)}
                </Badge>
              </div>
            </Card>

            {data.documents.length === 0 ? (
              <Card className="py-10 text-center text-ink-soft">
                <Icon name="file" size={24} className="mx-auto mb-2 text-ink-soft" />
                {t('kycAdmin.noDocs')}
              </Card>
            ) : (
              <div className="space-y-2">
                {data.documents.map((d: ApiKycDocument) => (
                  <Card key={d.id} className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-surface text-brand-dark">
                      <Icon name={d.mime === 'application/pdf' ? 'file' : 'box'} size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold capitalize text-ink">{humanize(d.type)}</div>
                      <div className="truncate text-xs text-ink-soft">
                        {d.originalName ?? d.mime} · {kb(d.sizeBytes)}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openDoc(d.id)} leftIcon={<Icon name="search" size={14} />}>
                      {t('kycAdmin.view')}
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
