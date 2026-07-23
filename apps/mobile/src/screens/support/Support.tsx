import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { Socket } from '@agrotraders/api-client';
import { SUPPORT_CATEGORIES } from '@agrotraders/types';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { useChatSocket } from '../../chat/useChatSocket';
import { useChatStrings, useSupportCategoryLabel, useSupportStatusLabel, statusTone } from '../../chat/strings';
import { Badge, Button, Card, EmptyState, Input, Row, Segmented, SkeletonRows, Txt } from '../../ui';
import { C, radius, space } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { backChevron } from '../../lib/rtl';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = Record<string, any>;
type S = Record<string, string>;

function Header({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <Row style={{ paddingHorizontal: space.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white, justifyContent: 'space-between' }}>
      <Row gap={6} style={{ flex: 1 }}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Ionicons name={backChevron()} size={22} color={C.ink} />
        </Pressable>
        <Txt variant="title" numberOfLines={1} style={{ flex: 1 }}>{title}</Txt>
      </Row>
      {right}
    </Row>
  );
}

/* ── Conversation thread (realtime) ───────────────────────────────── */
function Thread({ ticketId, socket, onBack, s }: { ticketId: string; socket: Socket | null; onBack: () => void; s: S }) {
  const { user } = useAuth();
  const statusLabel = useSupportStatusLabel();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<AnyRec[]>([]);
  const [rated, setRated] = useState(false);
  const listRef = useRef<FlatList<AnyRec>>(null);
  const isAdmin = !!user && (user.role === 'admin' || (user.roles ?? []).includes('admin'));

  const ticket = useQuery({ queryKey: ['support-ticket', ticketId], queryFn: () => api.support.ticket(ticketId) });
  const tk = ticket.data as AnyRec | undefined;

  useEffect(() => {
    if (tk?.conversation?.messages) setMessages(tk.conversation.messages as AnyRec[]);
  }, [tk?.conversation?.messages]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('ticket:join', { ticketId });
    socket.emit('read', { ticketId });
    const onNew = (m: AnyRec) => {
      setMessages((prev) => {
        if (prev.some((x) => x.id === m.id || x.__tempId === m.tempId)) {
          return prev.map((x) => (x.__tempId === m.tempId ? m : x));
        }
        return [...prev, m];
      });
    };
    const onUpdate = () => qc.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
    socket.on('message:new', onNew);
    socket.on('ticket:update', onUpdate);
    return () => {
      socket.off('message:new', onNew);
      socket.off('ticket:update', onUpdate);
    };
  }, [socket, ticketId, qc]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    const tempId = 'tmp-' + Math.random().toString(36).slice(2);
    setMessages((prev) => [...prev, { id: tempId, __tempId: tempId, body, authorType: isAdmin ? 'agent' : 'user', createdAt: new Date().toISOString() }]);
    if (socket) socket.emit('message:send', { ticketId, body, tempId });
    else api.support.send(ticketId, { body });
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const resolved = tk?.status === 'resolved' || tk?.status === 'closed';
  const rate = async (score: number) => {
    await api.support.rate(ticketId, { score });
    setRated(true);
  };
  const refetch = () => qc.invalidateQueries({ queryKey: ['support-ticket', ticketId] });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Header
        title={tk?.subject ?? '…'}
        onBack={onBack}
        right={tk?.status ? <Badge label={statusLabel(String(tk.status))} tone={statusTone[tk.status] ?? 'slate'} /> : undefined}
      />
      <View style={{ paddingHorizontal: space.lg, paddingVertical: 6, backgroundColor: C.white }}>
        <Txt variant="muted">
          {tk?.reference}
          {tk?.assignments?.[0]?.agent?.name ? ` · ${s.agent}: ${tk.assignments[0].agent.name}` : ` · ${s.unassigned}`}
        </Txt>
        {isAdmin && (
          <Row gap={8} style={{ marginTop: 8 }}>
            <Button title={s.assignToMe} size="sm" variant="outline" onPress={() => api.support.assign(ticketId).then(refetch)} />
            {!resolved && <Button title={s.resolve} size="sm" onPress={() => api.support.resolve(ticketId).then(refetch)} />}
          </Row>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: space.lg, gap: 8, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={ticket.isLoading ? <SkeletonRows /> : <Txt variant="muted" style={{ textAlign: 'center', marginTop: 40 }}>{s.empty}</Txt>}
          renderItem={({ item: m }) => {
            const system = m.authorType === 'system';
            const mine = isAdmin ? m.authorType === 'agent' : m.authorType === 'user';
            if (system) {
              return <Txt variant="muted" style={{ textAlign: 'center', fontSize: 11 }}>{m.body}</Txt>;
            }
            return (
              <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <View
                  style={{
                    maxWidth: '82%',
                    backgroundColor: mine ? C.green : C.white,
                    borderWidth: mine ? 0 : 1,
                    borderColor: C.border,
                    borderRadius: radius.lg,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  {!mine && <Txt style={{ fontSize: 11, fontWeight: '700', color: C.dark, marginBottom: 2 }}>{m.authorType === 'agent' ? s.agent : tk?.user?.name ?? s.userFallback}</Txt>}
                  <Txt color={mine ? C.white : C.ink}>{m.body}</Txt>
                </View>
              </View>
            );
          }}
        />

        {resolved && !isAdmin ? (
          <View style={{ padding: space.lg, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'center', gap: 8 }}>
            {rated || tk?.rating ? (
              <Txt color={C.dark}>{s.thanks}</Txt>
            ) : (
              <>
                <Txt variant="muted">{s.rate}</Txt>
                <Row gap={4}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => rate(n)} hitSlop={6}>
                      <Ionicons name="star" size={26} color={C.mangoDeep} />
                    </Pressable>
                  ))}
                </Row>
              </>
            )}
            <Button title={s.reopen} size="sm" variant="ghost" onPress={() => api.support.reopen(ticketId).then(refetch)} />
          </View>
        ) : (
          <Row style={{ padding: space.sm, gap: 8, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.white }}>
            <TextInput
              value={text}
              onChangeText={(v) => {
                setText(v);
                socket?.emit('typing', { ticketId, typing: true });
              }}
              placeholder={s.typeMessage}
              placeholderTextColor={C.inkSoft}
              style={{ flex: 1, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, color: C.ink, backgroundColor: C.white }}
              onSubmitEditing={send}
              returnKeyType="send"
            />
            <Pressable
              onPress={send}
              disabled={!text.trim()}
              style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: text.trim() ? C.green : C.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="send" size={18} color={C.white} />
            </Pressable>
          </Row>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── New ticket (category → subject/description) ──────────────────── */
function NewTicket({ onCreated, onBack, s }: { onCreated: (id: string) => void; onBack: () => void; s: S }) {
  const categoryLabel = useSupportCategoryLabel();
  const [category, setCategory] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const create = async () => {
    if (!category || !subject || !description) return;
    setBusy(true);
    try {
      const ticket = (await api.support.create({ category, subject, description })) as AnyRec;
      onCreated(ticket.id);
    } finally {
      setBusy(false);
    }
  };

  if (!category) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
        <Header title={s.newRequest} onBack={onBack} />
        <FlatList
          data={SUPPORT_CATEGORIES}
          keyExtractor={(c) => c}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ padding: space.lg, gap: 10 }}
          ListHeaderComponent={<Txt variant="muted" style={{ marginBottom: 8 }}>{s.chooseTopic}</Txt>}
          renderItem={({ item: c }) => (
            <Pressable
              onPress={() => setCategory(c)}
              style={{ flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: radius.md, padding: 14 }}
            >
              <Txt style={{ fontSize: 13, fontWeight: '700' }}>{categoryLabel(c)}</Txt>
            </Pressable>
          )}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Header title={s.newRequest} onBack={() => setCategory(null)} />
      <View style={{ padding: space.lg, gap: 12 }}>
        <Badge label={categoryLabel(category)} tone="green" />
        <Input label={s.subject} value={subject} onChangeText={setSubject} />
        <Input
          label={s.describe}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          style={{ height: 120, textAlignVertical: 'top', paddingTop: 12 }}
        />
        <Button title={s.create} icon="checkmark" loading={busy} disabled={!subject || !description} onPress={create} full />
      </View>
    </SafeAreaView>
  );
}

/* ── Root screen ──────────────────────────────────────────────────── */
export function Support() {
  const s = useChatStrings();
  const statusLabel = useSupportStatusLabel();
  const { user } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const goBack = () => (nav.canGoBack() ? nav.goBack() : nav.navigate('App'));
  const [view, setView] = useState<'list' | 'new' | string>('list');
  const [box, setBox] = useState<'mine' | 'inbox'>('mine');
  const { socket } = useChatSocket('/support', !!user);
  const isAdmin = !!user && (user.role === 'admin' || (user.roles ?? []).includes('admin'));

  const mineTickets = useQuery({ queryKey: ['support-mine'], queryFn: () => api.support.mine(), enabled: !!user && view === 'list' && box === 'mine' });
  const inbox = useQuery({ queryKey: ['support-inbox'], queryFn: () => api.support.inbox(), enabled: isAdmin && view === 'list' && box === 'inbox' });

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
        <Header title={s.support} onBack={goBack} />
        <View style={{ padding: space.lg }}>
          <EmptyState icon="headset-outline" title={s.support} body={s.signInSupport} />
        </View>
      </SafeAreaView>
    );
  }

  if (view === 'new') return <NewTicket onCreated={(id) => setView(id)} onBack={() => setView('list')} s={s} />;
  if (view !== 'list') return <Thread ticketId={view} socket={socket} onBack={() => setView('list')} s={s} />;

  const activeQuery = box === 'inbox' ? inbox : mineTickets;
  const tickets = (activeQuery.data as AnyRec[]) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={{ backgroundColor: C.dark, paddingHorizontal: space.lg, paddingVertical: 14, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
        <Row gap={8}>
          <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel={s.back} style={{ marginStart: -4 }}>
            <Ionicons name={backChevron()} size={24} color={C.white} />
          </Pressable>
          <Ionicons name="headset" size={20} color={C.white} />
          <Txt color={C.white} style={{ fontSize: 18, fontWeight: '800' }}>{s.support}</Txt>
        </Row>
        <Txt color={C.mint} style={{ marginTop: 2, fontSize: 12 }}>{s.supportSub}</Txt>
      </View>

      <View style={{ padding: space.lg, gap: 12 }}>
        {isAdmin && (
          <Segmented
            value={box}
            onChange={(v) => setBox(v as 'mine' | 'inbox')}
            options={[
              { id: 'mine', label: s.myTickets },
              { id: 'inbox', label: s.inbox },
            ]}
          />
        )}
        {box === 'mine' && (
          <>
            <Txt variant="muted">{s.welcome}</Txt>
            <Button title={s.newRequest} icon="add" onPress={() => setView('new')} full />
          </>
        )}
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 32, gap: 10 }}
        ListEmptyComponent={activeQuery.isLoading ? <SkeletonRows /> : <EmptyState icon="headset-outline" title={s.noTickets} />}
        renderItem={({ item: t }) => (
          <Card onPress={() => setView(t.id)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginEnd: 8 }}>
                <Txt variant="title" numberOfLines={1}>{t.subject}</Txt>
                <Txt variant="muted">{t.reference}{box === 'inbox' && t.user?.name ? ` · ${t.user.name}` : ''}</Txt>
              </View>
              <Badge label={statusLabel(String(t.status))} tone={statusTone[t.status] ?? 'slate'} />
            </Row>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
