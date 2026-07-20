import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import type { ApiKycDocType, ApiKycDocument, ApiMyKyc } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { errMessage } from './order-parts';

// label/hint index `console.kyc.*`; translated at render.
const DOC_TYPES: { type: ApiKycDocType; label: string; hint: string }[] = [
  { type: 'trade_license', label: 'docTrade', hint: 'docTradeHint' },
  { type: 'government_id', label: 'docId', hint: 'docIdHint' },
  { type: 'bank_proof', label: 'docBank', hint: 'docBankHint' },
  { type: 'tax_certificate', label: 'docTax', hint: 'docTaxHint' },
];

const statusTone: Record<string, 'green' | 'mango' | 'error' | 'slate'> = {
  verified: 'green',
  pending: 'mango',
  rejected: 'error',
};

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

async function openDoc(id: string) {
  const w = window.open('', '_blank');
  try {
    const url = await api.kyc.docUrl(id);
    if (w) w.location.href = url;
  } catch {
    w?.close();
  }
}

/**
 * Identity/business verification. Users upload their documents here; an admin
 * reviews them on admin.agrotraders.org. Documents can be removed only while
 * the record is still under review.
 */
export function KycSection() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingType, setPendingType] = useState<ApiKycDocType | null>(null);
  const [err, setErr] = useState('');

  const { data, isLoading } = useQuery<ApiMyKyc>({ queryKey: ['me-kyc'], queryFn: () => api.kyc.mine() });

  const upload = useMutation({
    mutationFn: ({ type, file }: { type: ApiKycDocType; file: File }) => api.kyc.uploadDocument(type, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me-kyc'] });
      setErr('');
    },
    onError: (e) => setErr(errMessage(e, t('console.kyc.uploadFailed'))),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.kyc.deleteDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me-kyc'] }),
    onError: (e) => setErr(errMessage(e, t('console.kyc.removeFailed'))),
  });

  const status = data?.status ?? 'pending';
  const docs = data?.documents ?? [];
  const editable = status !== 'verified';

  function pick(type: ApiKycDocType) {
    setPendingType(type);
    fileRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (file && pendingType) upload.mutate({ type: pendingType, file });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden onChange={onFile} />

      <div>
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl font-extrabold text-ink">{t('console.nav.verify')}</h2>
          <Badge tone={statusTone[status] ?? 'slate'}>
            {t(`enums:kyc.${status}`, { defaultValue: status })}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-ink-soft">{t('console.kyc.intro')}</p>
      </div>

      {!!err && <p className="text-sm text-red-600">{err}</p>}

      <div className="space-y-3">
        {DOC_TYPES.map(({ type, label, hint }) => {
          const uploaded = docs.filter((d) => d.type === type);
          return (
            <Card key={type} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-surface text-brand-dark">
                  <Icon name="file" size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink">{t(`console.kyc.${label}`)}</div>
                  <div className="truncate text-xs text-ink-soft">{t(`console.kyc.${hint}`)}</div>
                </div>
                {editable && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={upload.isPending}
                    onClick={() => pick(type)}
                    leftIcon={<Icon name="plus" size={14} />}
                  >
                    {t('console.kyc.upload')}
                  </Button>
                )}
              </div>

              {uploaded.map((d: ApiKycDocument) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg bg-brand-surface/50 px-3 py-2">
                  <Icon name="check" size={16} className="text-brand-dark" />
                  <div className="min-w-0 flex-1 truncate text-sm text-ink">
                    {d.originalName ?? d.mime} <span className="text-ink-soft">· {kb(d.sizeBytes)}</span>
                  </div>
                  <button className="text-xs font-bold text-brand-dark hover:underline" onClick={() => openDoc(d.id)}>
                    {t('console.kyc.view')}
                  </button>
                  {editable && (
                    <button
                      className="text-xs font-bold text-red-600 hover:underline disabled:opacity-50"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(d.id)}
                    >
                      {t('console.loaderco.remove')}
                    </button>
                  )}
                </div>
              ))}
            </Card>
          );
        })}
      </div>

      {isLoading && <p className="text-sm text-ink-soft">{t('common:loading')}</p>}
    </div>
  );
}
