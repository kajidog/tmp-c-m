import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_TOKEN } from '../apps/backend/src/auth';
import { createApp } from '../apps/backend/src/server';
import {
  ProductChangedDocument,
  ProductsDocument,
  UpdateProductDocument,
} from '../apps/frontend/src/features/products/products.api';
import { createApiClients, GLOBAL_SCOPE } from '../apps/frontend/src/libs/api/clients';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

async function setup() {
  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const uri = `http://127.0.0.1:${(server.address() as AddressInfo).port}/graphql`;
  const streams: { tenantId: string | null; headers: Headers; signal: AbortSignal }[] = [];
  const publisher = createApiClients({ uri, getToken: () => DEMO_TOKEN, onUnauthorized: vi.fn() });
  const clients = createApiClients({
    uri,
    getToken: () => DEMO_TOKEN,
    onUnauthorized: vi.fn(),
    fetch: async (input, init) => {
      const request = new Request(input, init);
      const response = await fetch(request);
      if (request.headers.get('accept') === 'text/event-stream') {
        streams.push({
          tenantId: request.headers.get('x-tenant-id'),
          headers: request.headers,
          signal: request.signal,
        });
      }
      return response;
    },
  });
  cleanups.push(async () => {
    clients.clear();
    publisher.clear();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
  return { clients, publisher, streams };
}

describe('graphql-sseによる購読', () => {
  it('認証とテナントのヘッダーを送り、同じテナントの変更だけを受信してキャッシュを更新する', async () => {
    const { clients, publisher, streams } = await setup();
    const a = clients.get({ kind: 'tenant', tenantId: 'tenant-a' });
    const b = clients.get({ kind: 'tenant', tenantId: 'tenant-b' });
    await Promise.all([a.query({ query: ProductsDocument }), b.query({ query: ProductsDocument })]);
    const eventsA: string[] = [];
    const eventsB: string[] = [];
    const errors: unknown[] = [];
    const subscriptionA = a.subscribe({ query: ProductChangedDocument }).subscribe({
      next: (result) => eventsA.push(result.data?.productChanged.tenantId ?? ''),
      error: (error) => errors.push(error),
    });
    b.subscribe({ query: ProductChangedDocument }).subscribe({
      next: (result) => eventsB.push(result.data?.productChanged.tenantId ?? ''),
      error: (error) => errors.push(error),
    });
    await vi.waitFor(() => expect(streams).toHaveLength(2));
    expect(
      streams.every((stream) => stream.headers.get('authorization') === `Bearer ${DEMO_TOKEN}`),
    ).toBe(true);

    await publisher.get({ kind: 'tenant', tenantId: 'tenant-a' }).mutate({
      mutation: UpdateProductDocument,
      variables: { id: 'product-a1', input: { name: 'SSEで更新', price: 777 } },
    });
    await publisher.get({ kind: 'tenant', tenantId: 'tenant-b' }).mutate({
      mutation: UpdateProductDocument,
      variables: { id: 'product-b1', input: { name: 'Bの商品', price: 888 } },
    });
    await vi.waitFor(() => {
      expect(eventsA).toEqual(['tenant-a']);
      expect(eventsB).toEqual(['tenant-b']);
    });
    expect(a.readQuery({ query: ProductsDocument })?.products[0].price).toBe(777);
    expect(b.readQuery({ query: ProductsDocument })?.products[0].price).toBe(888);
    expect(errors).toEqual([]);

    subscriptionA.unsubscribe();
    await vi.waitFor(() =>
      expect(streams.find((stream) => stream.tenantId === 'tenant-a')?.signal.aborted).toBe(true),
    );
    clients.clear();
    await vi.waitFor(() => expect(streams.every((stream) => stream.signal.aborted)).toBe(true));
  });

  it('テナント指定なしの商品購読を拒否する', async () => {
    const { clients } = await setup();
    const error = await new Promise<Error>((resolve) => {
      clients
        .get(GLOBAL_SCOPE)
        .subscribe({ query: ProductChangedDocument })
        .subscribe({ error: resolve });
    });
    expect(error.message).toContain('テナントを指定してください');
  });
});
