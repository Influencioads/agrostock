import { Link } from 'react-router-dom';
import { Badge, Button, Card, Icon, Reveal, Stagger, StaggerItem, type IconName } from '@agrotraders/ui';
import { useI18n } from '../i18n';

/* ── how the escrow flow works — titles/bodies index page.safeDeal.* ── */
const STEPS: { icon: IconName; key: string }[] = [
  { icon: 'wallet', key: 'step1' },
  { icon: 'box', key: 'step2' },
  { icon: 'shield', key: 'step3' },
  { icon: 'check', key: 'step4' },
];

const COVERAGE: { icon: IconName; key: string; tone: 'green' | 'mango' }[] = [
  { icon: 'store', key: 'coverSellers', tone: 'green' },
  { icon: 'truck', key: 'coverTransporters', tone: 'green' },
  { icon: 'worker', key: 'coverLoaders', tone: 'mango' },
  { icon: 'user', key: 'coverWorkers', tone: 'green' },
];

const GUARANTEES: { icon: IconName; key: string }[] = [
  { icon: 'shield', key: 'g1' },
  { icon: 'refresh', key: 'g2' },
  { icon: 'gavel', key: 'g3' },
  { icon: 'file', key: 'g4' },
];

export function SafeDealPage() {
  const { t } = useI18n();
  return (
    <div>
      {/* hero band */}
      <section className="relative overflow-hidden bg-brand-evergreen text-white">
        <div className="pointer-events-none absolute -end-10 top-0 h-80 w-80 rounded-full bg-brand-leaf/15 blur-3xl" />
        <div className="mx-auto max-w-5xl px-4 py-16 text-center lg:px-6">
          <Reveal as="div">
            <span className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-1 text-xs font-semibold text-mint">
              <Icon name="shield" size={14} /> {t('page.safeDeal.badge')}
            </span>
            <h1 className="mt-5 break-words font-display text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              {t('page.safeDeal.heroTitle')}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-mint/80">
              {t('page.safeDeal.heroBody')}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/market">
                <Button size="lg" variant="accent" leftIcon={<Icon name="bag" size={18} />}>{t('page.safeDeal.startOrder')}</Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10">
                  {t('page.safeDeal.createAccount')}
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-6xl px-4 py-14 lg:px-6">
        <Reveal as="div" className="mb-8 text-center">
          <h2 className="min-w-0 break-words font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('page.safeDeal.howTitle')}</h2>
          <p className="mt-2 text-ink-soft">{t('page.safeDeal.howSub')}</p>
        </Reveal>
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <StaggerItem key={s.key}>
              <Card className="h-full">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-cta">
                  <Icon name={s.icon} size={22} />
                </span>
                <div className="mt-3 font-display text-base font-bold text-ink">{t(`page.safeDeal.${s.key}Title`)}</div>
                <p className="mt-1 text-sm text-ink-soft">{t(`page.safeDeal.${s.key}Body`)}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>

        {/* the money-on-hold explainer strip */}
        <Reveal as="div" className="mt-10">
          <Card className="flex flex-col items-center gap-4 bg-brand-surface text-center sm:flex-row sm:text-start">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white">
              <Icon name="wallet" size={26} />
            </span>
            <div>
              <div className="font-display text-lg font-extrabold text-ink">{t('page.safeDeal.holdTitle')}</div>
              <p className="mt-1 text-sm text-ink-soft">{t('page.safeDeal.holdBody')}</p>
            </div>
          </Card>
        </Reveal>
      </section>

      {/* who it covers */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 lg:px-6">
          <Reveal as="div" className="mb-8 text-center">
            <h2 className="min-w-0 break-words font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('page.safeDeal.coverTitle')}</h2>
            <p className="mt-2 text-ink-soft">{t('page.safeDeal.coverSub')}</p>
          </Reveal>
          <Stagger className="grid gap-4 sm:grid-cols-2">
            {COVERAGE.map((c) => (
              <StaggerItem key={c.key}>
                <Card interactive className="h-full">
                  <div className="flex items-center gap-3">
                    <span className={'flex h-11 w-11 items-center justify-center rounded-lg ' + (c.tone === 'mango' ? 'bg-mango-soft text-orange' : 'bg-brand-surface text-brand-dark')}>
                      <Icon name={c.icon} size={22} />
                    </span>
                    <div className="font-display text-lg font-bold text-ink">{t(`page.safeDeal.${c.key}`)}</div>
                    <Badge tone="green" className="ms-auto" icon={<Icon name="shield" size={11} />}>{t('page.safeDeal.escrow')}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-ink-soft">{t(`page.safeDeal.${c.key}Body`)}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* guarantees */}
      <section className="mx-auto max-w-6xl px-4 py-14 lg:px-6">
        <Reveal as="div" className="mb-8 text-center">
          <h2 className="min-w-0 break-words font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('page.safeDeal.guaranteesTitle')}</h2>
        </Reveal>
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GUARANTEES.map((g) => (
            <StaggerItem key={g.key}>
              <Card className="flex h-full items-start gap-3">
                <Icon name={g.icon} size={20} className="mt-0.5 shrink-0 text-brand" />
                <span className="text-sm font-semibold text-ink">{t(`page.safeDeal.${g.key}`)}</span>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal as="div" className="mt-10 text-center">
          <Card className="bg-brand-evergreen text-white">
            <h3 className="font-display text-2xl font-extrabold">{t('page.safeDeal.ctaTitle')}</h3>
            <p className="mx-auto mt-2 max-w-xl text-mint/80">
              {t('page.safeDeal.ctaBody')}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link to="/market"><Button size="lg" variant="accent" leftIcon={<Icon name="bag" size={18} />}>{t('page.safeDeal.browseMarket')}</Button></Link>
              <Link to="/sellers"><Button size="lg" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10">{t('page.safeDeal.findSellers')}</Button></Link>
            </div>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}
