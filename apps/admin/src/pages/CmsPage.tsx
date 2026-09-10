import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge, Button, Card } from '@agrotraders/ui';
import type { ApiCmsPage, ApiHomeBanners } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { errMessage } from '../lib/errors';
import { useI18n } from '../i18n';

/** Small controlled switch — @agrotraders/ui has no Switch export. */
function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        on ? 'bg-brand-leaf' : 'bg-surface-border'
      }`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

type CopyField = keyof Omit<ApiHomeBanners, 'promoEnabled' | 'heroEnabled' | 'updatedAt'>;

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-soft">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
        className="w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-leaf"
      />
    </label>
  );
}

/**
 * Admin → CMS → the two banners on the mobile home screen.
 *
 * Copy is an OVERRIDE, not the source of truth: an empty box is stored as null
 * and the app falls back to its own translated string, so clearing a field is
 * how you get the shipped default back. The switches hide a banner outright.
 */
function BannersCard() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<ApiHomeBanners>({
    queryKey: ['admin-home-banners'],
    queryFn: () => api.admin.homeBanners(),
    retry: 1,
  });
  const [draft, setDraft] = useState<ApiHomeBanners | null>(null);
  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (body: Partial<Omit<ApiHomeBanners, 'updatedAt'>>) => api.admin.updateHomeBanners(body),
    onSuccess: (row) => {
      setDraft(row);
      qc.invalidateQueries({ queryKey: ['admin-home-banners'] });
      toast.success(t('cmsAdmin.banners.saved'));
    },
    onError: (e) => toast.error(errMessage(e, t('cmsAdmin.banners.saveFailed'))),
  });

  if (isLoading || !draft) return <p className="text-ink-soft">{t('common:loading')}</p>;

  const set = (patch: Partial<ApiHomeBanners>) => setDraft({ ...draft, ...patch });
  const copy = (field: CopyField) => ({
    value: draft[field] ?? '',
    onChange: (v: string) => set({ [field]: v } as Partial<ApiHomeBanners>),
  });
  // Trim, and send an emptied box as null so the app falls back to its default.
  const clean = (v: string | null) => {
    const s = (v ?? '').trim();
    return s.length ? s : null;
  };
  const submit = () =>
    save.mutate({
      promoEnabled: draft.promoEnabled,
      promoTitle: clean(draft.promoTitle),
      promoBody: clean(draft.promoBody),
      promoCta: clean(draft.promoCta),
      heroEnabled: draft.heroEnabled,
      heroTag: clean(draft.heroTag),
      heroTitle: clean(draft.heroTitle),
      heroCta: clean(draft.heroCta),
    });

  return (
    <Card className="mt-6">
      <div className="mb-1 text-sm font-semibold text-ink">{t('cmsAdmin.banners.title')}</div>
      <p className="mb-4 text-xs text-ink-soft">{t('cmsAdmin.banners.sub')}</p>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-ink">{t('cmsAdmin.banners.promo')}</div>
            <div className="flex items-center gap-2">
              <Badge tone={draft.promoEnabled ? 'green' : 'slate'}>
                {draft.promoEnabled ? t('cmsAdmin.banners.shown') : t('cmsAdmin.banners.hidden')}
              </Badge>
              <Toggle
                on={draft.promoEnabled}
                onChange={(v) => set({ promoEnabled: v })}
                label={t('cmsAdmin.banners.promo')}
                disabled={save.isPending}
              />
            </div>
          </div>
          <div className="space-y-3">
            <Field label={t('cmsAdmin.banners.promoTitle')} hint={t('cmsAdmin.banners.placeholder')} {...copy('promoTitle')} />
            <Field label={t('cmsAdmin.banners.promoBody')} hint={t('cmsAdmin.banners.placeholder')} {...copy('promoBody')} />
            <Field label={t('cmsAdmin.banners.promoCta')} hint={t('cmsAdmin.banners.placeholder')} {...copy('promoCta')} />
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-ink">{t('cmsAdmin.banners.hero')}</div>
            <div className="flex items-center gap-2">
              <Badge tone={draft.heroEnabled ? 'green' : 'slate'}>
                {draft.heroEnabled ? t('cmsAdmin.banners.shown') : t('cmsAdmin.banners.hidden')}
              </Badge>
              <Toggle
                on={draft.heroEnabled}
                onChange={(v) => set({ heroEnabled: v })}
                label={t('cmsAdmin.banners.hero')}
                disabled={save.isPending}
              />
            </div>
          </div>
          <div className="space-y-3">
            <Field label={t('cmsAdmin.banners.heroTag')} hint={t('cmsAdmin.banners.placeholder')} {...copy('heroTag')} />
            <Field label={t('cmsAdmin.banners.heroTitle')} hint={t('cmsAdmin.banners.placeholder')} {...copy('heroTitle')} />
            <Field label={t('cmsAdmin.banners.heroCta')} hint={t('cmsAdmin.banners.placeholder')} {...copy('heroCta')} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={submit} disabled={save.isPending}>
          {t('common:save')}
        </Button>
        <span className="text-xs text-ink-soft">{t('cmsAdmin.banners.clearHint')}</span>
      </div>
    </Card>
  );
}

/** Publish / unpublish the public marketing & legal pages. */
export function CmsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: pages = [], isLoading } = useQuery<ApiCmsPage[]>({
    queryKey: ['admin-cms'],
    queryFn: () => api.admin.cms(),
    retry: 1,
  });
  const toggle = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) => api.admin.updateCmsPage(id, { published }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-cms'] }),
  });

  return (
    <div>
      <PageHeader
        title={t('nav.cms')}
        subtitle={t('cmsAdmin.sub')}
        action={<Badge tone="green">{t('roleReq.liveApi')}</Badge>}
      />
      {isLoading ? (
        <p className="text-ink-soft">{t('common:loading')}</p>
      ) : (
        <Card padded={false} className="divide-y divide-surface-border">
          {pages.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <div className="text-sm font-semibold text-ink">{p.title}</div>
                <div className="text-xs text-ink-soft">/{p.slug}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={p.published ? 'green' : 'slate'}>{p.published ? t('cmsAdmin.published') : t('cmsAdmin.draft')}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ id: p.id, published: !p.published })}
                >
                  {p.published ? t('cmsAdmin.unpublish') : t('cmsAdmin.publish')}
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
      <BannersCard />
    </div>
  );
}
