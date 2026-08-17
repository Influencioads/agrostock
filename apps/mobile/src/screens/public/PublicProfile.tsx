import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { useCurrency } from '../../currency/CurrencyContext';
import { Badge, Button, Card, Loading, Row, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';
import { HireModal, type HireTarget } from '../components/HireModal';
import { rateLabel } from '../components/LabourOfferings';
import type { RootStackParamList } from '../../navigation/types';
import { forwardChevron } from '../../lib/rtl';
import { hireTargetForRoles, isServiceRole, servicePriceLabel, unitSuffix } from '@agrotraders/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'PublicProfile'>;

/** Public profile — contact details are masked by the API; users chat instead. */
export function PublicProfile() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { t } = useI18n();
  const { user: me } = useAuth();
  const { fmtPrice, fmtCents } = useCurrency();
  const [hire, setHire] = useState<HireTarget | null>(null);

  const { data: p, isLoading } = useQuery({
    queryKey: ['public-profile', params.userId],
    queryFn: () => api.directory.profile(params.userId),
  });

  const profileRoles = p ? [p.role, ...(p.roles ?? [])] : [];

  // Service-provider extras. Both endpoints 404 for a user who is not a LISTED
  // provider, so they are only asked for once the roles say it is worth asking —
  // and a 404 on either still leaves the rest of the profile rendering.
  const isProvider = profileRoles.some(isServiceRole);
  const { data: provider } = useQuery({
    queryKey: ['service-provider', params.userId],
    queryFn: () => api.services.provider(params.userId),
    enabled: isProvider,
    retry: false,
  });
  const { data: providerServices = [] } = useQuery({
    queryKey: ['service-provider-services', params.userId],
    queryFn: () => api.services.providerServices(params.userId),
    enabled: isProvider,
    retry: false,
  });

  // Labour. A loading company's crew roster is private, so what it publishes —
  // and what shows here — is which KINDS of worker it supplies, and the rates.
  const suppliesLabour = profileRoles.some((r) => r === 'loaderco' || r === 'workerco' || r === 'worker');
  const { data: offerings = [] } = useQuery({
    queryKey: ['labour-offerings', params.userId],
    queryFn: () => api.labour.offerings(params.userId),
    enabled: suppliesLabour,
    retry: false,
  });

  if (isLoading || !p) return <View style={{ flex: 1, backgroundColor: C.bg }}><Loading label={t('compX.profile.loading')} /></View>;

  const roles = Array.from(new Set(profileRoles));
  // Shared with the directory and with web — this chain had drifted three ways,
  // and `workerco` was missing from every copy of it.
  const hireType: HireTarget['targetType'] | null = hireTargetForRoles(roles);
  const isMe = me?.id === p.id;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 40 }}>
        <Card style={{ gap: 10 }}>
          <Row gap={12}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontSize: 32 }}>{p.profile?.avatarEmoji ?? '🏢'}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="h3">{p.name}</Txt>
              <Row gap={6} style={{ flexWrap: 'wrap', marginTop: 4 }}>
                {p.kycStatus === 'verified' ? <Badge label={t('pubX.dir.kycVerified')} tone="green" /> : null}
                {roles.map((r) => <Badge key={r} label={t(`enums:role.${r}`)} tone="slate" />)}
              </Row>
            </View>
          </Row>
          {p.profile?.bio ? <Txt variant="muted">{p.profile.bio}</Txt> : null}
          <View style={{ gap: 6 }}>
            {(p.profile?.location || p.country) ? (
              <Row gap={6}><Ionicons name="location-outline" size={15} color={C.inkSoft} /><Txt variant="muted">{p.profile?.location ?? p.country}</Txt></Row>
            ) : null}
            {p.profile?.availableFrom && p.profile?.availableTo ? (
              <Row gap={6}><Ionicons name="time-outline" size={15} color={C.inkSoft} /><Txt variant="muted">{t('pubX.profile.availableRange', { from: p.profile.availableFrom, to: p.profile.availableTo })} {p.profile.timezone ?? ''}</Txt></Row>
            ) : null}
            {p.profile?.market ? (
              <Row gap={6}><Ionicons name="storefront-outline" size={15} color={C.inkSoft} /><Txt variant="muted">{p.profile.market.flag} {p.profile.market.name}</Txt></Row>
            ) : null}
            {p.contactMasked?.phone ? (
              <Row gap={6}><Ionicons name="call-outline" size={15} color={C.inkSoft} /><Txt variant="muted">{p.contactMasked.phone} · {t('pubX.profile.privateTag')}</Txt></Row>
            ) : null}
          </View>
          {!isMe && (
            <Row gap={8} style={{ marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Button title={t('pubX.dir.chat')} icon="chatbubbles-outline" full onPress={() => nav.navigate('Community', { dmUserId: p.id, dmName: p.name })} />
              </View>
              {hireType ? (
                <View style={{ flex: 1 }}>
                  <Button
                    title={t('pubX.dir.hire')}
                    variant="outline"
                    icon="checkmark"
                    full
                    onPress={() => setHire({ targetType: hireType, targetUserId: p.id, workerId: p.workerProfile?.id, name: p.name })}
                  />
                </View>
              ) : null}
            </Row>
          )}
        </Card>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface }}>
          <Ionicons name="shield-checkmark" size={20} color={C.dark} />
          <Txt variant="small" style={{ flex: 1 }}>{t('pubX.profile.privacyNote')}</Txt>
        </Card>

        {/* labour — what kinds of worker this account supplies, and the rates.
            For a loading company this REPLACED a published list of its individual
            staff: the crew count is the capacity signal, the people are the
            company's own and are never named here. */}
        {offerings.length > 0 && (
          <View style={{ gap: 10 }}>
            <Txt variant="h3">{t('labour.types')}</Txt>
            {roles.includes('loaderco') || roles.includes('workerco') ? (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface }}>
                <Ionicons name="shield-checkmark" size={18} color={C.dark} />
                <Txt variant="small" style={{ flex: 1 }}>{t('labour.rosterPrivate')}</Txt>
              </Card>
            ) : null}
            {offerings.map((o) => (
              <Card key={o.id} style={{ gap: 4 }}>
                <Row gap={6} style={{ flexWrap: 'wrap' }}>
                  <Txt variant="title" style={{ flex: 1 }}>{o.workerType.name}</Txt>
                  {o.isNegotiable ? <Badge label={t('labour.negotiable')} tone="mango" /> : null}
                </Row>
                <Txt variant="title">{rateLabel(o, t, fmtCents)}</Txt>
                <Txt variant="muted">
                  {[
                    o.headcount != null ? t('labour.upTo', { count: o.headcount }) : null,
                    o.minHours != null ? t('labour.minHoursShort', { count: o.minHours }) : null,
                  ].filter(Boolean).join(' · ')}
                </Txt>
                {o.notes ? <Txt variant="small">{o.notes}</Txt> : null}
              </Card>
            ))}
          </View>
        )}

        {/* service provider — the business card, then every service it prices.
            A card in the directory truncates all of this; here it is in full. */}
        {provider && (
          <View style={{ gap: 10 }}>
            <Txt variant="h3">{t('service.about')}</Txt>
            <Card style={{ gap: 10 }}>
              {provider.blurb ? <Txt variant="muted">{provider.blurb}</Txt> : null}
              {provider.categories.length > 0 ? (
                <Row gap={6} style={{ flexWrap: 'wrap' }}>
                  {provider.categories.map((c) => (
                    <Badge key={c} label={t(`enums:serviceCategory.${c}`, { defaultValue: c })} tone="green" />
                  ))}
                </Row>
              ) : null}
              <Field label={t('service.basedIn')} value={provider.country} />
              <Field label={t('service.cities')} value={provider.citiesServed.join(', ')} />
              <Field label={t('service.countriesServed')} value={provider.countriesServed.join(', ')} />
              <Field label={t('service.productsHandled')} value={provider.productsHandled.join(', ')} />
              <Field label={t('service.capacity')} value={provider.capacityPerDay} />
              <Field
                label={t('service.turnaround')}
                value={provider.turnaroundDays != null ? t('service.turnaroundDays', { count: provider.turnaroundDays }) : null}
              />
              <Field label={t('service.minOrder')} value={provider.minOrderQty} />
              <Field label={t('service.certifications')} value={provider.certifications.join(', ')} />
              <Field
                label={t('service.international')}
                value={provider.acceptsInternationalOrders ? t('common:yes') : t('common:no')}
              />
              <Field
                label={t('service.pricing')}
                value={
                  provider.priceFromCents != null && provider.pricingBasis
                    ? t('service.priceFrom', {
                        amount: fmtCents(provider.priceFromCents),
                        basis: t(`enums:servicePricingBasis.${provider.pricingBasis}`, { defaultValue: provider.pricingBasis }),
                      })
                    : t('service.onEnquiry')
                }
              />
            </Card>

            <Txt variant="h3">{t('service.priceList', { count: providerServices.length })}</Txt>
            {providerServices.length === 0 ? (
              <Card><Txt variant="muted">{t('service.noPriceList')}</Txt></Card>
            ) : (
              providerServices.map((s) => (
                <Card key={s.id} style={{ gap: 4 }}>
                  <Row gap={6} style={{ flexWrap: 'wrap' }}>
                    <Txt variant="title" style={{ flex: 1 }}>{s.serviceNode.name ?? s.serviceNode.nameEn}</Txt>
                    {s.isNegotiable ? <Badge label={t('service.negotiable')} tone="mango" /> : null}
                  </Row>
                  <Txt variant="title">{servicePriceLabel(s, t, fmtCents)}</Txt>
                  <Txt variant="muted">
                    {[
                      s.minOrderQty != null ? `${t('service.minOrder')}: ${s.minOrderQty}${s.minOrderUnit ? ` ${s.minOrderUnit}` : ''}` : null,
                      s.leadTimeDays != null ? t('service.turnaroundDays', { count: s.leadTimeDays }) : null,
                    ].filter(Boolean).join(' · ')}
                  </Txt>
                  {s.notes ? <Txt variant="small">{s.notes}</Txt> : null}
                  {s.capacityNote ? <Txt variant="small">{s.capacityNote}</Txt> : null}
                </Card>
              ))
            )}
          </View>
        )}

        {(p.products?.length ?? 0) > 0 && (
          <View style={{ gap: 10 }}>
            <Txt variant="h3">{t('pubX.profile.listings')}</Txt>
            {p.products!.map((prod) => (
              <Card key={prod.id} onPress={() => nav.navigate('ProductDetail', { slug: prod.slug })}>
                <Row gap={10}>
                  <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt style={{ fontSize: 20 }}>{prod.emoji ?? '🌾'}</Txt>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="title" numberOfLines={1}>{prod.name}</Txt>
                    <Txt variant="muted">{fmtPrice({ price: prod.price, priceCents: prod.priceCents })}{unitSuffix(prod.unit, t)}</Txt>
                  </View>
                  <Ionicons name={forwardChevron()} size={16} color={C.inkSoft} />
                </Row>
              </Card>
            ))}
          </View>
        )}

        {(p.routes?.length ?? 0) > 0 && (
          <View style={{ gap: 10 }}>
            <Txt variant="h3">{t('pubX.profile.activeRoutes')}</Txt>
            {p.routes!.map((r) => (
              <Card key={r.name}>
                <Row gap={10}>
                  <Ionicons name="car-outline" size={18} color={C.green} />
                  <Txt variant="title" style={{ flex: 1 }}>{r.name}</Txt>
                  {r.distanceKm ? <Txt variant="muted">{r.distanceKm} km</Txt> : null}
                </Row>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
      {hire && <HireModal target={hire} onClose={() => setHire(null)} />}
    </View>
  );
}

/** One label/value row, dropped entirely when the provider left the field blank. */
function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null;
  return (
    <Row gap={8} style={{ alignItems: 'flex-start' }}>
      <Txt variant="muted" style={{ flex: 1 }}>{label}</Txt>
      <Txt style={{ flex: 1, textAlign: 'right' }}>{value}</Txt>
    </Row>
  );
}
