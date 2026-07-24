import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useI18n } from '../../i18n';
import { useWishlist } from '../../lib/useWishlist';
import { useAuth } from '../../auth/AuthProvider';
import { Badge, Card, EmptyState, ErrorState, Row, Screen, SkeletonRows, Txt } from '../../ui';
import { C } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { unitSuffix } from '@agrotraders/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Saved — the buyer's own wishlist (F02). Reads the real per-user wishlist (not
 * a Safe Deal filter); each row's heart removes the item. Loading / error /
 * empty are distinguished explicitly (F28).
 */
export function BuyerSaved() {
  const { t } = useI18n();
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { isSaved, toggle } = useWishlist();
  const { data: saved = [], isLoading, isError, refetch } = useQuery<ApiProduct[]>({
    queryKey: ['wishlist-products'], queryFn: () => api.wishlist.list(),
    // MOB-15: don't fire the wishlist request for guests — it's a guaranteed 401
    // that also triggers the api-client's auth-error churn. The hook itself is
    // already `enabled: !!user`; the screen's own query must match.
    enabled: !!user,
  });

  return (
    <Screen>
      <Txt variant="h2">{t('buyerX.saved.screenTitle')}</Txt>
      <Txt variant="muted">{t('buyerX.saved.subtitle')}</Txt>
      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState title={t('common:errorTitle')} body={t('common:errorBody')} onRetry={() => refetch()} retryLabel={t('common:retry')} />
      ) : saved.length === 0 ? (
        <EmptyState icon="heart-outline" title={t('buyerX.saved.emptyTitle')} body={t('buyerX.saved.emptyBody')} />
      ) : (
        saved.map((p) => (
          <Card key={p.id} onPress={() => nav.navigate('ProductDetail', { slug: p.slug })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={10}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.mangoSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt style={{ fontSize: 20 }}>{p.emoji ?? '🌾'}</Txt>
                </View>
                <View>
                  <Txt variant="title">{p.name}</Txt>
                  <Txt variant="muted">{p.flag} {p.price}{unitSuffix(p.unit)}</Txt>
                </View>
              </Row>
              <Row gap={8}>
                {p.verified ? <Badge label={t('buyerX.saved.verified')} tone="green" /> : null}
                <Pressable
                  onPress={() => toggle(p.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSaved(p.id) }}
                  accessibilityLabel={t('compX.product.removeFromSaved')}
                >
                  <Ionicons name="heart" size={20} color={C.mangoDeep} />
                </Pressable>
              </Row>
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
