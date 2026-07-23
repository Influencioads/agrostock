import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark, Button, Card, Icon, Input } from '@agrotraders/ui';
import { resolveApiError } from '@agrotraders/api-client';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import { useBranding } from '../branding/BrandingProvider';
import { useI18n } from '../i18n';

/** Passwordless sign-in: request an emailed 6-digit code, then verify it. */
export function OtpLoginPage() {
  const { t } = useI18n();
  const { verifyOtp } = useAuth();
  const { logoSrc } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/console';

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const requestCode = async () => {
    setError('');
    setBusy(true);
    try {
      await api.auth.requestOtp(email);
      setStep('code');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError('');
    setBusy(true);
    try {
      await verifyOtp(email, code.trim());
      navigate(from, { replace: true });
    } catch (e) {
      if (e instanceof Error && e.message.includes('admin.agrotraders.org')) {
        setError(e.message);
        return;
      }
      setError(resolveApiError(e, (c) => t(`errors:${c}`, { defaultValue: '' }) || undefined, t('errors:unknown')));
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
          <h1 className="font-display text-2xl font-extrabold text-ink">{t('page.otpLogin.title')}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {step === 'email' ? t('page.otpLogin.subtitle') : t('page.otpLogin.codeSent')}
          </p>

          {step === 'email' ? (
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void requestCode();
              }}
            >
              <Input
                label={t('page.otpLogin.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Icon name="user" size={16} />}
                required
              />
              <Button type="submit" fullWidth disabled={busy || !email}>
                {busy ? t('page.otpLogin.sending') : t('page.otpLogin.sendCode')}
              </Button>
            </form>
          ) : (
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void verify();
              }}
            >
              <Input
                label={t('page.otpLogin.code')}
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                leftIcon={<Icon name="shield" size={16} />}
                error={error || undefined}
                required
              />
              <Button type="submit" fullWidth disabled={busy || code.length < 6}>
                {busy ? t('page.otpLogin.verifying') : t('page.otpLogin.verify')}
              </Button>
              <Button type="button" variant="ghost" fullWidth disabled={busy} onClick={() => void requestCode()}>
                {t('page.otpLogin.resend')}
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-sm">
            <Link to="/login" className="font-semibold text-brand hover:text-brand-dark">
              {t('page.otpLogin.usePassword')}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
