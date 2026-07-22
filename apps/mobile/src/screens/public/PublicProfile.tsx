import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { useCurrency } from '../../currency/CurrencyContext';
import { Badge, Button, Card, Loading, Row, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';
import { HireModal, type HireTarget } from '../components/HireModal';
import type { RootStackParamList } from '../../navigation/types';
import { forwardChevron } from '../../lib/rtl';
import { unitSuffix } from '@agrotraders/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'PublicProfile'>;

/** Public profile — contact details are masked by the API; users chat instead. */
export function PublicProfile() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { t } = useI18n();
  const { user: me } = useAuth();
  const { fmtPrice } = useCurrency();
  const [hire, setHire] = useState<HireTarget | null>(null);

  const { data: p, isLoading } = useQuery({
    queryKey: ['public-profile', params.userId],
    queryFn: () => api.directory.profile(params.userId),
  });

  if (isLoading || !p) return <View style={{ flex: 1, backgroundColor: C.bg }}><Loading label={t('compX.profile.loading')} /></View>;

  const roles = Array.from(new Set([p.role, ...(p.roles ?? [])]));
  const hireType: HireTarget['targetType'] | null = roles.includes('transporter')
    ? 'transporter'
    : roles.includes('loaderco')
      ? 'loaderco'
      : roles.includes('worker')
        ? 'worker'
        : null;
  const isMe = me?.id === p.id;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 40 }}>
        <Card style={{ gap: 10 }}>
          <Row gap={12}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontSize: 32 }}>{p.profile?.avatarEmoji ?? '🏢'}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="h3">{p.name}</Txt>
              <Row gap={6} style={{ flexWrap: 'wrap', marginTop: 4 }}>
                {p.kycStatus === 'verified' ? <Badge label={t('pubX.dir.kycVerified')} tone="green" /> : null}
                {roles.map((r) => <Badge key={r} label={t(`enums:role.${r}`)} tone="slate" />)}
              </Row>
            </View>
          </Row>
          {p.profile?.bio ? <Txt variant="muted">{p.profile.bio}</Txt> : null}
          <View style={{ gap: 6 }}>
            {(p.profile?.location || p.country) ? (
              <Row gap={6}><Ionicons name="location-outline" size={15} color={C.inkSoft} /><Txt variant="muted">{p.profile?.location ?? p.country}</Txt></Row>
            ) : null}
            {p.profile?.availableFrom && p.profile?.availableTo ? (
              <Row gap={6}><Ionicons name="time-outline" size={15} color={C.inkSoft} /><Txt variant="muted">{t('pubX.profile.availableRange', { from: p.profile.availableFrom, to: p.profile.availableTo })} {p.profile.timezone ?? ''}</Txt></Row>
            ) : null}
            {p.profile?.market ? (
              <Row gap={6}><Ionicons name="storefront-outline" size={15} color={C.inkSoft} /><Txt variant="muted">{p.profile.market.flag} {p.profile.market.name}</Txt></Row>
            ) : null}
            {p.contactMasked?.phone ? (
              <Row gap={6}><Ionicons name="call-outline" size={15} color={C.inkSoft} /><Txt variant="muted">{p.contactMasked.phone} · {t('pubX.profile.privateTag')}</Txt></Row>
            ) : null}
          </View>
          {!isMe && (
            <Row gap={8} style={{ marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Button title={t('pubX.dir.chat')} icon="chatbubbles-outline" full onPress={() => nav.navigate('Community', { dmUserId: p.id, dmName: p.name })} />
              </View>
              {hireType ? (
                <View style={{ flex: 1 }}>
                  <Button
                    title={t('pubX.dir.hire')}
                    variant="outline"
                    icon="checkmark"
                    full
                    onPress={() => setHire({ targetType: hireType, targetUserId: p.id, workerId: p.workerProfile?.id, name: p.name })}
                  />
                </View>
              ) : null}
            </Row>
          )}
        </Card>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface }}>
          <Ionicons name="shield-checkmark" size={20} color={C.dark} />
          <Txt variant="small" style={{ flex: 1 }}>{t('pubX.profile.privacyNote')}</Txt>
        </Card>

        {(p.products?.length ?? 0) > 0 && (
          <View style={{ gap: 10 }}>
            <Txt variant="h3">{t('pubX.profile.listings')}</Txt>
            {p.products!.map((prod) => (
              <Card key={prod.id} onPress={() => nav.navigate('ProductDetail', { slug: prod.slug })}>
                <Row gap={10}>
                  <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt style={{ fontSize: 20 }}>{prod.emoji ?? '🌾'}</Txt>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="title" numberOfLines={1}>{prod.name}</Txt>
                    <Txt variant="muted">{fmtPrice({ price: prod.price, priceCents: prod.priceCents })}{unitSuffix(prod.unit)}</Txt>
                  </View>
                  <Ionicons name={forwardChevron()} size={16} color={C.inkSoft} />
                </Row>
              </Card>
            ))}
          </View>
        )}

        {(p.routes?.length ?? 0) > 0 && (
          <View style={{ gap: 10 }}>
            <Txt variant="h3">{t('pubX.profile.activeRoutes')}</Txt>
            {p.routes!.map((r) => (
              <Card key={r.name}>
                <Row gap={10}>
                  <Ionicons name="car-outline" size={18} color={C.green} />
                  <Txt variant="title" style={{ flex: 1 }}>{r.name}</Txt>
                  {r.distanceKm ? <Txt variant="muted">{r.distanceKm} km</Txt> : null}
                </Row>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
      {hire && <HireModal target={hire} onClose={() => setHire(null)} />}
    </View>
  );
}
