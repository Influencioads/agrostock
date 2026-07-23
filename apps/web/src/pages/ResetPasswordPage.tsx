import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BrandMark, Button, Card, Icon, Input } from '@agrotraders/ui';
import { resolveApiError } from '@agrotraders/api-client';
import { useAuth } from '../auth/AuthContext';
import { useBranding } from '../branding/BrandingProvider';
import { useI18n } from '../i18n';

/** Landing page for the reset link (`/reset-password?token=…`). On success the
 *  API returns a full session, so the visitor lands signed in. */
export function ResetPasswordPage() {
  const { t } = useI18n();
  const { resetPassword } = useAuth();
  const { logoSrc } = useBranding();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (password.length < 8) return setError(t('page.resetPassword.tooShort'));
    if (password !== confirm) return setError(t('page.resetPassword.mismatch'));
    setBusy(true);
    try {
      await resetPassword(token, password);
      navigate('/console', { replace: true });
    } catch (e) {
      setError(resolveApiError(e, (code) => t(`errors:${code}`, { defaultValue: '' }) || undefined, t('errors:unknown')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dock px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center text-white">
          <BrandMark logoSrc={logoSrc} size="lg" suffixClassName="text-brand-leaf" glyphClassName="shadow-cta" />
        </Link>

        <Card className="p-7">
          <h1 className="font-display text-2xl font-extrabold text-ink">{t('page.resetPassword.title')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('page.resetPassword.subtitle')}</p>

          {!token ? (
            <div className="mt-5">
              <p className="text-sm text-status-error">{t('page.resetPassword.invalidLink')}</p>
              <Button className="mt-4" fullWidth onClick={() => navigate('/forgot-password')}>
                {t('page.resetPassword.requestNew')}
              </Button>
            </div>
          ) : (
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <Input
                label={t('page.resetPassword.newPassword')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Icon name="shield" size={16} />}
                required
              />
              <Input
                label={t('page.resetPassword.confirmPassword')}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                leftIcon={<Icon name="shield" size={16} />}
                error={error || undefined}
                required
              />
              <Button type="submit" fullWidth disabled={busy}>
                {busy ? t('page.resetPassword.submitting') : t('page.resetPassword.submit')}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
