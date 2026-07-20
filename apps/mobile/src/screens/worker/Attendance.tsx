import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { ApiAttendance } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Card, EmptyState, Row, Screen, Txt } from '../../ui';

const hours = (r: ApiAttendance) =>
  r.checkInAt && r.checkOutAt
    ? ((new Date(r.checkOutAt).getTime() - new Date(r.checkInAt).getTime()) / 3.6e6).toFixed(1) + 'h'
    : '—';

/** A worker's own shift history — check-ins and check-outs they logged. */
export function WorkerAttendance() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: rows = [] } = useQuery<ApiAttendance[]>({
    queryKey: ['worker-attendance'],
    queryFn: () => api.loaders.workerAttendance(),
    enabled: !!user,
  });
  return (
    <Screen>
      <Txt variant="h2">{t('mobile2.attendance.title')}</Txt>
      {rows.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title={t('mobile2.attendance.empty')} body={t('mobile2.attendance.emptyBody')} />
      ) : (
        rows.map((r) => (
          <Card key={r.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Txt variant="title">{r.job?.location ?? t('mobile2.attendance.shiftFallback')}</Txt>
                <Txt variant="muted">#{r.job?.reference} · {r.checkInAt ? new Date(r.checkInAt).toLocaleString() : '—'}</Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Badge label={r.checkOutAt ? t('mobile2.attendance.completed') : t('mobile2.attendance.onSite')} tone={r.checkOutAt ? 'slate' : 'green'} />
                <Txt variant="title">{hours(r)}</Txt>
              </View>
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
