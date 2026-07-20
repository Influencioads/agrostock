import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Icon, Input, Modal } from '@agrotraders/ui';
import type { ApiAdminReview, ReviewStatus } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import { errMessage } from '../lib/errors';

type StatusFilter = 'all' | ReviewStatus;
type KindFilter = 'all' | 'order' | 'trip' | 'loaderjob' | 'assignment' | 'hire';

const STATUS_TABS: StatusFilter[] = ['all', 'visible', 'hidden', 'removed'];
const KINDS: KindFilter[] = ['all', 'order', 'trip', 'loaderjob', 'assignment', 'hire'];

const STATUS_TONE: Record<ReviewStatus, 'green' | 'warn' | 'error'> = {
  visible: 'green',
  hidden: 'warn',
  removed: 'error',
};

/** Render N filled stars out of 5. */
function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="star"
          size={14}
          className={n <= value ? 'text-mango' : 'text-ink-soft/30'}
          fill={n <= value ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

export function ReviewsModerationPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [kind, setKind] = useState<KindFilter>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ApiAdminReview | null>(null);

  const filters = { status, kind, search: search.trim() };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', filters],
    queryFn: () =>
      api.admin.reviews({
        status: status === 'all' ? undefined : status,
        kind: kind === 'all' ? undefined : kind,
        search: filters.search || undefined,
      }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-reviews'] });

  const setReviewStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReviewStatus }) => api.admin.updateReview(id, { status }),
    onSuccess: invalidate,
    onError: (e) => window.alert(errMessage(e, t('genericError'))),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.admin.deleteReview(id),
    onSuccess: invalidate,
    onError: (e) => window.alert(errMessage(e, t('genericError'))),
  });

  const rows = (data?.rows ?? []) as ApiAdminReview[];
  const total = data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title={t('page.reviews.title')}
        subtitle={t('page.reviews.subtitle')}
        action={<Badge tone="green">{t('apiBadge.live')}</Badge>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tk) => (
          <button
            key={tk}
            onClick={() => setStatus(tk)}
            className={
              'rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ' +
              (status === tk ? 'bg-brand text-white' : 'bg-brand-surface text-ink-soft hover:text-ink')
            }
          >
            {t(`reviewsMod.status.${tk}`)}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={
              'rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-colors ' +
              (kind === k
                ? 'border-brand-leaf bg-brand-surface text-brand-dark'
                : 'border-surface-border text-ink-soft hover:text-ink')
            }
          >
            {t(`reviewsMod.kind.${k}`)}
          </button>
        ))}
        <div className="ms-auto w-full sm:w-64">
          <Input
            leftIcon={<Icon name="search" size={16} />}
            placeholder={t('reviewsMod.searchPh')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card padded={false}>
        <div className="flex items-center justify-between border-b border-surface-border p-4">
          <span className="font-display font-bold text-ink">{t('reviewsMod.title')}</span>
          <Badge tone="slate">{t('reviewsMod.totalCount', { count: total })}</Badge>
        </div>
        <div className="divide-y divide-surface-border">
          {isLoading ? (
            <p className="p-8 text-center text-sm text-ink-soft">{t('common:loading')}</p>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink-soft">{t('reviewsMod.empty')}</p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={r.stars} />
                    <Badge tone={STATUS_TONE[r.status]}>{t(`reviewsMod.status.${r.status}`)}</Badge>
                    <Badge tone="info">{t(`enums:role.${r.revieweeRole}`, { defaultValue: r.revieweeRole })}</Badge>
                    <Badge tone="slate">{t(`reviewsMod.kind.${r.kind}`, { defaultValue: r.kind })}</Badge>
                    {r.product && <Badge tone="gold">{r.product.name}</Badge>}
                    {r.editedByAdmin && <Badge tone="mango">{t('reviewsMod.editedBy', { name: r.editedByAdmin.name })}</Badge>}
                  </div>
                  {r.text ? (
                    <p className="mt-1.5 line-clamp-3 text-sm text-ink">{r.text}</p>
                  ) : (
                    <p className="mt-1.5 text-sm italic text-ink-soft">{t('reviewsMod.noText')}</p>
                  )}
                  <div className="mt-1 text-xs text-ink-soft">
                    {r.rater?.name ?? '—'} → {r.reviewee?.name ?? '—'} · {t('reviewsMod.subjectLine', { kind: t(`reviewsMod.kind.${r.kind}`, { defaultValue: r.kind }), id: r.subjectId })}
                  </div>
                  {r.adminNote && (
                    <div className="mt-1 text-xs text-ink-soft">
                      <span className="font-semibold">{t('reviewsMod.adminNote')}</span> {r.adminNote}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                    {t('reviewsMod.edit')}
                  </Button>
                  {r.status === 'hidden' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={setReviewStatus.isPending}
                      onClick={() => setReviewStatus.mutate({ id: r.id, status: 'visible' })}
                    >
                      {t('reviewsMod.unhide')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={setReviewStatus.isPending}
                      onClick={() => setReviewStatus.mutate({ id: r.id, status: 'hidden' })}
                    >
                      {t('reviewsMod.hide')}
                    </Button>
                  )}
                  {r.status !== 'removed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setReviewStatus.isPending}
                      onClick={() => setReviewStatus.mutate({ id: r.id, status: 'removed' })}
                    >
                      {t('reviewsMod.remove')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(t('reviewsMod.confirmDelete'))) remove.mutate(r.id);
                    }}
                  >
                    {t('reviewsMod.delete')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {editing && <EditReviewModal review={editing} onClose={() => setEditing(null)} onSaved={invalidate} />}
    </div>
  );
}

/* ── Edit modal: change stars, text and admin note ────────────────── */

function EditReviewModal({
  review,
  onClose,
  onSaved,
}: {
  review: ApiAdminReview;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [stars, setStars] = useState(review.stars);
  const [text, setText] = useState(review.text ?? '');
  const [adminNote, setAdminNote] = useState(review.adminNote ?? '');
  const [err, setErr] = useState('');

  const save = useMutation({
    mutationFn: () =>
      api.admin.updateReview(review.id, {
        stars,
        text: text.trim(),
        adminNote: adminNote.trim(),
      }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (e) => setErr(errMessage(e, t('genericError'))),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={t('reviewsMod.modalTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common:cancel')}
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? t('reviewsMod.saving') : t('reviewsMod.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('reviewsMod.rating')}</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStars(n)}
                aria-label={t('reviewsMod.starAria', { count: n })}
                className={n <= stars ? 'text-mango' : 'text-ink-soft/30 hover:text-ink-soft'}
              >
                <Icon name="star" size={26} fill={n <= stars ? 'currentColor' : 'none'} />
              </button>
            ))}
            <span className="ms-2 text-sm text-ink-soft">{stars}/5</span>
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('reviewsMod.reviewText')}</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-surface-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-leaf"
            placeholder={t('reviewsMod.bodyPh')}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('reviewsMod.adminNoteLabel')}</span>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-surface-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-leaf"
            placeholder={t('reviewsMod.notePh')}
          />
        </label>

        {err && <p className="text-xs text-status-error">{err}</p>}
      </div>
    </Modal>
  );
}
