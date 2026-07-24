import { Link } from 'react-router-dom';
import { Button } from '@agrotraders/ui';
import { useI18n } from '../i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';

/**
 * WEB-08: unknown routes previously did `<Navigate to="/" replace />`, so a
 * typo'd URL, a dead shared link, or a stale bookmark dumped the user on the
 * homepage with no explanation. Tell them what happened and offer a way back.
 */
export function NotFoundPage() {
  const { t } = useI18n();
  useDocumentTitle(t('page.notFound.title'));
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <div className="font-display text-6xl font-extrabold text-brand">404</div>
      <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">{t('page.notFound.title')}</h1>
      <p className="mt-2 text-ink-soft">{t('page.notFound.body')}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/">
          <Button>{t('page.notFound.home')}</Button>
        </Link>
        <Link to="/market">
          <Button variant="outline">{t('page.notFound.browse')}</Button>
        </Link>
      </div>
    </div>
  );
}
