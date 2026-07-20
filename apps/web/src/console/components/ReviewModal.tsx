import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Icon, Modal } from '@agrotraders/ui';
import type { ReviewKind, ReviewRole } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';

export interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  kind: ReviewKind;
  subjectId: string;
  revieweeRole: ReviewRole;
  /** When present the modal edits this row instead of creating a new one. */
  existingReview?: { id: string; stars: number; text?: string | null } | null;
  title?: string;
  onDone?: () => void;
}

/**
 * Reusable star-review composer. Generalised from HiresSection's RateLoaderModal
 * so every completed service (order/trip/job/…) can be rated through one dialog.
 * Authors may edit their own review anytime; the server rejects everything else.
 */
export function ReviewModal({
  open,
  onClose,
  kind,
  subjectId,
  revieweeRole,
  existingReview,
  title,
  onDone,
}: ReviewModalProps) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [stars, setStars] = useState(existingReview?.stars ?? 5);
  const [text, setText] = useState(existingReview?.text ?? '');

  const submit = useMutation({
    mutationFn: () => {
      const trimmed = text.trim() || undefined;
      return existingReview
        ? api.reviews.update(existingReview.id, { stars, text: trimmed })
        : api.reviews.create({ kind, subjectId, revieweeRole, stars, text: trimmed });
    },
    onSuccess: () => {
      // Refresh every surface that can show a review or gate the review button.
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['review-eligibility'] });
      onDone?.();
      onClose();
    },
  });

  return (
    <Modal closeLabel={t('common:close')}
      open={open}
      onClose={onClose}
      title={title ?? (existingReview ? t('console.reviews.editTitle') : t('console.reviews.leaveTitle'))}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common:cancel')}</Button>
          <Button disabled={submit.isPending} onClick={() => submit.mutate()}>
            {existingReview ? t('console.reviews.saveReview') : t('console.hires.submitReview')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setStars(n)} aria-label={t('console.hires.starsAria', { count: n })}>
              <Icon name="star" size={26} className={n <= stars ? 'text-mango-deep' : 'text-surface-border'} />
            </button>
          ))}
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.hires.commentOptional')}</span>
          <textarea
            value={text ?? ''}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={t('console.reviews.commentPlaceholder')}
            className="w-full rounded-md border border-surface-border bg-white px-3 py-2 text-sm outline-none focus-within:border-brand-leaf focus:border-brand-leaf placeholder:text-ink-soft"
          />
        </label>
        {submit.isError && <p className="text-xs text-status-error">{t('console.reviews.submitError')}</p>}
      </div>
    </Modal>
  );
}
