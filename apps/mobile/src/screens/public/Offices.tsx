import { useQuery } from '@tanstack/react-query';
import type { ApiOffice } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { Badge, Card, EmptyState, Row, Screen, SkeletonRows, Txt } from '../../ui';

export function Offices() {
  const { t } = useI18n();
  const { data: offices = [], isLoading } = useQuery<ApiOffice[]>({ queryKey: ['offices'], queryFn: () => api.offices.list() });
  return (
    <Screen>
      <Txt variant="h2">{t('mobile2.offices.title')}</Txt>
      {isLoading ? (
        <SkeletonRows />
      ) : offices.length === 0 ? (
        <EmptyState icon="business-outline" title={t('mobile2.offices.empty')} />
      ) : (
        offices.map((o) => (
          <Card key={o.id} style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt style={{ fontSize: 26 }}>{o.flag}</Txt>
              <Badge label={o.type} tone="green" />
            </Row>
            <Txt variant="title">{o.name}</Txt>
            <Txt variant="muted">{t('mobile2.offices.staff', { city: o.city, mgr: o.mgr, count: Number(o.staff) })}</Txt>
          </Card>
        ))
      )}
    </Screen>
  );
}
