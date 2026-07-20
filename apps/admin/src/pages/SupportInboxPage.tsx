import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Icon, type BadgeTone } from '@agrotraders/ui';
import { PageHeader } from '../components/widgets';
import { api } from '../lib/api';
import { useChatSocket } from '../lib/useChatSocket';
import { useI18n } from '../i18n';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = Record<string, any>;

const STATUS_TONE: Record<string, BadgeTone> = {
  new: 'info',
  waiting_support: 'warn',
  assigned: 'info',
  in_progress: 'info',
  waiting_user: 'gold',
  escalated: 'error',
  resolved: 'green',
  closed: 'slate',
};
const PRIORITY_TONE: Record<string, BadgeTone> = { low: 'slate', medium: 'info', high: 'warn', urgent: 'error' };
const STATUS_FILTERS = ['all', 'new', 'waiting_support', 'assigned', 'in_progress', 'escalated', 'resolved', 'closed'];

export function SupportInboxPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const { socket } = useChatSocket('/support', true);

  const inbox = useQuery({
    queryKey: ['support-inbox', status, q],
    queryFn: () => api.support.inbox({ status: status === 'all' ? undefined : status, q: q || undefined }),
  });
  const tickets = (inbox.data as AnyRec[]) ?? [];

  const ticket = useQuery({
    queryKey: ['support-admin-ticket', activeId],
    queryFn: () => api.support.ticket(activeId as string),
    enabled: !!activeId,
  });
  const tk = ticket.data as AnyRec | undefined;

  const agents = useQuery({ queryKey: ['support-agents'], queryFn: () => api.support.agents() });

  useEffect(() => {
    if (!socket) return;
    const refresh = () => qc.invalidateQueries({ queryKey: ['support-inbox'] });
    const onMsg = () => activeId && qc.invalidateQueries({ queryKey: ['support-admin-ticket', activeId] });
    socket.on('ticket:new', refresh);
    socket.on('ticket:update', refresh);
    socket.on('message:new', onMsg);
    return () => {
      socket.off('ticket:new', refresh);
      socket.off('ticket:update', refresh);
      socket.off('message:new', onMsg);
    };
  }, [socket, qc, activeId]);

  useEffect(() => {
    if (socket && activeId) socket.emit('ticket:join', { ticketId: activeId });
  }, [socket, activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, [tk?.conversation?.messages?.length]);

  const refreshTicket = () => {
    qc.invalidateQueries({ queryKey: ['support-admin-ticket', activeId] });
    qc.invalidateQueries({ queryKey: ['support-inbox'] });
  };

  const send = async () => {
    if (!reply.trim() || !activeId) return;
    await api.support.send(activeId, { body: reply });
    setReply('');
    refreshTicket();
  };
  const act = async (fn: Promise<unknown>) => {
    await fn;
    refreshTicket();
  };

  return (
    <div>
      <PageHeader title={t('support.title')} subtitle={t('support.subtitle', { count: tickets.length })} />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr_300px]">
        {/* left: ticket list */}
        <div className="flex flex-col rounded-xl border border-surface-border bg-white">
          <div className="border-b border-surface-border p-3">
            <label className="flex items-center gap-2 rounded-md border border-surface-border px-2">
              <Icon name="search" size={15} className="text-ink-soft" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('support.searchPlaceholder')}
                className="h-8 w-full bg-transparent text-sm outline-none"
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-1">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded px-2 py-0.5 text-[11px] font-bold ${status === s ? 'bg-brand-gradient text-white' : 'bg-brand-surface text-ink-soft'}`}
                >
                  {t(`enums:support_status.${s}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[65vh] flex-1 overflow-y-auto">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setActiveId(ticket.id)}
                className={`block w-full border-b border-surface-border/60 p-3 text-start hover:bg-brand-surface/40 ${activeId === ticket.id ? 'bg-brand-surface/60' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-semibold text-ink">{ticket.subject}</span>
                  <Badge tone={PRIORITY_TONE[ticket.priority]}>{t(`enums:support_priority.${ticket.priority}`)}</Badge>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-ink-soft">
                  <span>{ticket.reference} · {ticket.user?.name}</span>
                  <Badge tone={STATUS_TONE[ticket.status] ?? 'slate'}>{t(`enums:support_status.${ticket.status}`)}</Badge>
                </div>
              </button>
            ))}
            {tickets.length === 0 && <p className="p-6 text-center text-sm text-ink-soft">{t('support.noTickets')}</p>}
          </div>
        </div>

        {/* center: conversation */}
        <div className="flex min-h-[65vh] flex-col rounded-xl border border-surface-border bg-white">
          {!tk ? (
            <div className="flex flex-1 items-center justify-center text-ink-soft">{t('supportInbox.selectTicket')}</div>
          ) : (
            <>
              <div className="border-b border-surface-border p-3">
                <div className="font-display font-bold text-ink">{tk.subject}</div>
                <div className="text-xs text-ink-soft">{tk.reference} · {tk.category}</div>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {(tk.conversation?.messages ?? []).map((m: AnyRec) => {
                  const agent = m.authorType === 'agent';
                  const system = m.authorType === 'system';
                  return (
                    <div key={m.id} className={`flex ${system ? 'justify-center' : agent ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${system ? 'bg-brand-surface/60 text-xs text-ink-soft' : agent ? 'bg-brand-gradient text-white' : 'border border-surface-border text-ink'}`}>
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              <div className="flex items-center gap-2 border-t border-surface-border p-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder={t('support.replyPlaceholder')}
                  className="h-10 flex-1 rounded-md border border-surface-border px-3 text-sm outline-none focus:border-brand-leaf"
                />
                <Button size="sm" onClick={send} disabled={!reply.trim()}>{t('common:send')}</Button>
              </div>
            </>
          )}
        </div>

        {/* right: details + actions */}
        <div className="space-y-3 rounded-xl border border-surface-border bg-white p-4">
          {!tk ? (
            <p className="text-sm text-ink-soft">{t('supportInbox.detailsHere')}</p>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{t('supportInbox.requester')}</p>
                <p className="text-sm font-semibold text-ink">{tk.user?.name}</p>
                <p className="text-xs text-ink-soft">{tk.user?.email} · {tk.user?.country}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge tone={STATUS_TONE[tk.status] ?? 'slate'}>{t(`enums:support_status.${tk.status}`)}</Badge>
                <Badge tone={PRIORITY_TONE[tk.priority]}>{t(`enums:support_priority.${tk.priority}`)}</Badge>
                {tk.assignments?.[0]?.agent && <Badge tone="info">{tk.assignments[0].agent.name}</Badge>}
              </div>
              {(tk.orderId || tk.productId || tk.safeDealTxId) && (
                <div className="rounded-md bg-brand-surface/50 p-2 text-xs text-ink-soft">
                  {tk.orderId && <div>{t('supportInbox.order')}: {tk.orderId}</div>}
                  {tk.productId && <div>{t('supportInbox.product')}: {tk.productId}</div>}
                  {tk.safeDealTxId && <div>{t('supportInbox.safeDeal')}: {tk.safeDealTxId}</div>}
                </div>
              )}

              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">{t('supportInbox.assign')}</p>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="secondary" onClick={() => act(api.support.assign(tk.id))}>{t('supportInbox.assignMe')}</Button>
                  <select
                    className="rounded-md border border-surface-border px-2 text-xs"
                    onChange={(e) => e.target.value && act(api.support.assign(tk.id, e.target.value))}
                    defaultValue=""
                  >
                    <option value="">{t('supportInbox.agentPh')}</option>
                    {((agents.data as AnyRec[]) ?? []).map((a) => (
                      <option key={a.userId} value={a.userId}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">{t('supportInbox.actions')}</p>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => act(api.support.status(tk.id, 'waiting_user'))}>{t('supportInbox.waitingUser')}</Button>
                  <Button size="sm" variant="outline" onClick={() => act(api.support.escalate(tk.id))}>{t('supportInbox.escalate')}</Button>
                  <Button size="sm" onClick={() => act(api.support.resolve(tk.id))}>{t('supportInbox.resolve')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => act(api.support.close(tk.id))}>{t('supportInbox.close')}</Button>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                    <button key={p} onClick={() => act(api.support.priority(tk.id, p))} className="rounded bg-brand-surface px-2 py-0.5 text-[11px] font-bold text-ink-soft">
                      {t(`enums:support_priority.${p}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">{t('supportInbox.internalNote')}</p>
                {(tk.notes ?? []).map((n: AnyRec) => (
                  <div key={n.id} className="mb-1 rounded bg-mango-soft/50 p-2 text-xs text-ink">{n.body}</div>
                ))}
                <div className="flex gap-1">
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('support.notePlaceholder')} className="h-8 flex-1 rounded-md border border-surface-border px-2 text-xs outline-none" />
                  <Button size="sm" variant="secondary" onClick={() => note.trim() && act(api.support.note(tk.id, note)).then(() => setNote(''))}>{t('supportInbox.add')}</Button>
                </div>
              </div>

              {tk.rating && (
                <div className="rounded-md bg-brand-surface/50 p-2 text-xs">
                  <span className="font-bold text-ink">{t('supportInbox.rating', { score: tk.rating.score })}</span>
                  {tk.rating.comment && <p className="text-ink-soft">{tk.rating.comment}</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
