import { useQuery } from '@tanstack/react-query';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { ApiCmsPage } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { Card, EmptyState, Screen, SkeletonRows, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';

/**
 * Renders a public CMS page (Terms of Service, Privacy Policy) inside the app.
 *
 * Guidelines 1.2 and 3.1.2 both require these to be reachable from within the
 * app, not only from the store listing. Rendering them in-app rather than
 * handing off to a browser keeps them readable when the device is offline-ish
 * and avoids sending a reviewer out to Safari mid-review. The copy itself is
 * admin-editable (Admin → CMS) and localized by the API, so this screen stays
 * a dumb renderer.
 */
export function LegalPage() {
  const { t, lang } = useI18n();
  const route = useRoute<RouteProp<RootStackParamList, 'LegalPage'>>();
  const slug = route.params?.slug ?? 'terms';

  const { data, isLoading, isError } = useQuery<ApiCmsPage>({
    queryKey: ['cms-page', slug, lang],
    queryFn: () => api.cms.get(slug),
    retry: false,
  });

  if (isLoading) {
    return (
      <Screen>
        <Card><SkeletonRows /></Card>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen>
        <EmptyState icon="document-text-outline" title={t('pubX.legal.unavailableTitle')} body={t('pubX.legal.unavailableBody')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Txt variant="h2">{data.title}</Txt>
      <Txt variant="small" color={C.inkSoft} style={{ marginTop: space.xs }}>
        {t('pubX.legal.updated', { date: new Date(data.updatedAt).toLocaleDateString() })}
      </Txt>
      {/* The CMS stores plain text; the web renderer treats it the same way. */}
      <Txt style={{ marginTop: space.lg, lineHeight: 21 }}>{data.body}</Txt>
    </Screen>
  );
}
