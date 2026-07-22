import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@agrotraders/ui';
import { api } from '../lib/api';
import { useI18n } from '../i18n';

/**
 * Renders a public CMS page by slug (e.g. /p/terms). Falls back to a friendly
 * "coming soon" card when the page is not published / doesn't exist yet.
 */
export function PageView() {
  const { t } = useI18n();
  const { slug = '' } = useParams();
  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['cms-page', slug],
    queryFn: () => api.cms.get(slug),
    retry: false,
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : isError || !page ? (
        <Card className="py-16 text-center">
          <h1 className="font-display text-2xl font-extrabold text-ink">{t('page.cms.comingSoon')}</h1>
          <p className="mt-2 text-ink-soft">{t('page.cms.notAvailable')}</p>
          <Link to="/" className="mt-4 inline-block font-bold text-brand hover:underline">{t('page.cms.backHome')}</Link>
        </Card>
      ) : (
        <article>
          <h1 className="min-w-0 break-words font-display text-2xl font-extrabold text-ink sm:text-3xl">{page.title}</h1>
          <div className="mt-6 whitespace-pre-wrap text-ink-soft">{page.body}</div>
        </article>
      )}
    </div>
  );
}
