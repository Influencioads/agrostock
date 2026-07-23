import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { Socket } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useChatSocket } from '../../chat/useChatSocket';
import { useChatStrings } from '../../chat/strings';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, EmptyState, Input, Row, SkeletonRows, Txt } from '../../ui';
import { C, radius, space, type } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { backChevron } from '../../lib/rtl';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = Record<string, any>;
type Tab = 'feed' | 'groups' | 'requirements' | 'mychats';
type S = Record<string, string>;

const baseLang = (tag?: string | null) => (tag ? tag.split('-')[0].toLowerCase() : '');

/**
 * A message arriving over the socket carries its original text + `sourceLang`.
 * When it isn't already in the viewer's language, fetch the cached/live
 * translation and patch it in (read endpoints pre-translate, so this only
 * fires for brand-new realtime messages).
 */
function translateIncoming(
  m: AnyRec,
  lang: string,
  setMessages: React.Dispatch<React.SetStateAction<AnyRec[]>>,
) {
  if (m.originalBody || !m.sourceLang || baseLang(m.sourceLang) === baseLang(lang)) return;
  api.community
    .translateMessage(String(m.id))
    .then((tr) =>
      setMessages((prev) =>
        prev.map((x) =>
          x.id === m.id ? { ...x, body: tr.body, originalBody: tr.originalBody, sourceLang: tr.sourceLang } : x,
        ),
      ),
    )
    .catch(() => {});
}

/** Message text with a "show original / show translation" toggle when translated. */
function BubbleBody({ m, mine }: { m: AnyRec; mine: boolean }) {
  const { t } = useI18n();
  const [showOriginal, setShowOriginal] = useState(false);
  const hasTranslation = !!m.originalBody && m.originalBody !== m.body;
  return (
    <>
      <Txt color={mine ? C.white : C.ink}>{showOriginal && hasTranslation ? m.originalBody : m.body}</Txt>
      {hasTranslation ? (
        <Pressable onPress={() => setShowOriginal((v) => !v)} hitSlop={6}>
          <Txt style={{ fontSize: 11, marginTop: 3, fontWeight: '600', color: mine ? '#DCF1E4' : C.inkSoft }}>
            {showOriginal ? t('compX.community.showTranslation') : t('compX.community.showOriginal')}
          </Txt>
        </Pressable>
      ) : null}
    </>
  );
}

/* ── Chat room (realtime) ─────────────────────────────────────────── */
function Room({ group, socket, onBack, s }: { group: AnyRec; socket: Socket | null; onBack: () => void; s: S }) {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [displayGroup, setDisplayGroup] = useState<AnyRec>(group);
  const [messages, setMessages] = useState<AnyRec[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList<AnyRec>>(null);

  useEffect(() => {
    let alive = true;
    setDisplayGroup(group);
    api.community.group(group.id).then((g) => alive && setDisplayGroup(g as AnyRec)).catch(() => {});
    api.community.groupMessages(group.id).then((m) => alive && setMessages((m as AnyRec[]) ?? []));
    return () => {
      alive = false;
    };
  }, [group, group.id, lang]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('group:join', { groupId: group.id });
    socket.emit('read', { groupId: group.id });
    const onNew = (m: AnyRec) => {
      if (m.groupId !== group.id) return;
      setMessages((prev) => {
        // Dedupe: replace optimistic (tempId) or skip if id already present.
        const withoutTemp = prev.filter((x) => x.id !== m.id && x.__tempId !== m.tempId);
        return [...withoutTemp, m];
      });
      translateIncoming(m, lang, setMessages);
    };
    const onTyping = (d: AnyRec) => {
      if (d.groupId !== group.id || d.userId === user?.id) return;
      setTyping(!!d.typing);
      if (d.typing) setTimeout(() => setTyping(false), 2500);
    };
    socket.on('message:new', onNew);
    socket.on('typing', onTyping);
    return () => {
      socket.emit('group:leave', { groupId: group.id });
      socket.off('message:new', onNew);
      socket.off('typing', onTyping);
    };
  }, [socket, group.id, user?.id, lang]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    const tempId = 'tmp-' + Math.random().toString(36).slice(2);
    setMessages((prev) => [
      ...prev,
      { id: tempId, __tempId: tempId, body, sender: { id: user?.id, name: user?.name ?? s.you }, createdAt: new Date().toISOString() },
    ]);
    if (socket) socket.emit('message:send', { tempId, groupId: group.id, body });
    else api.community.send({ groupId: group.id, body });
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Row style={{ paddingHorizontal: space.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white }}>
        <Pressable onPress={onBack} hitSlop={10} style={{ marginEnd: 8 }}>
          <Ionicons name={backChevron()} size={22} color={C.ink} />
        </Pressable>
        <Txt variant="title" style={{ marginEnd: 6 }}>{group.emoji ?? '💬'}</Txt>
        <View style={{ flex: 1 }}>
          <Txt variant="title" numberOfLines={1}>{displayGroup.name}</Txt>
          {typing ? <Txt variant="muted">{s.typing}</Txt> : null}
        </View>
      </Row>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: space.lg, gap: 8, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<Txt variant="muted" style={{ textAlign: 'center', marginTop: 40 }}>{s.empty}</Txt>}
          renderItem={({ item: m }) => {
            const mine = m.sender?.id === user?.id;
            return (
              <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <View
                  style={{
                    maxWidth: '82%',
                    backgroundColor: mine ? C.green : C.white,
                    borderWidth: mine ? 0 : StyleSheet.hairlineWidth,
                    borderColor: C.border,
                    borderRadius: 18,
                    borderBottomRightRadius: mine ? 5 : 18,
                    borderBottomLeftRadius: mine ? 18 : 5,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  {!mine && <Text style={{ ...type.micro, color: C.green, marginBottom: 3 }}>{m.sender?.name}</Text>}
                  <BubbleBody m={m} mine={mine} />
                  {m.createdAt ? (
                    <Text style={{ ...type.caption, fontSize: 10.5, marginTop: 4, textAlign: 'right', color: mine ? 'rgba(255,255,255,0.7)' : C.inkMuted }}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          }}
        />

        {user ? (
          <Row style={{ paddingHorizontal: space.md, paddingVertical: space.sm, gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, backgroundColor: C.white }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="add" size={22} color={C.inkSoft} />
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 23, backgroundColor: C.page, paddingHorizontal: 16 }}>
              <TextInput
                value={text}
                onChangeText={(v) => {
                  setText(v);
                  socket?.emit('typing', { groupId: group.id, typing: true });
                }}
                placeholder={s.typeMessage}
                placeholderTextColor={C.inkMuted}
                style={{ flex: 1, ...type.body, fontSize: 15, color: C.ink, paddingVertical: 0 }}
                onSubmitEditing={send}
                returnKeyType="send"
              />
              <Ionicons name="mic-outline" size={19} color={C.inkMuted} />
            </View>
            <Pressable
              onPress={send}
              disabled={!text.trim()}
              style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: text.trim() ? C.green : C.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="send" size={18} color={C.white} />
            </Pressable>
          </Row>
        ) : (
          <View style={{ padding: space.lg, borderTopWidth: 1, borderTopColor: C.border }}>
            <Txt variant="muted" style={{ textAlign: 'center' }}>{s.signInToPost}</Txt>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── Direct message (1:1) room ────────────────────────────────────── */
function DmRoom({ peer, socket, onBack, s }: { peer: { userId: string; name: string }; socket: Socket | null; onBack: () => void; s: S }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [messages, setMessages] = useState<AnyRec[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<AnyRec>>(null);

  useEffect(() => {
    let alive = true;
    api.community
      .dm(peer.userId)
      .then((r) => {
        const res = r as { threadId: string; messages: AnyRec[] };
        if (!alive) return;
        setThreadId(res.threadId);
        setMessages(res.messages ?? []);
      })
      .catch(() => {});
    api.community.dmRead(peer.userId).catch(() => {});
    return () => {
      alive = false;
    };
  }, [peer.userId, lang]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('dm:open', { toUserId: peer.userId });
    const onNew = (m: AnyRec) => {
      if (threadId && m.threadId !== threadId) return;
      setMessages((prev) => {
        const withoutTemp = prev.filter((x) => x.id !== m.id && x.__tempId !== m.tempId);
        return [...withoutTemp, m];
      });
      translateIncoming(m, lang, setMessages);
      api.community.dmRead(peer.userId).catch(() => {});
    };
    socket.on('message:new', onNew);
    return () => {
      socket.off('message:new', onNew);
    };
  }, [socket, peer.userId, threadId, lang]);

  const send = () => {
    const body = text.trim();
    if (!body || !socket) return;
    const tempId = 'tmp-' + Math.random().toString(36).slice(2);
    setMessages((prev) => [
      ...prev,
      { id: tempId, __tempId: tempId, body, sender: { id: user?.id, name: user?.name ?? s.you }, createdAt: new Date().toISOString() },
    ]);
    socket.emit('message:send', { tempId, toUserId: peer.userId, body });
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Row style={{ paddingHorizontal: space.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white }}>
        <Pressable onPress={onBack} hitSlop={10} style={{ marginEnd: 8 }}>
          <Ionicons name={backChevron()} size={22} color={C.ink} />
        </Pressable>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', marginEnd: 8 }}>
          <Txt style={{ fontWeight: '800', color: C.dark }}>{peer.name.slice(0, 1)}</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="title" numberOfLines={1}>{peer.name}</Txt>
          <Txt variant="muted">{t('compX.community.dmSubtitle')}</Txt>
        </View>
      </Row>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: space.lg, gap: 8, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<Txt variant="muted" style={{ textAlign: 'center', marginTop: 40 }}>{t('compX.community.dmEmpty')}</Txt>}
          renderItem={({ item: m }) => {
            const mine = m.sender?.id === user?.id;
            return (
              <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <View
                  style={{
                    maxWidth: '82%',
                    backgroundColor: mine ? C.green : C.white,
                    borderWidth: mine ? 0 : StyleSheet.hairlineWidth,
                    borderColor: C.border,
                    borderRadius: 18,
                    borderBottomRightRadius: mine ? 5 : 18,
                    borderBottomLeftRadius: mine ? 18 : 5,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <BubbleBody m={m} mine={mine} />
                  {m.createdAt ? (
                    <Text style={{ ...type.caption, fontSize: 10.5, marginTop: 4, textAlign: 'right', color: mine ? 'rgba(255,255,255,0.7)' : C.inkMuted }}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
        {user ? (
          <Row style={{ paddingHorizontal: space.md, paddingVertical: space.sm, gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, backgroundColor: C.white }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="add" size={22} color={C.inkSoft} />
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 23, backgroundColor: C.page, paddingHorizontal: 16 }}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={s.typeMessage}
                placeholderTextColor={C.inkMuted}
                style={{ flex: 1, ...type.body, fontSize: 15, color: C.ink, paddingVertical: 0 }}
                onSubmitEditing={send}
                returnKeyType="send"
              />
              <Ionicons name="mic-outline" size={19} color={C.inkMuted} />
            </View>
            <Pressable
              onPress={send}
              disabled={!text.trim()}
              style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: text.trim() ? C.green : C.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="send" size={18} color={C.white} />
            </Pressable>
          </Row>
        ) : (
          <View style={{ padding: space.lg, borderTopWidth: 1, borderTopColor: C.border }}>
            <Txt variant="muted" style={{ textAlign: 'center' }}>{s.signInToPost}</Txt>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── New Trade Requirement ────────────────────────────────────────── */
function RequirementForm({ onDone, s }: { onDone: () => void; s: S }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [f, setF] = useState({ title: '', productCategory: 'Grains', productName: '', quantity: '', unit: 'MT', buyerLocation: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    if (!f.title || !f.productName || !f.quantity) return;
    setBusy(true);
    try {
      await api.community.createRequirement(f);
      qc.invalidateQueries({ queryKey: ['community-requirements'] });
      onDone();
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Row style={{ paddingHorizontal: space.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white }}>
        <Pressable onPress={onDone} hitSlop={10} style={{ marginEnd: 8 }}>
          <Ionicons name={backChevron()} size={22} color={C.ink} />
        </Pressable>
        <Txt variant="title">{s.newRequirement}</Txt>
      </Row>
      <View style={{ padding: space.lg, gap: 12 }}>
        <Input label={s.title} placeholder={t('pubX.ph.reqWheatTitle')} value={f.title} onChangeText={(v) => set('title', v)} />
        <Input label={s.product} placeholder={t('pubX.ph.millingWheat')} value={f.productName} onChangeText={(v) => set('productName', v)} />
        <Row gap={10}>
          <View style={{ flex: 1 }}><Input label={s.quantity} placeholder="100" keyboardType="numeric" value={f.quantity} onChangeText={(v) => set('quantity', v)} /></View>
          <View style={{ flex: 1 }}><Input label={s.unit} value={f.unit} onChangeText={(v) => set('unit', v)} /></View>
        </Row>
        <Input label={s.location} placeholder={t('pubX.ph.locationMoscow')} value={f.buyerLocation} onChangeText={(v) => set('buyerLocation', v)} />
        <Button title={s.create} icon="checkmark" loading={busy} disabled={!f.title || !f.productName || !f.quantity} onPress={submit} full />
      </View>
    </SafeAreaView>
  );
}

/* ── Feed composer (any signed-in user can post publicly) ─────────── */
function FeedComposer({ onPosted, s }: { onPosted: () => void; s: S }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await api.community.createPost({ body: text });
      setBody('');
      onPosted();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={{ marginBottom: 10, backgroundColor: C.surface }}>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder={s.feedPlaceholder}
        placeholderTextColor={C.inkSoft}
        multiline
        style={{ minHeight: 44, color: C.ink, backgroundColor: C.white, borderRadius: radius.md, borderWidth: 1, borderColor: C.border, padding: 10, textAlignVertical: 'top' }}
      />
      <Row style={{ justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
        <Txt variant="muted" style={{ flex: 1, fontSize: 11, marginEnd: 8 }}>{s.feedHint}</Txt>
        <Button title={s.post} size="sm" loading={busy} disabled={!body.trim()} onPress={submit} />
      </Row>
    </Card>
  );
}

/* ── Root screen ──────────────────────────────────────────────────── */
export function Community() {
  const s = useChatStrings();
  const { lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const route = useRoute<RouteProp<RootStackParamList, 'Community'>>();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const goBack = () => (nav.canGoBack() ? nav.goBack() : nav.navigate('App'));
  const [tab, setTab] = useState<Tab>('feed');
  const [activeGroup, setActiveGroup] = useState<AnyRec | null>(null);
  const [activeDm, setActiveDm] = useState<{ userId: string; name: string } | null>(null);
  const [creatingReq, setCreatingReq] = useState(false);
  const { socket } = useChatSocket('/community', !!user);

  // Deep-link straight into a DM ("Chat with seller", directory Chat buttons).
  useEffect(() => {
    if (route.params?.dmUserId) {
      setActiveGroup(null);
      setActiveDm({ userId: route.params.dmUserId, name: route.params.dmName ?? s.chat });
    }
    // Only route-param changes should re-open the DM; `s.chat` is a static
    // fallback label and must not re-trigger this effect on a locale switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.dmUserId, route.params?.dmName]);

  const feed = useQuery({ queryKey: ['community-feed', lang], queryFn: () => api.community.feed(), enabled: tab === 'feed' });
  const groups = useQuery({ queryKey: ['community-groups', lang], queryFn: () => api.community.groups(), enabled: tab === 'groups' });
  const reqs = useQuery({ queryKey: ['community-requirements', lang], queryFn: () => api.community.requirements(), enabled: tab === 'requirements' });
  const mine = useQuery({ queryKey: ['community-my', lang], queryFn: () => api.community.myGroups(), enabled: tab === 'mychats' && !!user });

  const join = async (id: string) => {
    await api.community.joinGroup(id);
    qc.invalidateQueries({ queryKey: ['community-my'] });
    qc.invalidateQueries({ queryKey: ['community-groups'] });
  };

  const tabs: [Tab, string][] = useMemo(
    () => [
      ['feed', s.feed],
      ['groups', s.groups],
      ['requirements', s.requirements],
      ['mychats', s.myChats],
    ],
    [s],
  );

  if (activeDm) return <DmRoom peer={activeDm} socket={socket} onBack={() => setActiveDm(null)} s={s} />;
  if (activeGroup) return <Room group={activeGroup} socket={socket} onBack={() => setActiveGroup(null)} s={s} />;
  if (creatingReq) return <RequirementForm onDone={() => setCreatingReq(false)} s={s} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={{ backgroundColor: C.evergreen, paddingHorizontal: space.lg, paddingVertical: 14, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
        <Row gap={8}>
          <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel={s.back} style={{ marginStart: -4 }}>
            <Ionicons name={backChevron()} size={24} color={C.white} />
          </Pressable>
          <Ionicons name="chatbubbles" size={20} color={C.white} />
          <Txt color={C.white} style={{ fontSize: 18, fontWeight: '800' }}>{s.community}</Txt>
        </Row>
        <Txt color={C.mint} style={{ marginTop: 2, fontSize: 12 }}>{s.communitySub}</Txt>
      </View>

      <Row style={{ paddingHorizontal: space.md, paddingVertical: 8, gap: 6, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border }}>
        {tabs.map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            style={{ flex: 1, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: tab === id ? C.surface : 'transparent', alignItems: 'center' }}
          >
            <Txt style={{ fontSize: 12, fontWeight: '700', color: tab === id ? C.dark : C.inkSoft }}>{label}</Txt>
          </Pressable>
        ))}
      </Row>

      {tab === 'feed' && (
        <FlatList
          data={(feed.data as AnyRec[]) ?? []}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: space.lg, gap: 10 }}
          ListHeaderComponent={
            user ? <FeedComposer onPosted={() => qc.invalidateQueries({ queryKey: ['community-feed'] })} s={s} /> : null
          }
          ListEmptyComponent={feed.isLoading ? <SkeletonRows /> : <EmptyState icon="chatbubbles-outline" title={s.empty} />}
          renderItem={({ item: p }) => {
            const isMine = p.author?.id && p.author.id === user?.id;
            const canChat = !!user && !!p.author?.id && !isMine;
            return (
              <Card>
                <Pressable
                  disabled={!canChat}
                  onPress={() => canChat && setActiveDm({ userId: p.author.id, name: p.author.name })}
                >
                  <Row gap={6} style={{ justifyContent: 'space-between' }}>
                    <Row gap={6} style={{ flex: 1 }}>
                      <Ionicons name="person-circle-outline" size={16} color={canChat ? C.green : C.inkSoft} />
                      <Txt variant="muted" numberOfLines={1} style={{ flex: 1, color: canChat ? C.dark : C.inkSoft }}>
                        {p.author?.name} · {p.author?.role}
                      </Txt>
                    </Row>
                    {p.type === 'trade_requirement' && <Badge label={s.requirement} tone="mango" />}
                  </Row>
                </Pressable>
                {p.title ? <Txt variant="title" style={{ marginTop: 4 }}>{p.title}</Txt> : null}
                <Txt style={{ marginTop: 2 }}>{p.body}</Txt>
                {canChat && (
                  <View style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                    <Button
                      title={s.chat}
                      icon="chatbubble-ellipses-outline"
                      size="sm"
                      variant="outline"
                      onPress={() => setActiveDm({ userId: p.author.id, name: p.author.name })}
                    />
                  </View>
                )}
              </Card>
            );
          }}
        />
      )}

      {tab === 'groups' && (
        <FlatList
          data={(groups.data as AnyRec[]) ?? []}
          keyExtractor={(g) => String(g.id)}
          contentContainerStyle={{ padding: space.lg, gap: 10 }}
          ListEmptyComponent={groups.isLoading ? <SkeletonRows /> : <EmptyState icon="people-outline" title="—" />}
          renderItem={({ item: g }) => (
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <Pressable style={{ flex: 1 }} onPress={() => setActiveGroup(g)}>
                  <Row gap={10}>
                    <Txt style={{ fontSize: 22 }}>{g.emoji ?? '💬'}</Txt>
                    <View style={{ flex: 1 }}>
                      <Txt variant="title" numberOfLines={1}>{g.name}</Txt>
                      <Txt variant="muted">{g._count?.members ?? 0} {s.members}</Txt>
                    </View>
                  </Row>
                </Pressable>
                {user ? <Button title={s.join} size="sm" variant="outline" onPress={() => join(g.id)} /> : null}
              </Row>
            </Card>
          )}
        />
      )}

      {tab === 'requirements' && (
        <FlatList
          data={(reqs.data as AnyRec[]) ?? []}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ padding: space.lg, gap: 10 }}
          ListHeaderComponent={
            user ? <Button title={s.newRequirement} icon="add" size="sm" onPress={() => setCreatingReq(true)} /> : null
          }
          ListEmptyComponent={reqs.isLoading ? <SkeletonRows /> : <EmptyState icon="clipboard-outline" title={s.noReqs} />}
          renderItem={({ item: r }) => (
            <Card>
              <Txt variant="title">{r.title}</Txt>
              <Row gap={6} style={{ flexWrap: 'wrap', marginTop: 6 }}>
                <Badge label={`${r.quantity} ${r.unit} · ${r.productName}`} tone="green" />
                {r.buyerLocation ? <Badge label={r.buyerLocation} tone="slate" /> : null}
                <Badge label={`${r._count?.responses ?? 0} ${s.replies}`} tone="info" />
              </Row>
            </Card>
          )}
        />
      )}

      {tab === 'mychats' &&
        (!user ? (
          <View style={{ padding: space.lg }}>
            <EmptyState icon="lock-closed-outline" title={s.signInToPost} />
          </View>
        ) : (
          <FlatList
            data={(mine.data as AnyRec[]) ?? []}
            keyExtractor={(g) => String(g.id)}
            contentContainerStyle={{ padding: space.lg, gap: 10 }}
            ListEmptyComponent={mine.isLoading ? <SkeletonRows /> : <EmptyState icon="chatbubbles-outline" title={s.noGroups} />}
            renderItem={({ item: g }) => (
              <Card onPress={() => setActiveGroup(g)}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row gap={10}>
                    <Txt style={{ fontSize: 22 }}>{g.emoji ?? '💬'}</Txt>
                    <Txt variant="title">{g.name}</Txt>
                  </Row>
                  {g.unread > 0 ? <Badge label={`${g.unread} ${s.unread}`} tone="error" /> : null}
                </Row>
              </Card>
            )}
          />
        ))}
    </SafeAreaView>
  );
}
