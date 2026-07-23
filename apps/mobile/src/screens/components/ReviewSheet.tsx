import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReviewKind, ReviewRole } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { errMessage } from '../../lib/format';
import { Button, Input, RatingStars, Row, Sheet, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';

/** Refresh every list that can show a review, its subject summary or eligibility. */
function useReviewInvalidation() {
  const qc = useQueryClient();
  return () => {
    for (const key of [['reviews'], ['review-eligibility'], ['product-reviews']]) {
      qc.invalidateQueries({ queryKey: key });
    }
  };
}

/**
 * Bottom-sheet for leaving or editing a single review. Authors may edit their own
 * review anytime (server-enforced); pass `existingReview` to switch to edit mode.
 */
export function ReviewSheet({
  visible,
  onClose,
  kind,
  subjectId,
  revieweeRole,
  existingReview,
  title,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  kind: ReviewKind;
  subjectId: string;
  revieweeRole: ReviewRole;
  existingReview?: { id: string; stars: number; text: string | null } | null;
  title?: string;
  onDone?: () => void;
}) {
  const { t } = useI18n();
  const invalidate = useReviewInvalidation();
  const [stars, setStars] = useState(existingReview?.stars ?? 0);
  const [text, setText] = useState(existingReview?.text ?? '');
  const [error, setError] = useState('');

  // Re-seed the form whenever a different review is opened (or reopened) for edit.
  useEffect(() => {
    setStars(existingReview?.stars ?? 0);
    setText(existingReview?.text ?? '');
    setError('');
  }, [existingReview, visible]);

  const save = useMutation({
    mutationFn: () =>
      existingReview
        ? api.reviews.update(existingReview.id, { stars, text: text.trim() || undefined })
        : api.reviews.create({ kind, subjectId, revieweeRole, stars, text: text.trim() || undefined }),
    onSuccess: () => {
      invalidate();
      onDone?.();
      onClose();
    },
    onError: (e) => setError(errMessage(e, t('reviews.submitError'))),
  });

  const roleLabel = t(`reviews.role.${revieweeRole}`);
  const heading = title ?? t(existingReview ? 'reviews.editRole' : 'reviews.rateRole', { role: roleLabel });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={heading}
      footer={
        <View style={{ flex: 1 }}>
          <Button
            title={save.isPending ? t('reviews.submitting') : t(existingReview ? 'reviews.update' : 'reviews.submit')}
            disabled={stars < 1 || save.isPending}
            onPress={() => save.mutate()}
            full
          />
        </View>
      }
    >
      <View style={{ padding: space.lg, gap: 14 }}>
        {!!error && <Txt color={C.error} variant="small">{error}</Txt>}
        <View style={{ gap: 6 }}>
          <Txt variant="label">{t('reviews.yourRating')}</Txt>
          <RatingStars n={stars} size={34} onChange={setStars} />
        </View>
        <Input
          label={t('reviews.comment')}
          value={text}
          onChangeText={setText}
          placeholder={t('reviews.commentPlaceholder')}
          multiline
          numberOfLines={4}
          style={{ height: 110, textAlignVertical: 'top', paddingTop: 12 }}
        />
      </View>
    </Sheet>
  );
}

/**
 * The review action(s) for a completed order card. The server decides which sides
 * the current viewer may review (buyer → seller & product, seller → buyer) and
 * which are already done, so the same component serves both order screens.
 */
export function OrderReviewButton({ orderId }: { orderId: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [openRole, setOpenRole] = useState<ReviewRole | null>(null);

  const { data: elig } = useQuery({
    queryKey: ['review-eligibility', 'order', orderId],
    queryFn: () => api.reviews.eligibility('order', orderId),
  });
  // Only needed to pre-fill the author's own review when editing.
  const { data: summary } = useQuery({
    queryKey: ['reviews', 'subject', 'order', orderId],
    queryFn: () => api.reviews.forSubject('order', orderId),
    enabled: !!elig && elig.sides.length > 0,
  });

  if (!elig || elig.sides.length === 0) return null;

  const mine = (role: ReviewRole) =>
    summary?.list.find((r) => r.raterId === user?.id && r.revieweeRole === role) ?? null;

  return (
    <>
      <Row gap={8} style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {elig.sides.map((side) => {
          const done = !!elig.done[side.role];
          const roleLabel = t(`reviews.role.${side.role}`);
          return (
            <Button
              key={side.role}
              title={t(done ? 'reviews.editRole' : 'reviews.rateRole', { role: roleLabel })}
              size="sm"
              variant="outline"
              icon="star-outline"
              onPress={() => setOpenRole(side.role)}
            />
          );
        })}
      </Row>
      {openRole && (
        <ReviewSheet
          visible
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
