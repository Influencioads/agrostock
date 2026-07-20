import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { io, type Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';

/**
 * Integration test for BOTH chat systems against the running dev database.
 * Boots the real Nest app (default in-memory Socket.IO adapter) and exercises:
 *  - Community realtime: a message reaches another group member live.
 *  - Live Support IDOR: a second user cannot read someone else's ticket.
 *  - System separation is implicit (distinct namespaces + routes).
 *
 * Requires the local Postgres (localhost:5544) to be up and seeded. The database
 * name/credentials are still `agrostock` — a legacy identifier, kept so the
 * existing volume keeps resolving.
 */
describe('chat systems (integration)', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || 'postgresql://agrostock:agrostock@localhost:5544/agrostock?schema=public';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0);
    const url = await app.getUrl();
    base = url.replace('[::1]', 'localhost').replace('0.0.0.0', 'localhost');
  }, 40_000);

  afterAll(async () => {
    await app?.close();
  });

  async function login(email: string): Promise<string> {
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    });
    const json = (await res.json()) as { accessToken: string };
    return json.accessToken;
  }

  function connect(namespace: string, token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socket = io(`${base}${namespace}`, { auth: { token }, transports: ['websocket'], forceNew: true });
      socket.on('ready', () => resolve(socket));
      socket.on('connect_error', reject);
      setTimeout(() => reject(new Error('socket ready timeout')), 8000);
    });
  }

  it('delivers a community group message in real time to another member', async () => {
    const [buyerTok, sellerTok] = await Promise.all([login('buyer@agrotraders.org'), login('seller@agrotraders.org')]);

    const groups = (await (await fetch(`${base}/api/community/groups`)).json()) as Array<{ id: string }>;
    const groupId = groups[0].id;

    const [buyer, seller] = await Promise.all([connect('/community', buyerTok), connect('/community', sellerTok)]);
    try {
      await Promise.all([
        new Promise((r) => buyer.emit('group:join', { groupId }, r)),
        new Promise((r) => seller.emit('group:join', { groupId }, r)),
      ]);

      const received = new Promise<Record<string, unknown>>((resolve) => {
        seller.on('message:new', (m: Record<string, unknown>) => {
          if (m.groupId === groupId) resolve(m);
        });
      });

      const body = 'Need 100 MT wheat in Moscow ' + Date.now();
      buyer.emit('message:send', { groupId, body, tempId: 't1' });

      const msg = await Promise.race([
        received,
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('no message received')), 8000)),
      ]);
      expect(msg.body).toBe(body);
      expect(msg.tempId).toBe('t1');
    } finally {
      buyer.close();
      seller.close();
    }
  }, 30_000);

  it('prevents a different user from reading a support ticket (IDOR)', async () => {
    const [buyerTok, sellerTok] = await Promise.all([login('buyer@agrotraders.org'), login('seller@agrotraders.org')]);

    const created = await fetch(`${base}/api/support/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerTok}` },
      body: JSON.stringify({ category: 'technical', subject: 'Test IDOR', description: 'secret details' }),
    });
    const ticket = (await created.json()) as { id: string };
    expect(ticket.id).toBeTruthy();

    const asOwner = await fetch(`${base}/api/support/tickets/${ticket.id}`, {
      headers: { Authorization: `Bearer ${buyerTok}` },
    });
    expect(asOwner.status).toBe(200);

    const asOther = await fetch(`${base}/api/support/tickets/${ticket.id}`, {
      headers: { Authorization: `Bearer ${sellerTok}` },
    });
    expect(asOther.status).toBe(403);
  }, 30_000);
});
