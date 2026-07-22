import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BrandMark, Button, Card, Icon } from '@agrotraders/ui';
import { resolveApiError } from '@agrotraders/api-client';
import { useAuth } from '../auth/AuthContext';
import { useBranding } from '../branding/BrandingProvider';
import { useI18n } from '../i18n';

/**
 * Landing page for the confirmation link we email at signup
 * (`/verify-email?token=…`). The token is one-shot: on success the API hands
 * back a full session, so the visitor lands signed in on onboarding rather than
 * being bounced to a login form.
 */
export function VerifyEmailPage() {
  const { t } = useI18n();
  const { verifyEmail } = useAuth();
  const { logoSrc } = useBranding();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [error, setError] = useState('');
  // React 18 StrictMode double-invokes effects in dev; a second call would burn
  // the single-use token and report "invalid link" on a perfectly good one.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setError(t('errors:auth.verification_invalid'));
      return;
    }
    verifyEmail(token)
      .then(() => navigate('/onboarding', { replace: true }))
      .catch((e) =>
        setError(
          resolveApiError(e, (code) => t(`errors:${code}`, { defaultValue: '' }) || undefined, t('errors:unknown')),
        ),
      );
  }, [token, verifyEmail, navigate, t]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dock px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center text-white">
          <BrandMark logoSrc={logoSrc} size="lg" suffixClassName="text-brand-leaf" glyphClassName="shadow-cta" />
        </Link>

        <Card className="p-7 text-center">
          {error ? (
            <>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-error/10 text-status-error">
                <Icon name="x" size={22} />
              </span>
              <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">
                {t('page.verifyEmail.failedTitle')}
              </h1>
              <p className="mt-2 text-sm text-ink-soft">{error}</p>
              <Button className="mt-5" fullWidth onClick={() => navigate('/login')}>
                {t('page.verifyEmail.backToSignIn')}
              </Button>
            </>
          ) : (
            <>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-surface text-brand-dark">
                <Icon name="refresh" size={22} />
              </span>
              <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">
                {t('page.verifyEmail.checking')}
              </h1>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
