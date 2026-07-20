import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Icon, Input } from '@agrotraders/ui';
import type { Socket } from '@agrotraders/api-client';
import { SUPPORT_CATEGORIES } from '@agrotraders/types';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { Drawer } from '../Drawer';
import { useChatSocket } from '../useChatSocket';
import { useUnreadBadge, badgeText } from '../useUnreadBadge';
import { chatBus } from '../chatBus';
import { statusTone, useChatStrings, useSupportCategoryLabel } from '../strings';

const ACCENT = 'linear-gradient(135deg,#146B3A,#0B3D2E)';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = Record<string, any>;

function Thread({ ticketId, socket, onBack, s }: { ticketId: string; socket: Socket | null; onBack: () => void; s: AnyRec }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<AnyRec[]>([]);
  const [rated, setRated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const ticket = useQuery({ queryKey: ['support-ticket', ticketId], queryFn: () => api.support.ticket(ticketId) });
  const tk = ticket.data as AnyRec | undefined;

  useEffect(() => {
    if (tk?.conversation?.messages) setMessages(tk.conversation.messages);
  }, [tk?.conversation?.messages]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('ticket:join', { ticketId });
    const onNew = (m: AnyRec) => {
      setMessages((prev) => {
        if (prev.some((x) => x.id === m.id || x.__tempId === m.tempId)) return prev.map((x) => (x.__tempId === m.tempId ? m : x));
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    const tempId = 'tmp-' + Math.random().toString(36).slice(2);
    setMessages((prev) => [...prev, { id: tempId, __tempId: tempId, body, authorType: 'user', createdAt: new Date().toISOString() }]);
    if (socket) socket.emit('message:send', { ticketId, body, tempId });
    else api.support.send(ticketId, { body });
    setText('');
  };

  const resolved = tk?.status === 'resolved' || tk?.status === 'closed';
  const rate = async (score: number) => {
    await api.support.rate(ticketId, { score });
    setRated(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-surface-border px-3 py-2">
        <button onClick={onBack} className="rounded p-1 hover:bg-brand-surface">
          <Icon name="chevronLeft" size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display font-bold text-ink">{tk?.subject ?? '…'}</div>
          <div className="flex items-center gap-1 text-[11px] text-ink-soft">
            {tk?.reference} · {tk?.assignments?.[0]?.agent?.name ? `${s.agent}: ${tk.assignments[0].agent.name}` : s.unassigned}
          </div>
        </div>
        {tk?.status && <Badge tone={statusTone[tk.status] ?? 'slate'}>{String(tk.status).replace('_', ' ')}</Badge>}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.map((m) => {
          const mine = m.authorType === 'user';
          const system = m.authorType === 'system';
          return (
            <div key={m.id} className={`flex ${system ? 'justify-center' : mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                  system ? 'bg-brand-surface/60 text-ink-soft text-xs' : mine ? 'bg-brand-gradient text-white' : 'border border-surface-border bg-white text-ink'
                }`}
              >
                {!mine && !system && <div className="mb-0.5 text-[11px] font-bold text-brand-dark">{s.agent}</div>}
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {resolved ? (
        <div className="border-t border-surface-border p-3 text-center">
          {rated || tk?.rating ? (
            <p className="text-sm text-brand-dark">{s.thanks}</p>
          ) : (
            <>
              <p className="mb-2 text-xs text-ink-soft">{s.rate}</p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => rate(n)} className="text-ink-soft hover:text-gold">
                    <Icon name="star" size={22} />
                  </button>
                ))}
              </div>
            </>
          )}
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => api.support.reopen(ticketId).then(() => qc.invalidateQueries({ queryKey: ['support-ticket', ticketId] }))}>
            {s.reopen}
          </Button>
        </div>
      ) : (
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
      )}
    </div>
  );
}

function NewTicket({ onCreated, s }: { onCreated: (id: string) => void; s: AnyRec }) {
  const categoryLabel = useSupportCategoryLabel();
  const [category, setCategory] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const create = async () => {
    if (!category || !subject || !description) return;
    const ticket = (await api.support.create({ category, subject, description })) as AnyRec;
    onCreated(ticket.id);
  };
  if (!category) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="mb-2 text-sm text-ink-soft">{s.chooseTopic}</p>
        <div className="grid grid-cols-2 gap-2">
          {SUPPORT_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="rounded-xl border border-surface-border p-2.5 text-start text-xs font-semibold text-ink transition hover:border-brand-leaf hover:bg-brand-surface"
            >
              {categoryLabel(c)}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2 p-3">
      <Badge tone="green">{categoryLabel(category)}</Badge>
      <Input label={s.subject} value={subject} onChange={(e) => setSubject(e.target.value)} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">{s.describe}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="w-full rounded-md border border-surface-border bg-white p-3 text-sm outline-none focus:border-brand-leaf"
        />
      </label>
      <div className="flex gap-2">
        <Button size="sm" fullWidth onClick={create} disabled={!subject || !description}>
          {s.create}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setCategory(null)}>
          {s.back}
        </Button>
      </div>
    </div>
  );
}

export function SupportWidget() {
  const s = useChatStrings();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'new' | string>('list');
  // Stay connected while signed in so the live unread badge keeps counting.
  const { socket } = useChatSocket('/support', !!user);
  const unread = useUnreadBadge('support', socket, open);
  const tickets = useQuery({ queryKey: ['support-mine'], queryFn: () => api.support.mine(), enabled: open && !!user && view === 'list' });

  useEffect(() => chatBus.onOpenSupport(() => setOpen(true)), []);

  const isThread = view !== 'list' && view !== 'new';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 end-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl transition hover:scale-105"
        style={{ background: ACCENT }}
        aria-label={s.support}
      >
        <Icon name="phone" size={24} />
        {badgeText(unread) && (
          <span className="absolute -end-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-status-error px-1.5 text-[11px] font-extrabold text-white shadow-md">
            {badgeText(unread)}
          </span>
        )}
      </button>

      <Drawer
        open={open}
        side="right"
        accent={ACCENT}
        onClose={() => {
          setOpen(false);
          setView('list');
        }}
        title={
          <>
            <Icon name="phone" size={18} /> {s.support}
          </>
        }
      >
        {!user ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-ink-soft">{s.signInSupport}</p>
            <Link to="/login">
              <Button size="sm">{s.support}</Button>
            </Link>
          </div>
        ) : isThread ? (
          <Thread ticketId={view} socket={socket} onBack={() => setView('list')} s={s} />
        ) : view === 'new' ? (
          <NewTicket onCreated={(id) => setView(id)} s={s} />
        ) : (
          <>
            <div className="border-b border-surface-border p-3">
              <p className="mb-2 text-sm text-ink-soft">{s.welcome}</p>
              <Button size="sm" fullWidth leftIcon={<Icon name="plus" size={16} />} onClick={() => setView('new')}>
                {s.newRequest}
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{s.myTickets}</p>
              {((tickets.data as AnyRec[]) ?? []).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setView(t.id)}
                  className="mb-2 flex w-full items-center justify-between rounded-xl border border-surface-border p-3 text-start hover:border-brand-leaf"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-display font-bold text-ink">{t.subject}</span>
                    <span className="block text-[11px] text-ink-soft">{t.reference}</span>
                  </span>
                  <Badge tone={statusTone[t.status] ?? 'slate'}>{String(t.status).replace('_', ' ')}</Badge>
                </button>
              ))}
              {Array.isArray(tickets.data) && (tickets.data as AnyRec[]).length === 0 && (
                <p className="mt-8 text-center text-sm text-ink-soft">{s.myTickets}: 0</p>
              )}
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}
