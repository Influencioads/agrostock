import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Icon, Input } from '@agrotraders/ui';
import type { Socket } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { Drawer } from '../Drawer';
import { useChatSocket } from '../useChatSocket';
import { useUnreadBadge, badgeText } from '../useUnreadBadge';
import { chatBus, type OpenDmEvent } from '../chatBus';
import { useChatStrings } from '../strings';
import { useI18n } from '../../i18n';

const ACCENT = 'linear-gradient(135deg,#249653,#146B3A)';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = Record<string, any>;

const baseLang = (tag?: string | null) => (tag ? tag.split('-')[0].toLowerCase() : '');

/**
 * A message arriving over the socket carries its original text + `sourceLang`.
 * When it isn't already in the viewer's language, fetch the cached/live
 * translation and patch it in (read endpoints pre-translate, so this only fires
 * for brand-new realtime messages).
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
function BubbleBody({ m, s }: { m: AnyRec; s: AnyRec }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const hasTranslation = !!m.originalBody && m.originalBody !== m.body;
  return (
    <>
      <div className="whitespace-pre-wrap break-words">
        {showOriginal && hasTranslation ? m.originalBody : m.body}
      </div>
      {hasTranslation && (
        <button
          type="button"
          onClick={() => setShowOriginal((v) => !v)}
          className="mt-0.5 text-[10px] font-semibold underline opacity-70 transition hover:opacity-100"
        >
          {showOriginal ? s.showTranslation : s.showOriginal}
        </button>
      )}
    </>
  );
}

function TabBar({ tab, setTab, s }: { tab: string; setTab: (t: string) => void; s: AnyRec }) {
  const tabs = [
    ['feed', s.feed],
    ['groups', s.groups],
    ['requirements', s.requirements],
    ['mychats', s.myChats],
  ];
  return (
    <div className="flex gap-1 border-b border-surface-border px-2 py-2">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold transition ${
            tab === id ? 'bg-brand-surface text-brand-dark' : 'text-ink-soft hover:bg-brand-surface/60'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Room({ group, socket, onBack, s }: { group: AnyRec; socket: Socket | null; onBack: () => void; s: AnyRec }) {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [displayGroup, setDisplayGroup] = useState<AnyRec>(group);
  const [messages, setMessages] = useState<AnyRec[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setDisplayGroup(group);
    api.community.group(group.id).then((g) => alive && setDisplayGroup(g as AnyRec)).catch(() => {});
    api.community.groupMessages(group.id).then((m) => alive && setMessages(m as AnyRec[]));
    return () => {
      alive = false;
    };
  }, [group, group.id, lang]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('group:join', { groupId: group.id });
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
      setTyping(d.typing ? '…' : null);
      if (d.typing) setTimeout(() => setTyping(null), 2500);
    };
    socket.on('message:new', onNew);
    socket.on('typing', onTyping);
    socket.emit('read', { groupId: group.id });
    return () => {
      socket.emit('group:leave', { groupId: group.id });
      socket.off('message:new', onNew);
      socket.off('typing', onTyping);
    };
  }, [socket, group.id, user?.id, lang]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = () => {
    const body = text.trim();
    if (!body || !socket) return;
    const tempId = 'tmp-' + Math.random().toString(36).slice(2);
    setMessages((prev) => [
      ...prev,
      { id: tempId, __tempId: tempId, body, sender: { id: user?.id, name: user?.name ?? s.you }, createdAt: new Date().toISOString() },
    ]);
    socket.emit('message:send', { tempId, groupId: group.id, body });
    setText('');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-surface-border px-3 py-2">
        <button onClick={onBack} className="rounded p-1 hover:bg-brand-surface">
          <Icon name="chevronLeft" size={18} />
        </button>
        <span className="text-lg">{group.emoji ?? '💬'}</span>
        <span className="font-display font-bold text-ink">{displayGroup.name}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 && <p className="mt-8 text-center text-sm text-ink-soft">{s.empty}</p>}
        {messages.map((m) => {
          const mine = m.sender?.id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-brand-gradient text-white' : 'bg-brand-surface text-ink'}`}>
                {!mine && <div className="mb-0.5 text-[11px] font-bold opacity-70">{m.sender?.name}</div>}
                <BubbleBody m={m} s={s} />
              </div>
            </div>
          );
        })}
        {typing && <div className="text-xs italic text-ink-soft">{s.typing}</div>}
        <div ref={endRef} />
      </div>
      {user ? (
        <div className="flex items-center gap-2 border-t border-surface-border p-2">
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              socket?.emit('typing', { groupId: group.id, typing: true });
            }}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={s.typeMessage}
            className="h-10 flex-1 rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf"
          />
          <Button size="sm" onClick={send} disabled={!text.trim()}>
            <Icon name="arrowRight" size={16} />
          </Button>
        </div>
      ) : (
        <div className="border-t border-surface-border p-3 text-center text-xs text-ink-soft">{s.signInToPost}</div>
      )}
    </div>
  );
}

/** 1:1 direct-message room (opened via "Chat with seller" / directory Chat buttons). */
function DmRoom({ peer, socket, onBack, s }: { peer: OpenDmEvent; socket: Socket | null; onBack: () => void; s: AnyRec }) {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [messages, setMessages] = useState<AnyRec[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.community
      .dm(peer.userId)
      .then((r) => {
        const res = r as { threadId: string; messages: AnyRec[] };
        setThreadId(res.threadId);
        setMessages(res.messages);
      })
      .catch(() => {});
    api.community.dmRead(peer.userId).catch(() => {});
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-surface-border px-3 py-2">
        <button onClick={onBack} className="rounded p-1 hover:bg-brand-surface">
          <Icon name="chevronLeft" size={18} />
        </button>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-surface text-sm font-bold text-brand-dark">
          {peer.name.slice(0, 1)}
        </span>
        <div className="leading-tight">
          <div className="font-display font-bold text-ink">{peer.name}</div>
          <div className="text-[11px] text-ink-soft">{s.dmPrivate}</div>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 && <p className="mt-8 text-center text-sm text-ink-soft">{s.dmSayHello}</p>}
        {messages.map((m) => {
          const mine = m.sender?.id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-brand-gradient text-white' : 'bg-brand-surface text-ink'}`}>
                <BubbleBody m={m} s={s} />
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {user ? (
        <div className="flex items-center gap-2 border-t border-surface-border p-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={s.typeMessage}
            className="h-10 flex-1 rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf"
          />
          <Button size="sm" onClick={send} disabled={!text.trim()}>
            <Icon name="arrowRight" size={16} />
          </Button>
        </div>
      ) : (
        <div className="border-t border-surface-border p-3 text-center text-xs text-ink-soft">{s.signInToPost}</div>
      )}
    </div>
  );
}

function RequirementForm({ onDone, s }: { onDone: () => void; s: AnyRec }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ title: '', productCategory: 'Grains', productName: '', quantity: '', unit: 'MT', buyerLocation: '' });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    if (!f.title || !f.productName || !f.quantity) return;
    await api.community.createRequirement(f);
    qc.invalidateQueries({ queryKey: ['community-requirements'] });
    onDone();
  };
  return (
    <div className="space-y-2 p-3">
      <Input label={s.reqTitle} placeholder={s.reqTitlePh} value={f.title} onChange={(e) => set('title', e.target.value)} />
      <Input label={s.reqProduct} placeholder={s.reqProductPh} value={f.productName} onChange={(e) => set('productName', e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <Input label={s.reqQuantity} placeholder="100" value={f.quantity} onChange={(e) => set('quantity', e.target.value)} />
        <Input label={s.reqUnit} value={f.unit} onChange={(e) => set('unit', e.target.value)} />
      </div>
      <Input label={s.reqLocation} placeholder={s.reqLocationPh} value={f.buyerLocation} onChange={(e) => set('buyerLocation', e.target.value)} />
      <div className="flex gap-2 pt-1">
        <Button size="sm" fullWidth onClick={submit}>{s.create}</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>{s.back}</Button>
      </div>
    </div>
  );
}

/** Open composer for the public Feed — any signed-in user can post. */
function FeedComposer({ onPosted, s }: { onPosted: () => void; s: AnyRec }) {
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
    <div className="mb-3 rounded-xl border border-surface-border bg-brand-surface/40 p-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder={s.feedPlaceholder}
        className="w-full resize-none rounded-md border border-surface-border bg-white p-2 text-sm outline-none focus:border-brand-leaf"
      />
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[11px] text-ink-soft">{s.feedHint}</span>
        <Button size="sm" onClick={submit} disabled={!body.trim() || busy}>
          {s.post}
        </Button>
      </div>
    </div>
  );
}

export function CommunityWidget() {
  const s = useChatStrings();
  const { lang } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('feed');
  const [activeGroup, setActiveGroup] = useState<AnyRec | null>(null);
  const [activeDm, setActiveDm] = useState<OpenDmEvent | null>(null);
  const [creatingReq, setCreatingReq] = useState(false);
  // Stay connected while signed in (not just while open) so the unread badge
  // and DM deep-links update live.
  const { socket } = useChatSocket('/community', !!user);
  const unread = useUnreadBadge('community', socket, open);
  const qc = useQueryClient();

  // Any page can deep-link into a DM ("Chat with seller", directory cards…).
  useEffect(
    () =>
      chatBus.onOpenDm((peer) => {
        setActiveGroup(null);
        setCreatingReq(false);
        setActiveDm(peer);
        setOpen(true);
      }),
    [],
  );

  const feed = useQuery({ queryKey: ['community-feed', lang], queryFn: () => api.community.feed(), enabled: open && tab === 'feed' });
  const groups = useQuery({ queryKey: ['community-groups', lang], queryFn: () => api.community.groups(), enabled: open && tab === 'groups' });
  const reqs = useQuery({ queryKey: ['community-requirements', lang], queryFn: () => api.community.requirements(), enabled: open && tab === 'requirements' });
  const mine = useQuery({ queryKey: ['community-my', lang], queryFn: () => api.community.myGroups(), enabled: open && tab === 'mychats' && !!user });

  const join = async (id: string) => {
    await api.community.joinGroup(id);
    qc.invalidateQueries({ queryKey: ['community-my'] });
    qc.invalidateQueries({ queryKey: ['community-groups'] });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 start-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl transition hover:scale-105"
        style={{ background: ACCENT }}
        aria-label={s.community}
      >
        <Icon name="message" size={24} />
        {badgeText(unread) && (
          <span className="absolute -end-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-status-error px-1.5 text-[11px] font-extrabold text-white shadow-md">
            {badgeText(unread)}
          </span>
        )}
      </button>

      <Drawer
        open={open}
        side="left"
        accent={ACCENT}
        onClose={() => {
          setOpen(false);
          setActiveGroup(null);
          setActiveDm(null);
        }}
        title={
          <>
            <Icon name="message" size={18} /> {s.community}
          </>
        }
      >
        {activeDm ? (
          <DmRoom peer={activeDm} socket={socket} onBack={() => setActiveDm(null)} s={s} />
        ) : activeGroup ? (
          <Room group={activeGroup} socket={socket} onBack={() => setActiveGroup(null)} s={s} />
        ) : creatingReq ? (
          <RequirementForm onDone={() => setCreatingReq(false)} s={s} />
        ) : (
          <>
            <TabBar tab={tab} setTab={setTab} s={s} />
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {tab === 'feed' && (
                <>
                  {user && <FeedComposer onPosted={() => qc.invalidateQueries({ queryKey: ['community-feed'] })} s={s} />}
                  {((feed.data as AnyRec[]) ?? []).map((p) => {
                    const isMine = p.author?.id && p.author.id === user?.id;
                    const canChat = user && p.author?.id && !isMine;
                    return (
                      <div key={p.id} className="mb-2 rounded-xl border border-surface-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            disabled={!canChat}
                            onClick={() => canChat && setActiveDm({ userId: p.author.id, name: p.author.name })}
                            className={`flex min-w-0 items-center gap-1.5 text-xs text-ink-soft ${canChat ? 'hover:text-brand-dark' : ''}`}
                            title={canChat ? `${s.chat} · ${p.author.name}` : undefined}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-surface text-[11px] font-bold text-brand-dark">
                              {(p.author?.name ?? '?').slice(0, 1)}
                            </span>
                            <span className="truncate font-semibold text-ink">{p.author?.name}</span>
                            <span className="shrink-0">· {p.author?.role}</span>
                          </button>
                          {p.type === 'trade_requirement' && <Badge tone="mango">{s.requirementBadge}</Badge>}
                        </div>
                        {p.title && <div className="mt-1 font-display font-bold text-ink">{p.title}</div>}
                        <div className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink">{p.body}</div>
                        {canChat && (
                          <button
                            type="button"
                            onClick={() => setActiveDm({ userId: p.author.id, name: p.author.name })}
                            className="mt-2 inline-flex items-center gap-1 rounded-full border border-brand-leaf px-2.5 py-1 text-[11px] font-bold text-brand-dark hover:bg-brand-surface"
                          >
                            <Icon name="message" size={12} /> {s.chat}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {Array.isArray(feed.data) && (feed.data as AnyRec[]).length === 0 && (
                    <p className="mt-8 text-center text-sm text-ink-soft">{s.empty}</p>
                  )}
                </>
              )}

              {tab === 'groups' &&
                ((groups.data as AnyRec[]) ?? []).map((g) => (
                  <div key={g.id} className="mb-2 flex items-center justify-between rounded-xl border border-surface-border p-3">
                    <button className="flex items-center gap-2 text-start" onClick={() => setActiveGroup(g)}>
                      <span className="text-xl">{g.emoji ?? '💬'}</span>
                      <span>
                        <span className="block font-display font-bold text-ink">{g.name}</span>
                        <span className="block text-[11px] text-ink-soft">{g._count?.members ?? 0} {s.members}</span>
                      </span>
                    </button>
                    {user && (
                      <Button size="sm" variant="secondary" onClick={() => join(g.id)}>
                        {s.join}
                      </Button>
                    )}
                  </div>
                ))}

              {tab === 'requirements' && (
                <>
                  {user && (
                    <Button size="sm" fullWidth className="mb-2" leftIcon={<Icon name="plus" size={16} />} onClick={() => setCreatingReq(true)}>
                      {s.newRequirement}
                    </Button>
                  )}
                  {((reqs.data as AnyRec[]) ?? []).map((r) => (
                    <div key={r.id} className="mb-2 rounded-xl border border-surface-border p-3">
                      <div className="font-display font-bold text-ink">{r.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                        <Badge tone="green">
                          {r.quantity} {r.unit} · {r.productName}
                        </Badge>
                        {r.buyerLocation && <Badge tone="slate">{r.buyerLocation}</Badge>}
                        <Badge tone="info">{r._count?.responses ?? 0} {s.replies}</Badge>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {tab === 'mychats' &&
                (user ? (
                  ((mine.data as AnyRec[]) ?? []).map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setActiveGroup(g)}
                      className="mb-2 flex w-full items-center justify-between rounded-xl border border-surface-border p-3 text-start hover:border-brand-leaf"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-xl">{g.emoji ?? '💬'}</span>
                        <span className="font-display font-bold text-ink">{g.name}</span>
                      </span>
                      {g.unread > 0 && <Badge tone="error">{g.unread} {s.unread}</Badge>}
                    </button>
                  ))
                ) : (
                  <p className="mt-8 text-center text-sm text-ink-soft">{s.signInToPost}</p>
                ))}
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}
