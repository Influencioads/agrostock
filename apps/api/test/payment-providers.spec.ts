import { createHash } from 'node:crypto';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { RobokassaProvider } from '../src/billing/providers/robokassa';
import { TBankProvider, tbankToken } from '../src/billing/providers/tbank';
import { YooKassaProvider } from '../src/billing/providers/yookassa';
import type { CreatePaymentInput } from '../src/billing/providers/provider';

const md5 = (s: string) => createHash('md5').update(s, 'utf8').digest('hex');

const baseInput: CreatePaymentInput = {
  paymentId: 'pay_1',
  invId: 4242,
  amountMinor: 290_000, // 2 900 ₽
  currency: 'RUB',
  description: 'AgroTraders Seller Standard, monthly',
  returnUrl: 'https://agrotraders.org/billing/return',
  notifyUrl: 'https://api.agrotraders.org/api/billing/webhook/robokassa',
  idempotencyKey: 'idem-1',
  testMode: true,
};

afterEach(() => vi.unstubAllGlobals());

/* ── Robokassa ──────────────────────────────────────────────────── */

describe('Robokassa', () => {
  const p = new RobokassaProvider();
  const creds = { MerchantLogin: 'agrotraders', Password1: 'pass-one', Password2: 'pass-two' };

  it('signs the checkout URL with Password1 over MerchantLogin:OutSum:InvId', async () => {
    const { confirmationUrl } = await p.create({ ...baseInput, bindCard: true }, creds);
    const url = new URL(confirmationUrl!);
    expect(url.origin + url.pathname).toBe('https://auth.robokassa.ru/Merchant/Index.aspx');
    expect(url.searchParams.get('OutSum')).toBe('2900.00');
    expect(url.searchParams.get('InvId')).toBe('4242');
    expect(url.searchParams.get('SignatureValue')).toBe(md5('agrotraders:2900.00:4242:pass-one'));
    expect(url.searchParams.get('Recurring')).toBe('true');
    expect(url.searchParams.get('IsTest')).toBe('1');
  });

  it('omits the recurring flag and test flag when not asked for', async () => {
    const { confirmationUrl } = await p.create({ ...baseInput, testMode: false }, creds);
    const url = new URL(confirmationUrl!);
    expect(url.searchParams.get('Recurring')).toBeNull();
    expect(url.searchParams.get('IsTest')).toBeNull();
  });

  it('accepts a callback signed with Password2 and reports the amount in kopecks', async () => {
    const body = { OutSum: '2900.00', InvId: '4242', SignatureValue: md5('2900.00:4242:pass-two').toUpperCase() };
    const event = await p.verify(body, creds);
    expect(event).toMatchObject({ invId: 4242, status: 'succeeded', amountMinor: 290_000, bindingToken: '4242' });
    expect(p.ack(event!)).toBe('OK4242');
  });

  it('rejects a tampered amount, a wrong password, and a missing signature', async () => {
    const good = md5('2900.00:4242:pass-two');
    // Amount raised, signature left alone — the classic forgery attempt.
    expect(await p.verify({ OutSum: '29000.00', InvId: '4242', SignatureValue: good }, creds)).toBeNull();
    // Signed with Password1, which only ever signs OUTgoing checkout URLs.
    expect(await p.verify({ OutSum: '2900.00', InvId: '4242', SignatureValue: md5('2900.00:4242:pass-one') }, creds)).toBeNull();
    expect(await p.verify({ OutSum: '2900.00', InvId: '4242' }, creds)).toBeNull();
    expect(await p.verify({ OutSum: '2900.00', InvId: '4242', SignatureValue: good }, { MerchantLogin: 'x', Password1: 'a' })).toBeNull();
  });
});

/* ── T-Bank ─────────────────────────────────────────────────────── */

describe('T-Bank', () => {
  const p = new TBankProvider();
  const creds = { TerminalKey: 'TERM123', Password: 'term-password' };

  it('computes the token as sha256 of password-included, key-sorted values', () => {
    // Sorted keys: Amount, OrderId, Password, TerminalKey.
    const expected = createHash('sha256').update('290000' + '4242' + 'term-password' + 'TERM123', 'utf8').digest('hex');
    expect(tbankToken({ TerminalKey: 'TERM123', Amount: 290_000, OrderId: '4242' }, 'term-password')).toBe(expected);
  });

  it('changes the token when any signed value changes', () => {
    const a = tbankToken({ TerminalKey: 'TERM123', Amount: 290_000 }, 'term-password');
    const b = tbankToken({ TerminalKey: 'TERM123', Amount: 290_001 }, 'term-password');
    const c = tbankToken({ TerminalKey: 'TERM123', Amount: 290_000 }, 'other-password');
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it('sends Amount as integer kopecks and binds the card when asked', async () => {
    let sent: Record<string, unknown> = {};
    vi.stubGlobal('fetch', async (_url: string, init: { body: string }) => {
      sent = JSON.parse(init.body) as Record<string, unknown>;
      return new Response(JSON.stringify({ Success: true, PaymentId: 'tb_1', PaymentURL: 'https://securepay/x' }), { status: 200 });
    });

    const created = await p.create({ ...baseInput, bindCard: true, customerKey: 'user_7' }, creds);
    expect(created).toEqual({ providerRef: 'tb_1', confirmationUrl: 'https://securepay/x' });
    expect(sent.Amount).toBe(290_000);
    expect(sent.Recurrent).toBe('Y');
    expect(sent.CustomerKey).toBe('user_7');
    // The token must cover exactly what was sent, minus itself.
    const { Token, ...signed } = sent as Record<string, string>;
    expect(Token).toBe(tbankToken(signed, 'term-password'));
  });

  it('surfaces a provider rejection as a readable error', async () => {
    vi.stubGlobal('fetch', async () =>
      new Response(JSON.stringify({ Success: false, ErrorCode: '9999', Details: 'Терминал не найден' }), { status: 200 }),
    );
    await expect(p.create(baseInput, creds)).rejects.toThrow('Терминал не найден');
  });

  it('accepts a correctly-tokened notification and extracts the RebillId', async () => {
    const body: Record<string, string | number | boolean> = {
      TerminalKey: 'TERM123',
      OrderId: '4242',
      Success: true,
      Status: 'CONFIRMED',
      PaymentId: 'tb_1',
      ErrorCode: '0',
      Amount: 290_000,
      RebillId: 'rb_9',
    };
    const event = await p.verify({ ...body, Token: tbankToken(body, 'term-password') }, creds);
    expect(event).toMatchObject({ invId: 4242, providerRef: 'tb_1', status: 'succeeded', amountMinor: 290_000, bindingToken: 'rb_9' });
    expect(p.ack()).toBe('OK');
  });

  it('rejects a tampered notification, a foreign terminal, and a missing token', async () => {
    const body: Record<string, string | number | boolean> = {
      TerminalKey: 'TERM123',
      OrderId: '4242',
      Status: 'CONFIRMED',
      PaymentId: 'tb_1',
      Amount: 290_000,
    };
    const token = tbankToken(body, 'term-password');
    expect(await p.verify({ ...body, Amount: 1, Token: token }, creds)).toBeNull();
    expect(await p.verify({ ...body, Token: token }, { TerminalKey: 'OTHER', Password: 'term-password' })).toBeNull();
    expect(await p.verify(body, creds)).toBeNull();
  });

  it('maps a rejected status to failed rather than succeeded', async () => {
    const body: Record<string, string | number | boolean> = {
      TerminalKey: 'TERM123',
      OrderId: '4242',
      Status: 'REJECTED',
      PaymentId: 'tb_1',
      Amount: 290_000,
    };
    const event = await p.verify({ ...body, Token: tbankToken(body, 'term-password') }, creds);
    expect(event?.status).toBe('failed');
  });
});

/* ── YooKassa ───────────────────────────────────────────────────── */

describe('YooKassa', () => {
  const p = new YooKassaProvider();
  const creds = { shopId: '123456', secretKey: 'test_secret' };

  it('creates a redirect payment with Basic auth and an idempotency key', async () => {
    let headers: Record<string, string> = {};
    let body: Record<string, unknown> = {};
    vi.stubGlobal('fetch', async (_url: string, init: { headers: Record<string, string>; body: string }) => {
      headers = init.headers;
      body = JSON.parse(init.body) as Record<string, unknown>;
      return new Response(
        JSON.stringify({ id: 'yk_1', status: 'pending', confirmation: { type: 'redirect', confirmation_url: 'https://yoomoney/x' } }),
        { status: 200 },
      );
    });

    const created = await p.create({ ...baseInput, bindCard: true }, creds);
    expect(created).toEqual({ providerRef: 'yk_1', confirmationUrl: 'https://yoomoney/x' });
    expect(headers.Authorization).toBe(`Basic ${Buffer.from('123456:test_secret').toString('base64')}`);
    expect(headers['Idempotence-Key']).toBe('idem-1');
    expect(body).toMatchObject({ amount: { value: '2900.00', currency: 'RUB' }, capture: true, save_payment_method: true });
  });

  it('ignores the webhook body and trusts only the re-fetched payment', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      calls.push(url);
      return new Response(
        JSON.stringify({
          id: 'yk_1',
          status: 'succeeded',
          amount: { value: '2900.00', currency: 'RUB' },
          payment_method: { id: 'pm_1', saved: true },
          metadata: { paymentId: 'pay_1', invId: '4242' },
        }),
        { status: 200 },
      );
    });

    // The notification LIES about the amount; the re-fetch is what we believe.
    const event = await p.verify({ event: 'payment.succeeded', object: { id: 'yk_1', amount: { value: '1.00' } } }, creds);
    expect(calls[0]).toContain('/payments/yk_1');
    expect(event).toMatchObject({ paymentId: 'pay_1', invId: 4242, status: 'succeeded', amountMinor: 290_000, bindingToken: 'pm_1' });
  });

  it('rejects a notification whose payment cannot be read back', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ description: 'Not found' }), { status: 404 }));
    expect(await p.verify({ object: { id: 'forged' } }, creds)).toBeNull();
    // No id at all — nothing to check against.
    expect(await p.verify({ event: 'payment.succeeded' }, creds)).toBeNull();
  });

  it('does not treat an unsaved card as a renewal binding', async () => {
    vi.stubGlobal('fetch', async () =>
      new Response(
        JSON.stringify({ id: 'yk_2', status: 'succeeded', amount: { value: '10.00', currency: 'RUB' }, payment_method: { id: 'pm_2', saved: false } }),
        { status: 200 },
      ),
    );
    const event = await p.verify({ object: { id: 'yk_2' } }, creds);
    expect(event?.bindingToken).toBeUndefined();
  });
});
