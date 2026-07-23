import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { ApiLoaderReviews } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Card, EmptyState, RatingStars, Row, Screen, Txt } from '../../ui';
import { C } from '../../theme/tokens';

/** Ratings & reviews left on the worker's completed jobs. */
export function WorkerReviews() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data } = useQuery<ApiLoaderReviews>({
    queryKey: ['worker-reviews'],
    queryFn: () => api.loaders.workerReviews(),
    enabled: !!user,
  });
  const list = data?.list ?? [];
  return (
    <Screen>
      <Txt variant="h2">{t('mobile2.reviews.title')}</Txt>
      {data && data.count > 0 ? (
        <Card style={{ backgroundColor: C.evergreen }}>
          <Row gap={10} style={{ alignItems: 'center' }}>
            <Txt color={C.white} style={{ fontSize: 30, fontWeight: '800' }}>{data.avg.toFixed(1)}</Txt>
            <View>
              <RatingStars n={Math.round(data.avg)} size={16} />
              <Txt variant="muted" color={C.mint}>{t('mobile2.reviews.count', { count: data.count })}</Txt>
            </View>
          </Row>
        </Card>
      ) : null}
      {list.length === 0 ? (
        <EmptyState icon="star-outline" title={t('mobile2.reviews.empty')} body={t('mobile2.reviews.emptyBody')} />
      ) : (
        list.map((r) => (
          <Card key={r.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt variant="title">{r.rater?.name ?? t('mobile2.reviews.clientFallback')}</Txt>
              <RatingStars n={r.stars} />
            </Row>
            {r.text ? <Txt variant="body" style={{ marginTop: 4 }}>{r.text}</Txt> : null}
            <Txt variant="muted" style={{ marginTop: 4 }}>{new Date(r.createdAt).toLocaleDateString()}</Txt>
          </Card>
        ))
      )}
    </Screen>
  );
}
