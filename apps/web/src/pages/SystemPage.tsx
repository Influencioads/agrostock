import {
  Badge,
  Button,
  Card,
  Icon,
  ICON_PATHS,
  Input,
  Stat,
  Table,
  Tabs,
  type BadgeTone,
  type IconName,
} from '@agrotraders/ui';
import { useState } from 'react';
import { useI18n } from '../i18n';

// Swatch/type/badge/table sample data is built inside the component so every
// user-facing label runs through t(). Token names + hexes stay literal.
type OrderRow = { order: string; product: string; amount: string; status: BadgeTone; statusLabel: string };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function SystemPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState('grid');

  const swatchGroups: { h: string; items: [string, string, string][] }[] = [
    {
      h: t('page.system.sample.primaryGreens'),
      items: [
        ['Deep Evergreen', '#0B3D2E', '#fff'],
        ['Primary Agro', '#146B3A', '#fff'],
        ['Fresh Leaf', '#249653', '#fff'],
        ['Bright Accent', '#53B86A', '#063'],
        ['Soft Mint', '#DFF3E4', '#146B3A'],
      ],
    },
    {
      h: t('page.system.sample.mangoAccent'),
      items: [
        ['Mango', '#FFA000', '#0B3D2E'],
        ['Mango Soft', '#FFE9C4', '#F57C00'],
        ['Mango Deep', '#F57C00', '#fff'],
        ['Orange', '#FB8C00', '#fff'],
        ['Natural Gold', '#C98A00', '#fff'],
      ],
    },
    {
      h: t('page.system.sample.neutrals'),
      items: [
        ['White', '#FFFFFF', '#647268'],
        ['Soft Green BG', '#F6FBF7', '#647268'],
        ['Light Surface', '#EDF7EF', '#146B3A'],
        ['Border', '#D7E6DA', '#647268'],
        ['Main Text', '#14251A', '#fff'],
        ['Secondary', '#647268', '#fff'],
      ],
    },
    {
      h: t('page.system.sample.status'),
      items: [
        ['Success', '#249653', '#fff'],
        ['Warning', '#EF8E00', '#fff'],
        ['Error', '#C94343', '#fff'],
        ['Info', '#2E7FA8', '#fff'],
      ],
    },
  ];

  const typeScale = [
    { n: 'Display / Manrope 800', size: 40, w: 800, t: t('page.system.sample.typeDisplay'), f: 'font-display' },
    { n: 'H1 / Manrope 800', size: 30, w: 800, t: t('page.system.sample.typeH1'), f: 'font-display' },
    { n: 'H2 / Manrope 700', size: 22, w: 700, t: t('page.system.sample.typeH2'), f: 'font-display' },
    { n: 'Body / Inter 400', size: 15, w: 400, t: t('page.system.sample.typeBody'), f: '' },
    { n: 'Numeric / IBM Plex', size: 20, w: 700, t: '$142,840.00 · 4.9 · +12%', f: 'font-numeric' },
  ];

  const badgeTones: { tone: BadgeTone; label: string }[] = [
    { tone: 'green', label: t('page.system.sample.verified') },
    { tone: 'gold', label: t('page.system.sample.premium') },
    { tone: 'mango', label: t('page.system.sample.trending') },
    { tone: 'warn', label: t('page.system.sample.lowStock') },
    { tone: 'error', label: t('page.system.sample.dispute') },
    { tone: 'info', label: t('page.system.sample.inTransit') },
    { tone: 'slate', label: t('page.system.sample.draft') },
  ];

  const sampleRows: OrderRow[] = [
    { order: '#AG-7741', product: t('page.system.sample.product1'), amount: '$42,000', status: 'info', statusLabel: t('page.system.sample.inTransit') },
    { order: '#AG-7738', product: t('page.system.sample.product2'), amount: '$26,800', status: 'gold', statusLabel: t('page.system.sample.escrowHeld') },
    { order: '#AG-7732', product: t('page.system.sample.product3'), amount: '$20,400', status: 'green', statusLabel: t('page.system.sample.delivered') },
  ];

  return (
    <div>
      {/* header */}
      <div className="bg-brand-dock px-4 py-8 text-white sm:px-6 sm:py-10 lg:px-8">
        <p className="font-numeric text-sm font-semibold tracking-wide text-mango">
          AGROTRADERS UI KIT · V1.0
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{t('page.system.title')}</h1>
        <p className="mt-3 max-w-2xl text-mint/80">{t('page.system.sub')}</p>
      </div>

      <div className="px-4 pb-16 sm:px-6 lg:px-8">
        {/* color tokens */}
        <Section title={t('page.system.colorTokens')}>
          <div className="space-y-6">
            {swatchGroups.map((g) => (
              <div key={g.h}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{g.h}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {g.items.map(([name, hex, ink]) => (
                    <div key={name} className="overflow-hidden rounded-lg border border-surface-border shadow-card">
                      <div
                        className="flex h-20 items-end p-2 text-[11px] font-bold"
                        style={{ background: hex, color: ink }}
                      >
                        {hex}
                      </div>
                      <div className="bg-white px-2 py-2 text-xs font-semibold text-ink">{name}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* typography */}
        <Section title={t('page.system.typography')}>
          <Card>
            <div className="space-y-4">
              {typeScale.map((ts) => (
                <div key={ts.n} className="flex flex-col gap-1 border-b border-surface-border pb-4 last:border-0 sm:flex-row sm:items-baseline sm:gap-6">
                  <span className="w-48 shrink-0 text-xs font-semibold text-ink-soft">{ts.n}</span>
                  <span className={ts.f} style={{ fontSize: ts.size, fontWeight: ts.w, lineHeight: 1.1 }}>
                    {ts.t}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* buttons */}
        <Section title={t('page.system.buttons')}>
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" leftIcon={<Icon name="bag" size={16} />}>
                {t('page.product.buyNow')}
              </Button>
              <Button variant="accent" leftIcon={<Icon name="gavel" size={16} />}>
                {t('auction.bid')}
              </Button>
              <Button variant="secondary">{t('page.system.sample.addToCart')}</Button>
              <Button variant="outline">{t('page.product.requestQuote')}</Button>
              <Button variant="ghost">{t('common:cancel')}</Button>
              <Button variant="danger">{t('page.system.sample.dispute')}</Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button size="sm">{t('page.system.sample.small')}</Button>
              <Button size="md">{t('page.system.sample.medium')}</Button>
              <Button size="lg">{t('page.system.sample.large')}</Button>
              <Button disabled>{t('page.system.sample.disabled')}</Button>
            </div>
          </Card>
        </Section>

        {/* badges */}
        <Section title={t('page.system.statusChips')}>
          <Card>
            <div className="flex flex-wrap gap-2">
              {badgeTones.map((b) => (
                <Badge key={b.tone} tone={b.tone}>
                  {b.label}
                </Badge>
              ))}
              <Badge tone="green" icon={<Icon name="shield" size={12} />}>
                {t('site.safeDeal')}
              </Badge>
              <Badge tone="mango" icon={<Icon name="star" size={12} />}>
                4.9
              </Badge>
            </div>
          </Card>
        </Section>

        {/* inputs + tabs */}
        <Section title={t('page.system.inputsTabs')}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <div className="space-y-4">
                <Input label={t('page.system.sample.searchLabel')} placeholder={t('page.system.sample.searchPlaceholder')} leftIcon={<Icon name="search" size={16} />} />
                <Input label={t('page.system.sample.email')} placeholder="you@company.com" hint={t('page.system.sample.emailHint')} />
                <Input label={t('page.system.sample.price')} placeholder="0.00" error={t('page.system.sample.priceError')} />
              </div>
            </Card>
            <Card>
              <Tabs
                items={[
                  { id: 'grid', label: t('page.system.sample.grid') },
                  { id: 'list', label: t('page.system.sample.list') },
                  { id: 'map', label: t('page.system.sample.map') },
                ]}
                value={tab}
                onChange={setTab}
              />
              <p className="mt-4 text-sm text-ink-soft">{t('page.system.sample.activeTab')} <span className="font-bold text-ink">{tab}</span></p>
            </Card>
          </div>
        </Section>

        {/* stats */}
        <Section title={t('page.system.kpiStats')}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label={t('page.system.sample.activeOrders')} value="12" delta="+3" up icon={<Icon name="box" size={18} />} />
            <Stat label={t('page.system.sample.safeDealBalance')} value="$126K" delta={t('console.dash.escrow')} up icon={<Icon name="shield" size={18} />} />
            <Stat label={t('page.system.sample.activeBids')} value="5" delta="+1" up icon={<Icon name="gavel" size={18} />} />
            <Stat label={t('page.system.sample.pendingPayments')} value="$48.2K" delta={t('console.dash.due', { count: 2 })} up={false} icon={<Icon name="wallet" size={18} />} />
          </div>
        </Section>

        {/* table */}
        <Section title={t('page.system.dataTable')}>
          <Card padded={false} className="p-4">
            <Table<OrderRow>
              columns={[
                { key: 'order', header: t('page.system.sample.order') },
                { key: 'product', header: t('page.system.sample.product') },
                { key: 'amount', header: t('page.system.sample.amount'), align: 'right' },
                {
                  key: 'status',
                  header: t('page.system.sample.status'),
                  render: (r) => <Badge tone={r.status}>{r.statusLabel}</Badge>,
                },
              ]}
              rows={sampleRows}
              getKey={(r) => r.order}
            />
          </Card>
        </Section>

        {/* icons */}
        <Section title={t('page.system.iconSet')}>
          <Card>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-8">
              {(Object.keys(ICON_PATHS) as IconName[]).map((name) => (
                <div key={name} className="flex flex-col items-center gap-1.5 rounded-md border border-surface-border p-3 text-ink">
                  <Icon name={name} size={22} />
                  <span className="max-w-full break-all text-center text-[10px] text-ink-soft">{name}</span>
                </div>
              ))}
            </div>
          </Card>
        </Section>
      </div>
    </div>
  );
}
