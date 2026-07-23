import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiHireRequest, ApiOrder } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { Badge, Button, Card, Row, Segmented, SkeletonRows, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';
import { HireModal, type HireTarget } from './HireModal';
import { useI18n } from '../../i18n';

type Tab = 'transporter' | 'loaderco' | 'worker';

const STATUS_TONE = { pending: 'warn', accepted: 'green', declined: 'error', cancelled: 'slate' } as const;

/** One directory row, regardless of whether it came from workers or companies. */
interface ProviderRow {
  id: string;
  userId?: string;
  name: string;
  detail: string;
  workerId?: string;
}

/**
 * "Arrange logistics" for one order: hire a transporter, a loading company, or
 * individual workers. Every hire carries this order's id, so once a transporter
 * accepts, the minted Trip attaches to the order and the existing dispatch /
 * pickup-OTP / delivery-OTP flow takes over unchanged.
 */
export function ArrangeLogisticsSheet({ order, onClose }: { order: ApiOrder; onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('transporter');
  const [hiring, setHiring] = useState<HireTarget | null>(null);

  const { data: hires = [] } = useQuery<ApiHireRequest[]>({
    queryKey: ['hires', 'order', order.id],
    queryFn: () => api.hires.mine({ orderId: order.id }),
    refetchInterval: 15000,
  });

  const { data: providers = [], isLoading } = useQuery<ProviderRow[]>({
    queryKey: ['directory', tab],
    queryFn: async () => {
      if (tab === 'worker') {
        const workers = await api.directory.workers();
        return workers.map((w) => ({ id: w.id, userId: w.user?.id, name: w.name, detail: `${w.rating ?? '—'} ★ · ${w.status}`, workerId: w.id }));
      }
      const list = tab === 'transporter' ? await api.directory.transporters() : await api.directory.loaders();
      return list.map((d) => ({ id: d.id, userId: d.id, name: d.name, detail: [d.country, d.kycStatus].filter(Boolean).join(' · ') }));
    },
  });

  const alreadyHired = new Set(
    hires.filter((h) => h.status !== 'declined' && h.status !== 'cancelled').map((h) => h.targetUser?.id),
  );
  const acceptedTransporter = hires.find((h) => h.targetType === 'transporter' && h.status === 'accepted');

  return (
    <>
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' }}>
          <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt variant="h3" style={{ flexShrink: 1 }}>{t('compX.logistics.title', { ref: order.reference })}</Txt>
              <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={22} color={C.inkSoft} /></Pressable>
            </Row>

            {hires.length > 0 && (
              <>
                <Txt variant="title">{t('compX.logistics.hiresForOrder')}</Txt>
                {hires.map((h) => (
                  <Card key={h.id}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View style={{ flexShrink: 1 }}>
                        <Txt variant="title">{h.targetUser?.name ?? t('compX.logistics.provider')}</Txt>
                        <Txt variant="muted">#{h.reference} · {t('enums:hire_target.' + h.targetType)}</Txt>
                      </View>
                      <Badge label={t('enums:hire_status.' + h.status)} tone={STATUS_TONE[h.status]} />
                    </Row>
                  </Card>
                ))}
                {!!acceptedTransporter && (
                  <Txt variant="small">
                    {t('compX.logistics.accepted', { name: acceptedTransporter.targetUser?.name ?? '' })}
                  </Txt>
                )}
              </>
            )}

            <Segmented
              options={[
                { id: 'transporter', label: t('compX.logistics.tabTransport') },
                { id: 'loaderco', label: t('compX.logistics.tabLoaders') },
                { id: 'worker', label: t('compX.logistics.tabWorkers') },
              ]}
              value={tab}
              onChange={(v) => setTab(v as Tab)}
            />

            {isLoading ? (
              <SkeletonRows />
            ) : providers.length === 0 ? (
              <Txt variant="muted">{t('compX.logistics.emptyDirectory')}</Txt>
            ) : (
              providers.map((p) => {
                const hired = !!p.userId && alreadyHired.has(p.userId);
                return (
                  <Card key={p.id}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View style={{ flexShrink: 1 }}>
                        <Txt variant="title">{p.name}</Txt>
                        <Txt variant="muted">{p.detail}</Txt>
                      </View>
                      {hired ? (
                        <Badge label={t('compX.logistics.requested')} tone="slate" />
                      ) : (
                        <Button
                          title={t('compX.logistics.hire')}
                          size="sm"
                          disabled={!p.userId}
                          onPress={() => setHiring({ targetType: tab, targetUserId: p.userId!, workerId: p.workerId, name: p.name })}
                        />
                      )}
                    </Row>
                  </Card>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>

      {hiring && (
        <HireModal
          target={hiring}
          orderId={order.id}
          onClose={() => {
            setHiring(null);
            qc.invalidateQueries({ queryKey: ['hires', 'order', order.id] });
            qc.invalidateQueries({ queryKey: ['hires-sent'] });
          }}
        />
      )}
    </>
  );
}
