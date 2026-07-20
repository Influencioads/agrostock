import { useState } from 'react';
import { BrandMark, Button, Card, Input } from '@agrotraders/ui';
import { BRAND } from '@agrotraders/types';
import { useAuth } from '../auth/AuthContext';
import { useBranding } from '../branding/BrandingProvider';
import { useI18n } from '../i18n';

export function LoginPage() {
  const { t } = useI18n();
  const { login } = useAuth();
  const { logoSrc } = useBranding();
  const [email, setEmail] = useState('admin@agrotraders.org');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error && err.message === 'ADMIN_ONLY' ? t('login.adminOnly') : t('login.invalid'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-evergreen px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5 text-white">
          <BrandMark logoSrc={logoSrc} size="lg" glyphOnly />
          <div>
            <div className="font-display text-xl font-extrabold leading-none">
              {BRAND.prefix}
              <span className="text-brand-leaf">{BRAND.suffix}</span>
            </div>
            <div className="text-[10px] uppercase tracking-wide text-mango">{t('login.commandCentre')}</div>
          </div>
        </div>
        <Card className="p-7">
          <h1 className="font-display text-xl font-extrabold text-ink">{t('login.title')}</h1>
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <Input label={t('login.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input
              label={t('login.password')}
              type="password"
              placeholder="password123"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error || undefined}
              required
            />
            <Button type="submit" fullWidth disabled={busy}>
              {busy ? t('login.signingIn') : t('common:signIn')}
            </Button>
          </form>
          <p className="mt-3 text-center text-[11px] text-ink-soft">{t('login.demo')}</p>
        </Card>
      </div>
    </div>
  );
}
