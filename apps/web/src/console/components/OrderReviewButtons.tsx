import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Icon } from '@agrotraders/ui';
import type { ApiReview, ReviewRole } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n';
import { ReviewModal } from './ReviewModal';

/** i18n keys per reviewee role: [leave-new, edit-existing]. */
const LABELS: Record<string, [string, string]> = {
  seller: ['console.reviews.leaveSeller', 'console.reviews.editSeller'],
  product: ['console.reviews.rateProduct', 'console.reviews.editProduct'],
  buyer: ['console.reviews.reviewBuyer', 'console.reviews.editBuyer'],
};

/**
 * Review action(s) for a completed order. For each candidate role it shows
 * "Leave a review" when eligible-and-not-done, or "Edit your review" when the
 * viewer already reviewed that side (authors can edit anytime). Renders nothing
 * until eligibility resolves or when there's nothing to do.
 */
export function OrderReviewButtons({ orderId, roles }: { orderId: string; roles: ReviewRole[] }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [openRole, setOpenRole] = useState<ReviewRole | null>(null);

  const eligibility = useQuery({
    queryKey: ['review-eligibility', 'order', orderId],
    queryFn: () => api.reviews.eligibility('order', orderId),
  });
  const subject = useQuery({
    queryKey: ['reviews', 'subject', 'order', orderId],
    queryFn: () => api.reviews.forSubject('order', orderId),
  });

  const elig = eligibility.data;
  if (!elig) return null;

  const mine = (role: ReviewRole): ApiReview | null =>
    subject.data?.list.find((r) => r.raterId === user?.id && r.revieweeRole === role) ?? null;
  const sideAvailable = (role: ReviewRole) => elig.sides.some((s) => s.role === role);

  const actions = roles.flatMap((role) => {
    const done = !!elig.done[role];
    if (done) return [{ role, existing: mine(role) }];
    if (elig.eligible && sideAvailable(role)) return [{ role, existing: null as ApiReview | null }];
    return [];
  });

  if (actions.length === 0) return null;

  return (
    <>
      {actions.map(({ role, existing }) => {
        const [leaveKey, editKey] = LABELS[role] ?? ['console.reviews.leaveYours', 'console.reviews.editYours'];
        return (
          <Button
            key={role}
            size="sm"
            variant="outline"
            leftIcon={<Icon name="star" size={13} />}
            onClick={() => setOpenRole(role)}
          >
            {t(existing ? editKey : leaveKey)}
          </Button>
        );
      })}
      {openRole && (
        <ReviewModal
          open
          onClose={() => setOpenRole(null)}
          kind="order"
          subjectId={orderId}
          revieweeRole={openRole}
          existingReview={mine(openRole)}
        />
      )}
    </>
  );
}
