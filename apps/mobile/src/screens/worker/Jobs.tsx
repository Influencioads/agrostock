import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { Badge, Button, Card, EmptyState, Loading, Row, Screen, Txt } from '../../ui';
import { View } from 'react-native';
import { useI18n } from '../../i18n';

interface Assignment { id: string; status: string; job?: { reference: string; location: string; payCents?: number | null; otp?: string | null } }
const tone: Record<string, 'slate' | 'info' | 'warn' | 'green'> = { assigned: 'slate', accepted: 'info', checked_in: 'warn', completed: 'green' };

export function WorkerJobs() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: jobs = [], isLoading } = useQuery<Assignment[]>({ queryKey: ['worker-jobs'], queryFn: () => api.loaders.workerJobs() as Promise<Assignment[]>, enabled: !!user });
  const refresh = () => qc.invalidateQueries({ queryKey: ['worker-jobs'] });
  const accept = useMutation({ mutationFn: (id: string) => api.loaders.accept(id), onSuccess: refresh });
  const checkin = useMutation({ mutationFn: (id: string) => api.loaders.checkin(id), onSuccess: refresh });
  const checkout = useMutation({
    mutationFn: (id: string) => api.loaders.checkout(id),
    onSuccess: () => {
      // Check-out completes a direct worker hire and pays out — refresh money views.
      refresh();
      qc.invalidateQueries({ queryKey: ['me-earnings'] });
      qc.invalidateQueries({ queryKey: ['me-wallet'] });
      qc.invalidateQueries({ queryKey: ['me-dashboard'] });
    },
  });

  return (
    <Screen edges={['top']}>
      <Txt variant="h2">{t('compX.jobs.title')}</Txt>
      {isLoading ? (
        <Loading />
      ) : jobs.length === 0 ? (
        <EmptyState icon="briefcase-outline" title={t('compX.jobs.emptyTitle')} body={t('compX.jobs.emptyBody')} />
      ) : (
        jobs.map((a) => (
          <Card key={a.id} style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <Txt variant="title">{a.job?.location ?? t('compX.jobs.jobFallback')}</Txt>
                <Txt variant="muted">
                  #{a.job?.reference}
                  {a.job?.payCents ? ` · $${(a.job.payCents / 100).toFixed(0)}` : ''}
                  {a.status === 'accepted' && a.job?.otp ? ` · OTP ${a.job.otp}` : ''}
                </Txt>
              </View>
              <Badge label={a.status.replace('_', ' ')} tone={tone[a.status] ?? 'slate'} />
            </Row>
            <Row gap={8}>
              {a.status === 'assigned' ? <Button title={t('compX.jobs.accept')} size="sm" loading={accept.isPending} onPress={() => accept.mutate(a.id)} /> : null}
              {a.status === 'accepted' ? <Button title={t('compX.jobs.checkin')} size="sm" variant="accent" loading={checkin.isPending} onPress={() => checkin.mutate(a.id)} /> : null}
              {a.status === 'checked_in' ? <Button title={t('compX.jobs.checkout')} size="sm" variant="outline" loading={checkout.isPending} onPress={() => checkout.mutate(a.id)} /> : null}
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
