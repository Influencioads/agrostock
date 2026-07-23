import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark, Button, Card, Icon, Input } from '@agrotraders/ui';
import { api } from '../lib/api';
import { useBranding } from '../branding/BrandingProvider';
import { useI18n } from '../i18n';

/** Request a password-reset link. Always reports success (no account enumeration). */
export function ForgotPasswordPage() {
  const { t } = useI18n();
  const { logoSrc } = useBranding();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
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
          <h1 className="font-display text-2xl font-extrabold text-ink">{t('page.forgotPassword.title')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('page.forgotPassword.subtitle')}</p>

          {sent ? (
            <div className="mt-5 rounded-lg bg-brand-surface p-4 text-sm text-ink">{t('page.forgotPassword.sent')}</div>
          ) : (
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <Input
                label={t('page.forgotPassword.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Icon name="user" size={16} />}
                required
              />
              <Button type="submit" fullWidth disabled={busy || !email}>
                {busy ? t('page.forgotPassword.sending') : t('page.forgotPassword.send')}
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-sm">
            <Link to="/login" className="font-semibold text-brand hover:text-brand-dark">
              {t('page.forgotPassword.backToSignIn')}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
