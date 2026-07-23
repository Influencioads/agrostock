import { Badge, Button, Card, Icon } from '@agrotraders/ui';
import { useI18n } from '../i18n';

// Office names/cities are translated via page.offices.list.<key>; manager
// names, timezones and language codes stay literal.
const offices = [
  { key: 'hq', flag: '🇦🇪', type: 'head', mgr: 'Omar Al-Farsi', tz: 'GMT+4', langs: 'EN · AR · RU', gold: true },
  { key: 'cis', flag: '🇷🇺', type: 'regional', mgr: 'Irina Volkova', tz: 'GMT+3', langs: 'RU · EN', gold: false },
  { key: 'centralAsia', flag: '🇰🇿', type: 'country', mgr: 'Aigerim N.', tz: 'GMT+6', langs: 'KK · RU · EN', gold: false },
  { key: 'southAsia', flag: '🇮🇳', type: 'country', mgr: 'Rahul Mehta', tz: 'GMT+5:30', langs: 'EN · HI', gold: false },
  { key: 'turkiye', flag: '🇹🇷', type: 'sales', mgr: 'Mehmet Demir', tz: 'GMT+3', langs: 'TR · EN · RU', gold: false },
  { key: 'blackSea', flag: '🇺🇦', type: 'warehouse', mgr: 'Olena Koval', tz: 'GMT+2', langs: 'UK · RU · EN', gold: false },
  { key: 'latam', flag: '🇧🇷', type: 'representative', mgr: 'Camila Souza', tz: 'GMT-3', langs: 'PT · EN · ES', gold: false },
  { key: 'eu', flag: '🇩🇪', type: 'support', mgr: 'Lukas Bauer', tz: 'GMT+1', langs: 'DE · EN · RU', gold: false },
];

export function OfficesPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <h1 className="min-w-0 break-words font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('section.offices')}</h1>
      <p className="mt-1 text-ink-soft">{t('page.offices.sub')}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {offices.map((o) => (
          <Card key={o.key} hoverable className={o.gold ? 'border-gold/40' : ''}>
            <div className="flex items-start justify-between">
              <span className="text-3xl">{o.flag}</span>
              <Badge tone={o.gold ? 'gold' : 'green'}>{t(`page.offices.type.${o.type}`)}</Badge>
            </div>
            <div className="mt-2 font-display text-lg font-bold text-ink">{t(`page.offices.list.${o.key}.name`)}</div>
            <div className="text-sm text-ink-soft">{t(`page.offices.list.${o.key}.city`)}</div>
            <div className="mt-3 space-y-1 text-sm text-ink-soft">
              <div className="flex items-center gap-2">
                <Icon name="user" size={14} /> {o.mgr}
              </div>
              <div className="flex items-center gap-2">
                <Icon name="clock" size={14} /> {o.tz} · {o.langs}
              </div>
            </div>
            <Button variant="outline" size="sm" fullWidth className="mt-4" leftIcon={<Icon name="phone" size={14} />}>
              {t('page.offices.requestCallback')}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
