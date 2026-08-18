import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiHireTargetType } from '@agrotraders/api-client';
import {
  hireBlockForService,
  hireFieldsForService,
  isFieldVisible,
  type ServiceHireField,
} from '@agrotraders/types';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Card, Chip, ChipSelect, Input, Row, Txt } from '../../ui';
import { C, radius, space } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { useI18n } from '../../i18n';
import { CityField } from './GeoFields';
import { PickerField } from './PickerSheet';

export interface HireTarget {
  targetType: ApiHireTargetType;
  targetUserId: string;
  workerId?: string;
  name: string;
}

const BLANK = { message: '', fromCity: '', toCity: '', cargo: '', location: '', workersNeeded: '1', budget: '' };

type Answers = Record<string, string | string[]>;

/**
 * One question from the shared spec, in the mobile kit.
 *
 * Labels resolve block-first (`hireQ.<block>.<key>`) then generic, exactly as on
 * web — `location` means "where the goods are" in a processing hire and
 * "warehouse city" in a storage one, and one label for both misdirects the job.
 * Dates are plain text (`YYYY-MM-DD`): this app has no native date input, which
 * is why the transporter form never had a "needed by" field either.
 */
function SpecField({
  field,
  block,
  value,
  onChange,
}: {
  field: ServiceHireField;
  block: string | null;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}) {
  const { t } = useI18n();
  const label = t(`hireQ.${block}.${field.key}`, { defaultValue: t(`hireQ.${field.key}`) }) + (field.required ? ' *' : '');
  // Units already have a translated catalog; every other option set is `hireQ.opt`.
  const optLabel = (o: string) =>
    field.key === 'qtyUnit'
      ? t(`enums:unit.${o}`, { defaultValue: o })
      : t(`hireQ.opt.${field.key}.${o}`, { defaultValue: o });
  const str = typeof value === 'string' ? value : '';

  if (field.type === 'city') return <CityField label={label} value={str} onChange={(v) => onChange(v)} />;

  if (field.type === 'select') {
    return (
      <ChipSelect
        label={label}
        value={str}
        onChange={(id) => onChange(id === str ? '' : id)}
        options={(field.options ?? []).map((o) => ({ id: o, label: optLabel(o) }))}
      />
    );
  }

  if (field.type === 'multiselect') {
    const picked = Array.isArray(value) ? value : [];
    return (
      <View style={{ gap: 6 }}>
        <Txt variant="label">{label}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(field.options ?? []).map((o) => (
            <Chip
              key={o}
              label={optLabel(o)}
              active={picked.includes(o)}
              onPress={() => onChange(picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o])}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <Input
      label={label}
      value={str}
      onChangeText={(v) => onChange(v)}
      multiline={field.type === 'textarea'}
      keyboardType={field.type === 'number' ? 'numeric' : 'default'}
      placeholder={field.type === 'date' ? 'YYYY-MM-DD' : undefined}
    />
  );
}

/** Bottom-sheet style direct-hire form → POST /hires. */
/**
 * A service-provider hire asks the question set for the service being bought
 * (`hireFieldsForService`) and asks NO budget: a service is quoted, not bid on,
 * and the public rate is an estimate the provider revises once they see the real
 * location and volume. Every other target type keeps its budget + escrow flow.
 *
 * Pass `orderId` to source logistics from inside one of the seller's orders — on
 * accept the minted Trip attaches back to the order so dispatch/OTP keeps working.
 * Pass `initial` (from `orderLogistics(order)`) so the route and cargo arrive
 * filled in; the server applies the same fallbacks, so these are editable.
 */
export function HireModal({
  target,
  orderId,
  initial,
  onClose,
}: {
  target: HireTarget;
  orderId?: string;
  initial?: Partial<typeof BLANK>;
  onClose: () => void;
}) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useI18n();
  const { user } = useAuth();
  const [f, setF] = useState({ ...BLANK, ...initial });
  const [ans, setAns] = useState<Answers>({});
  const [serviceNodeId, setServiceNodeId] = useState('');
  const [missing, setMissing] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const isTransport = target.targetType === 'transporter';
  const isService = target.targetType === 'service_provider';

  // Only the leaves this provider actually prices.
  const services = useQuery({
    queryKey: ['provider-services', target.targetUserId],
    queryFn: () => api.services.providerServices(target.targetUserId),
    enabled: isService,
  });
  const picked = services.data?.find((s) => s.serviceNodeId === serviceNodeId);
  const slug = picked?.serviceNode.slug ?? null;
  const block = hireBlockForService(slug);
  const fields = useMemo(() => (isService ? hireFieldsForService(slug) : []), [isService, slug]);
  const visible = fields.filter((x) => isFieldVisible(x, ans));

  const send = useMutation({
    mutationFn: () => {
      // `col` fields are real HireRequest columns; everything else is `details`.
      const cols: Record<string, string> = {};
      const details: Record<string, string | number | string[]> = {};
      for (const x of visible) {
        const v = ans[x.key];
        if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) continue;
        if (x.col) cols[x.key] = String(v);
        else details[x.key] = x.type === 'number' ? Number(v) : v;
      }
      return api.hires.create({
        targetType: target.targetType,
        targetUserId: target.targetUserId,
        workerId: target.workerId,
        ...(isService
          ? {
              serviceNodeId: serviceNodeId || undefined,
              details: Object.keys(details).length ? details : undefined,
              cargo: cols.cargo || undefined,
              location: cols.location || undefined,
              fromCity: cols.fromCity || undefined,
              toCity: cols.toCity || undefined,
              message: cols.message || undefined,
              // Typed by hand here, so a half-entered date must never 400 the send.
              neededDate: cols.neededDate && !Number.isNaN(Date.parse(cols.neededDate))
                ? new Date(cols.neededDate).toISOString()
                : undefined,
            }
          : {
              message: f.message || undefined,
              fromCity: f.fromCity || undefined,
              toCity: f.toCity || undefined,
              cargo: f.cargo || undefined,
              location: f.location || undefined,
              workersNeeded: Number(f.workersNeeded) || undefined,
              budgetCents: f.budget ? Math.round(Number(f.budget) * 100) : undefined,
            }),
        orderId,
      });
    },
    onSuccess: (h) => setDone(h.reference),
  });

  const submit = () => {
    const gap = visible.find((x) => {
      if (!x.required) return false;
      const v = ans[x.key];
      return v === undefined || v === '' || (Array.isArray(v) && !v.length);
    });
    if (gap) {
      setMissing(t('hireQ.requiredMissing', { label: t(`hireQ.${block}.${gap.key}`, { defaultValue: t(`hireQ.${gap.key}`) }) }));
      return;
    }
    setMissing(null);
    send.mutate();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '85%' }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">{t('compX.hire.title.' + target.targetType)}</Txt>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={C.inkSoft} />
            </Pressable>
          </Row>
          <Txt variant="muted">{t('compX.hire.instant', { name: target.name })}</Txt>

          {done ? (
            <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
              <Txt style={{ fontSize: 34 }}>✅</Txt>
              <Txt variant="title">{t('compX.hire.requestSent', { ref: done })}</Txt>
              <Txt variant="muted" style={{ textAlign: 'center' }}>{t('compX.hire.trackHint')}</Txt>
              <Button title={t('compX.hire.done')} full onPress={onClose} />
            </Card>
          ) : !user ? (
            <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 20 }}>
              <Txt variant="muted">{t('compX.hire.signInPrompt')}</Txt>
              <Button title={t('compX.hire.signIn')} onPress={() => { onClose(); nav.navigate('SignIn', {}); }} />
            </Card>
          ) : isService ? (
            <>
              {/* No budget field: a service is quoted, not bid on. */}
              <Card style={{ paddingVertical: 12 }}>
                <Txt variant="small" color={C.inkSoft}>{t('hireQ.estimateNote')}</Txt>
              </Card>
              {services.data?.length ? (
                <PickerField
                  label={t('hireQ.service')}
                  placeholder={t('hireQ.servicePick')}
                  value={serviceNodeId}
                  displayValue={picked ? picked.serviceNode.name ?? picked.serviceNode.nameEn : undefined}
                  onChange={setServiceNodeId}
                  options={services.data.map((s) => ({
                    value: s.serviceNodeId,
                    label: s.serviceNode.name ?? s.serviceNode.nameEn,
                  }))}
                />
              ) : services.isLoading ? null : (
                <Txt variant="small" color={C.inkSoft}>{t('hireQ.noServices')}</Txt>
              )}
              {visible.map((x) => (
                <SpecField
                  key={x.key}
                  field={x}
                  block={block}
                  value={ans[x.key]}
                  onChange={(v) => setAns((p) => ({ ...p, [x.key]: v }))}
                />
              ))}
              {missing || send.isError ? (
                <Txt color={C.error} variant="small">
                  {missing ?? (send.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('compX.hire.sendError')}
                </Txt>
              ) : null}
              <Button title={send.isPending ? t('compX.hire.sending') : t('compX.hire.send')} icon="checkmark" full loading={send.isPending} onPress={submit} />
            </>
          ) : (
            <>
              {isTransport ? (
                <>
                  <Row gap={10}>
                    {/* No country on a hire — the pickers search every country. */}
                    <View style={{ flex: 1 }}><CityField label={t('compX.hire.from')} placeholder={t('pubX.ph.cityMundra')} value={f.fromCity} onChange={set('fromCity')} /></View>
                    <View style={{ flex: 1 }}><CityField label={t('compX.hire.to')} placeholder={t('pubX.ph.cityDubai')} value={f.toCity} onChange={set('toCity')} /></View>
                  </Row>
                  <Input label={t('compX.hire.cargo')} placeholder={t('pubX.ph.cargoBasmati50')} value={f.cargo} onChangeText={set('cargo')} />
                </>
              ) : (
                <>
                  <Input label={t('compX.hire.location')} placeholder={t('pubX.ph.locationTerminal')} value={f.location} onChangeText={set('location')} />
                  {(target.targetType === 'loaderco' || target.targetType === 'workerco') && (
                    <Input label={t('compX.hire.workersNeeded')} keyboardType="numeric" value={f.workersNeeded} onChangeText={set('workersNeeded')} />
                  )}
                </>
              )}
              <Input label={t('compX.hire.budget')} keyboardType="numeric" placeholder="4200" value={f.budget} onChangeText={set('budget')} />
              <Input label={t('compX.hire.message')} placeholder={t('compX.hire.messagePlaceholder')} value={f.message} onChangeText={set('message')} multiline />
              {send.isError ? (
                <Txt color={C.error} variant="small">
                  {(send.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('compX.hire.sendError')}
                </Txt>
              ) : null}
              <Button title={send.isPending ? t('compX.hire.sending') : t('compX.hire.send')} icon="checkmark" full loading={send.isPending} onPress={() => send.mutate()} />
            </>
          )}
          <View style={{ height: radius.xl }} />
        </ScrollView>
      </View>
    </Modal>
  );
}
