import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark, Button, Card, Icon, Input } from '@agrotraders/ui';
import { apiErrorCode, resolveApiError } from '@agrotraders/api-client';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import { useBranding } from '../branding/BrandingProvider';
import { useI18n } from '../i18n';

const demoRoles = ['buyer', 'seller', 'transporter', 'loaderco', 'worker'];

export function LoginPage() {
  const { t } = useI18n();
  const { login, loginDemo } = useAuth();
  const { logoSrc } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/console';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Set when the sign-in failed only because the address is not confirmed yet.
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);

  const submit = async (run: () => Promise<unknown>) => {
    setError('');
    setNeedsVerification(false);
    setResent(false);
    setBusy(true);
    try {
      await run();
      navigate(from, { replace: true });
    } catch (e) {
      // Admins are blocked from the public site (see AuthContext.login) — surface
      // the thrown message directly rather than treating it as a network error.
      if (e instanceof Error && e.message.includes('admin.agrotraders.org')) {
        setError(e.message);
        return;
      }
      const status = (e as { response?: { status?: number } })?.response?.status;
      // 429 and "no response" never reach the API's error contract, so they stay local.
      if (status === 429) {
        setError(t('errors:net.rate_limited'));
      } else if (status === undefined) {
        setError(t('errors:net.offline'));
      } else {
        setNeedsVerification(apiErrorCode(e) === 'auth.email_not_verified');
        setError(resolveApiError(e, (code) => t(`errors:${code}`, { defaultValue: '' }) || undefined, t('errors:unknown')));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dock px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center text-white">
          <BrandMark
            logoSrc={logoSrc}
            size="lg"
            suffixClassName="text-brand-leaf"
            glyphClassName="shadow-cta"
          />
        </Link>

        <Card className="p-7">
          <h1 className="font-display text-2xl font-extrabold text-ink">{t('page.login.title')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('page.login.subtitle')}</p>

          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(() => login(email, password));
            }}
          >
            <Input
              label={t('page.login.emailOrPhone')}
              type="text"
              placeholder={t('page.login.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Icon name="user" size={16} />}
              required
            />
            <Input
              label={t('page.login.password')}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Icon name="shield" size={16} />}
              error={error || undefined}
              required
            />
            {needsVerification && (
              <Button
                type="button"
                variant="outline"
                fullWidth
                disabled={resent}
                onClick={async () => {
                  await api.auth.resendVerification(email);
                  setResent(true);
                }}
              >
                {resent ? t('page.login.verificationSent') : t('page.login.resendVerification')}
              </Button>
            )}
            <Button type="submit" fullWidth disabled={busy}>
              {busy ? t('page.login.signingIn') : t('page.login.signIn')}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-soft">
            {t('page.login.noAccount')}{' '}
            <Link to="/register" className="font-bold text-brand hover:text-brand-dark">
              {t('page.login.createOne')}
            </Link>
          </p>

          <div className="mt-6 border-t border-surface-border pt-5">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-ink-soft">
              {t('page.login.demoAccounts')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {demoRoles.map((id) => (
                <Button
                  key={id}
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void submit(() => loginDemo(id))}
                >
                  {t(`console.role.${id}`)}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-center text-[11px] text-ink-soft">{t('page.login.demoHint')}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
