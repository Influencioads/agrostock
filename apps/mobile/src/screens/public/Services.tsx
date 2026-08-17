import { useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiServiceProvider } from '@agrotraders/api-client';
import { SERVICE_GROUPS } from '@agrotraders/types';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency } from '../../currency/CurrencyContext';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, Chip, EmptyState, Row, SkeletonRows, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';
import { HireModal, type HireTarget } from '../components/HireModal';
import { forwardChevron } from '../../lib/rtl';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Public directory of service providers — accountants, packers, processors,
 * fulfilment and finance partners.
 *
 * Mirrors the web `/services` page: browsing is open, and both actions (hire or
 * enquire) are the gated step. Hire books the job through the same HireRequest
 * flow a transporter uses, so escrow, notifications and invoicing behave the
 * same; enquiry is only a chat.
 */
export function Services() {
  const nav = useNavigation<Nav>();
  const { t } = useI18n();
  const { user } = useAuth();
  const { fmtCents } = useCurrency();
  const [category, setCategory] = useState('');
  const [hire, setHire] = useState<HireTarget | null>(null);

  const { data: providers = [], isLoading } = useQuery<ApiServiceProvider[]>({
    queryKey: ['service-providers', category],
    queryFn: () => api.services.providers({ category: category || undefined }),
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ padding: space.lg, gap: 10, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Txt variant="muted">{t('service.sub')}</Txt>
        {/* Grouped exactly as the web filter is — a category belongs to one
            presentation group, which SERVICE_GROUPS is the single source of. */}
        {Object.entries(SERVICE_GROUPS).map(([group, cats]) => (
          <View key={group} style={{ gap: 6 }}>
            <Txt variant="micro">{t(`service.group.${group}`, { defaultValue: group })}</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {cats.map((c) => (
                <Chip
                  key={c}
                  label={t(`enums:serviceCategory.${c}`, { defaultValue: c })}
                  active={category === c}
                  onPress={() => setCategory(category === c ? '' : c)}
                />
              ))}
            </ScrollView>
          </View>
        ))}
      </View>

      <FlatList
        data={providers}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: space.lg, gap: 12 }}
        ListEmptyComponent={isLoading ? <SkeletonRows /> : <EmptyState icon="briefcase-outline" title={t('service.none')} />}
        renderItem={({ item: p }) => {
          const name = p.companyName || p.user.name;
          const isMe = p.user.id === user?.id;
          return (
            <Card style={{ gap: 10 }}>
              {/* The identity block opens the profile — this card is a summary, and
                  every field it truncates lives on that page. */}
              <Pressable onPress={() => nav.navigate('PublicProfile', { userId: p.user.id })}>
                <Row gap={10}>
                  <View style={{ flex: 1 }}>
                    <Row gap={6}>
                      <Txt variant="title" numberOfLines={1} style={{ flexShrink: 1 }}>{name}</Txt>
                      {p.user.kycStatus === 'verified' ? (
                        <Ionicons name="shield-checkmark" size={14} color={C.green} />
                      ) : null}
                    </Row>
                    <Txt variant="muted">{t(`enums:serviceRole.${p.user.role}`, { defaultValue: p.user.role })}</Txt>
                  </View>
                  <Ionicons name={forwardChevron()} size={16} color={C.inkSoft} />
                </Row>
              </Pressable>

              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                {p.categories.slice(0, 3).map((c) => (
                  <Badge key={c} label={t(`enums:serviceCategory.${c}`, { defaultValue: c })} tone="green" />
                ))}
                {p.categories.length > 3 ? <Badge label={`+${p.categories.length - 3}`} tone="slate" /> : null}
              </Row>

              {p.blurb ? <Txt variant="muted" numberOfLines={2}>{p.blurb}</Txt> : null}

              <Row gap={10} style={{ flexWrap: 'wrap' }}>
                {p.citiesServed.length > 0 ? <Txt variant="small">📍 {p.citiesServed.slice(0, 3).join(', ')}</Txt> : null}
                {p.turnaroundDays != null ? (
                  <Txt variant="small">{t('service.turnaroundDays', { count: p.turnaroundDays })}</Txt>
                ) : null}
                {p.capacityPerDay != null ? (
                  <Txt variant="small">{t('service.capacity')}: {p.capacityPerDay}</Txt>
                ) : null}
              </Row>

              <Txt variant="title">
                {p.priceFromCents != null && p.pricingBasis
                  ? t('service.priceFrom', {
                      amount: fmtCents(p.priceFromCents),
                      basis: t(`enums:servicePricingBasis.${p.pricingBasis}`, { defaultValue: p.pricingBasis }),
                    })
                  : t('service.onEnquiry')}
              </Txt>

              <Row gap={8}>
                <View style={{ flex: 1 }}>
                  {/* No auth check: HireModal shows its own sign-in prompt, which
                      keeps the chosen provider in view instead of bouncing away. */}
                  <Button
                    title={t('service.hire')}
                    size="sm"
                    icon="checkmark"
                    full
                    disabled={isMe}
                    onPress={() => setHire({ targetType: 'service_provider', targetUserId: p.user.id, name })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t('service.contact')}
                    size="sm"
                    variant="outline"
                    icon="chatbubbles-outline"
                    full
                    disabled={isMe}
                    onPress={() =>
                      user
                        ? nav.navigate('Community', { dmUserId: p.user.id, dmName: name })
                        : nav.navigate('SignIn', {})
                    }
                  />
                </View>
              </Row>
            </Card>
          );
        }}
      />
      {hire && <HireModal target={hire} onClose={() => setHire(null)} />}
    </View>
  );
}
