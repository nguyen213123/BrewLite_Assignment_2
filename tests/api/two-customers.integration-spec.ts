import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../apps/api/src/app.module';
import { configureApp } from '../../apps/api/src/setup';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { createTempDatabase, type TempDatabase } from './support/temp-database';

jest.setTimeout(30000);
const integration = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;
integration('Two customers competing for two cups', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let db: TempDatabase | undefined;
  const tokens: string[] = [];
  const originalEnv = { ...process.env };
  beforeAll(async () => {
    db = await createTempDatabase(originalEnv.DATABASE_URL);
    process.env.DATABASE_URL = db.url;
    process.env.JWT_SECRET = 'two-customers-test-only-secret-longer-than-32';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init(); await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    for (const name of ['A', 'B']) {
      const auth = await request(app.getHttpServer()).post('/api/auth/register')
        .send({ email: `${name}-${randomUUID()}@example.com`, password: 'PrivateCustomer123!' }).expect(201);
      tokens.push(auth.body.accessToken as string);
    }
  }, 120000);
  afterAll(async () => {
    try { await app?.close(); } finally { process.env = originalEnv; await db?.drop(); }
  }, 60000);

  async function fixture() {
    const ingredient = await prisma.ingredient.create({ data: {
      name: `Two-cup ingredient ${randomUUID()}`, unit: 'PIECE', stock: 2, packageSize: 1, packageLabel: 'unit',
    } });
    const product = await prisma.product.create({ data: {
      name: 'Two-cup coffee', description: '', imageUrl: 'http://localhost/test.png', price: 50000,
      sizes: { create: { size: 'S', price: 50000 } }, ingredients: { create: { ingredientId: ingredient.id, amount: 1 } },
    } });
    return { ingredient, product };
  }
  function order(customer: number, productId: string, qty: number) {
    return request(app.getHttpServer()).post('/api/orders').auth(tokens[customer], { type: 'bearer' })
      .set('Idempotency-Key', randomUUID()).send({ items: [{ productId, size: 'S', qty }] });
  }
  async function verifyWinner(customer: number, orderId: string, qty: number, ingredientId: string) {
    const held = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(held).toMatchObject({ status: 'PENDING', reservationStatus: 'HELD', total: 50000 * qty });
    expect((await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredientId } })).stock).toBe(2 - qty);
    const paid = await request(app.getHttpServer()).post('/api/payments').auth(tokens[customer], { type: 'bearer' })
      .set('Idempotency-Key', randomUUID()).send({ orderId, method: 'CARD', mockOutcome: 'SUCCESS' }).expect(200);
    expect(paid.body.order.status).toBe('PAID');
    expect((await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredientId } })).stock).toBe(2 - qty);
    expect(await prisma.payment.count({ where: { orderId, status: 'SUCCEEDED' } })).toBe(1);
  }

  for (const quantities of [[1, 2], [2, 1]]) {
    for (const first of [0, 1]) {
      it(`stock=2; A=${quantities[0]}, B=${quantities[1]}; ${first === 0 ? 'A' : 'B'} reserves first`, async () => {
        const f = await fixture();
        const winner = await order(first, f.product.id, quantities[first]).expect(201);
        const loser = await order(1 - first, f.product.id, quantities[1 - first]).expect(409);
        expect(loser.body.code).toBe('OUT_OF_STOCK');
        expect(await prisma.order.count({ where: { items: { some: { productId: f.product.id } } } })).toBe(1);
        await verifyWinner(first, winner.body.id as string, quantities[first], f.ingredient.id);
      });
    }
    it(`stock=2; A=${quantities[0]}, B=${quantities[1]}; concurrent creation followed by payment`, async () => {
      const f = await fixture();
      const results = await Promise.all([order(0, f.product.id, quantities[0]), order(1, f.product.id, quantities[1])]);
      expect(results.map(result => result.status).sort()).toEqual([201, 409]);
      const winner = results.findIndex(result => result.status === 201);
      expect(results[1 - winner].body.code).toBe('OUT_OF_STOCK');
      expect(await prisma.order.count({ where: { items: { some: { productId: f.product.id } } } })).toBe(1);
      await verifyWinner(winner, results[winner].body.id as string, quantities[winner], f.ingredient.id);
    });
  }
});
