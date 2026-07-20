import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card } from '@agrotraders/ui';
import type { ApiCmsPage } from '@agrotraders/api-client';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { useI18n } from '../i18n';

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
    </div>
  );
}
