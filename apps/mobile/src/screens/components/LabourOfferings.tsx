import { useMemo, useState } from 'react';
import { ScrollView, View, Pressable, TextInput } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LABOUR_ON_REQUEST,
  LABOUR_RATE_BASES,
  WORKER_TYPE_GROUPS,
  type ApiWorkerOffering,
  type ApiWorkerType,
  type LabourRateBasis,
  type WorkerTypeGroup,
} from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency } from '../../currency/CurrencyContext';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, EmptyState, Row, SkeletonRows, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';

/**
 * "What kinds of worker do you supply, and what do you charge?" — mobile.
 *
 * Mirrors the web console section: one screen for a loading company and an
 * independent worker alike, because they differ only in `headcount`. Publishing
 * here is what puts either into the public directory; a company's actual crew
 * roster stays on the private Workers screen and is never listed publicly.
 */

const BLANK = { rateBasis: 'per_hour' as LabourRateBasis, rateMin: '', rateMax: '', headcount: '', minHours: '', isNegotiable: false };

export function LabourOfferings() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { fmtCents } = useCurrency();
  const qc = useQueryClient();
  const myRoles = [user?.role, ...(user?.roles ?? [])];
  const isCompany = myRoles.includes('loaderco') || myRoles.includes('workerco');

  const [form, setForm] = useState(BLANK);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // Scoped to what this account may supply — a loading company's picker must
  // not offer packing types the write path would then refuse.
  const { data: types = [] } = useQuery<ApiWorkerType[]>({
    queryKey: ['labour-available-types'],
    queryFn: () => api.labour.availableTypes(),
  });
  const { data: mine = [], isLoading } = useQuery<ApiWorkerOffering[]>({
    queryKey: ['labour-mine'],
    queryFn: () => api.labour.mine(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['labour-mine'] });
    qc.invalidateQueries({ queryKey: ['labour-types'] });
  };

  /** Minor units, or undefined for a blank field — never 0, which is a real rate. */
  const cents = (v: string) => (v.trim() === '' ? undefined : Math.round(Number(v) * 100));
  const int = (v: string) => (v.trim() === '' ? undefined : Number(v));

  const add = useMutation({
    mutationFn: () =>
      api.labour.bulkAdd({
        workerTypeIds: [...picked],
        rateBasis: form.rateBasis,
        rateMinCents: form.rateBasis === LABOUR_ON_REQUEST ? undefined : cents(form.rateMin),
        rateMaxCents: form.rateBasis === LABOUR_ON_REQUEST ? undefined : cents(form.rateMax),
        headcount: int(form.headcount),
        minHours: int(form.minHours),
        isNegotiable: form.isNegotiable,
      }),
    onSuccess: () => { setPicked(new Set()); setForm(BLANK); invalidate(); },
  });
  const remove = useMutation({ mutationFn: (id: string) => api.labour.remove(id), onSuccess: invalidate });
  const toggleActive = useMutation({
    mutationFn: (o: ApiWorkerOffering) => api.labour.update(o.id, { isActive: !o.isActive }),
    onSuccess: invalidate,
  });

  const priced = useMemo(() => new Set(mine.map((o) => o.workerTypeId)), [mine]);
  const byGroup = useMemo(() => {
    const map = new Map<WorkerTypeGroup, ApiWorkerType[]>();
    for (const type of types) {
      if (!map.has(type.group)) map.set(type.group, []);
      map.get(type.group)!.push(type);
    }
    return map;
  }, [types]);

  const field = (label: string, key: 'rateMin' | 'rateMax' | 'headcount' | 'minHours') => (
    <View style={{ flex: 1 }}>
      <Txt variant="muted" style={{ marginBottom: 4 }}>{label}</Txt>
      <TextInput
        value={form[key]}
        onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
        keyboardType="decimal-pad"
        style={{ borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: C.ink }}
      />
    </View>
  );

  const errText = (add.error as { response?: { data?: { message?: string } } })?.response?.data?.message;

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: 14 }}>
      <View>
        <Txt variant="title">{t('labour.title')}</Txt>
        <Txt variant="muted">{isCompany ? t('labour.subCompany') : t('labour.subWorker')}</Txt>
      </View>

      <Card style={{ gap: 10 }}>
        <Txt variant="title">{t('labour.published', { count: mine.length })}</Txt>
        {isLoading ? (
          <SkeletonRows />
        ) : mine.length === 0 ? (
          <EmptyState icon="pricetags-outline" title={t('labour.noneYet')} />
        ) : (
          mine.map((o) => (
            <View key={o.id} style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, gap: 4 }}>
              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                <Txt style={{ flex: 1 }}>{o.workerType.name}</Txt>
                {!o.isActive ? <Badge label={t('labour.hidden')} tone="slate" /> : null}
                {o.isNegotiable ? <Badge label={t('labour.negotiable')} tone="mango" /> : null}
              </Row>
              <Txt variant="muted">
                {rateLabel(o, t, fmtCents)}
                {o.headcount != null ? ` · ${t('labour.upTo', { count: o.headcount })}` : ''}
                {o.minHours != null ? ` · ${t('labour.minHoursShort', { count: o.minHours })}` : ''}
              </Txt>
              <Row gap={8}>
                <Button title={t(o.isActive ? 'labour.hide' : 'labour.show')} variant="outline" onPress={() => toggleActive.mutate(o)} />
                <Button title={t('labour.remove')} variant="ghost" onPress={() => remove.mutate(o.id)} />
              </Row>
            </View>
          ))
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt variant="title">{t('labour.addTitle')}</Txt>

        {picked.size > 0 ? (
          <View style={{ gap: 10, backgroundColor: C.surface, borderRadius: 12, padding: 10 }}>
            <Txt variant="muted">{t('labour.selected', { count: picked.size })}</Txt>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {LABOUR_RATE_BASES.map((b) => (
                <Pressable
                  key={b}
                  onPress={() => setForm((f) => ({ ...f, rateBasis: b }))}
                  style={{
                    borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
                    borderColor: form.rateBasis === b ? C.green : C.border,
                    backgroundColor: form.rateBasis === b ? C.surface : 'transparent',
                  }}
                >
                  <Txt variant={form.rateBasis === b ? 'body' : 'muted'}>
                    {t(`enums:labourRateBasis.${b}`, { defaultValue: b })}
                  </Txt>
                </Pressable>
              ))}
            </Row>
            {/* An "on request" row carries no figure at all, so the rate boxes go
                away rather than sitting there for a value the server refuses. */}
            {form.rateBasis !== LABOUR_ON_REQUEST ? (
              <Row gap={8}>{field(t('labour.rateMin'), 'rateMin')}{field(t('labour.rateMax'), 'rateMax')}</Row>
            ) : null}
            <Row gap={8}>
              {isCompany ? field(t('labour.headcount'), 'headcount') : null}
              {field(t('labour.minHours'), 'minHours')}
            </Row>
            <Pressable onPress={() => setForm((f) => ({ ...f, isNegotiable: !f.isNegotiable }))}>
              <Row gap={8}>
                <Badge label={form.isNegotiable ? '☑' : '☐'} tone="slate" />
                <Txt variant="muted">{t('labour.negotiable')}</Txt>
              </Row>
            </Pressable>
            {errText ? <Txt style={{ color: C.error }}>{errText}</Txt> : null}
            <Button
              title={add.isPending ? t('labour.saving') : t('labour.addSelected')}
              onPress={() => add.mutate()}
              disabled={add.isPending}
            />
          </View>
        ) : null}

        {WORKER_TYPE_GROUPS.filter((g) => byGroup.has(g)).map((group) => (
          <View key={group} style={{ gap: 6 }}>
            <Txt variant="muted">{t(`enums:workerTypeGroup.${group}`, { defaultValue: group })}</Txt>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {byGroup.get(group)!.map((type) => {
                const already = priced.has(type.id);
                const on = picked.has(type.id);
                return (
                  <Pressable
                    key={type.id}
                    disabled={already}
                    onPress={() =>
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (next.has(type.id)) next.delete(type.id);
                        else next.add(type.id);
                        return next;
                      })
                    }
                    style={{
                      borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
                      opacity: already ? 0.5 : 1,
                      borderColor: on ? C.green : C.border,
                      backgroundColor: on ? C.surface : 'transparent',
                    }}
                  >
                    <Txt variant={on ? 'body' : 'muted'}>{type.name}{already ? ' ✓' : ''}</Txt>
                  </Pressable>
                );
              })}
            </Row>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

/**
 * A rate reads as one figure, a range, or "on request".
 *
 * `fmt` is injected so callers inside the React tree can hand over
 * `useCurrency().fmtCents` and honour the reader's display currency; the default
 * is only for the rare caller that has no context to hand.
 */
export function rateLabel(
  o: Pick<ApiWorkerOffering, 'rateBasis' | 'rateMinCents' | 'rateMaxCents'>,
  t: (k: string, o?: Record<string, unknown>) => string,
  fmt: (c: number | null | undefined) => string = (c) => (c == null ? '—' : `$${(c / 100).toFixed(2)}`),
): string {
  if (o.rateBasis === LABOUR_ON_REQUEST) return t('labour.onRequest');
  const { rateMinCents: min, rateMaxCents: max } = o;
  if (min == null && max == null) return t('labour.onRequest');
  const basis = t(`enums:labourRateBasis.${o.rateBasis}`, { defaultValue: o.rateBasis });
  const amount = min != null && max != null && max !== min ? `${fmt(min)} – ${fmt(max)}` : fmt(min ?? max);
  return `${amount} ${basis}`;
}
