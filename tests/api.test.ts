import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_TOKEN } from '../apps/backend/src/auth';
import { ProductsDocument } from '../apps/frontend/src/features/products/products.api';
import {
  TenantUsersDocument,
  UpdateTenantUserDocument,
} from '../apps/frontend/src/features/users/users.api';
import {
  type ApiClients,
  createApiClients,
  GLOBAL_SCOPE,
} from '../apps/frontend/src/libs/api/clients';
import { createTransport } from './helpers';

const tenantA = { kind: 'tenant', tenantId: 'tenant-a' } as const;
const tenantB = { kind: 'tenant', tenantId: 'tenant-b' } as const;
const registries: ApiClients[] = [];
afterEach(() => {
  for (const registry of registries.splice(0)) registry.clear();
});

function setup() {
  const transport = createTransport();
  const clients = createApiClients({
    ...transport,
    getToken: () => DEMO_TOKEN,
    onUnauthorized: vi.fn(),
  });
  registries.push(clients);
  return { clients, ...transport };
}

describe('テナント別Client', () => {
  it('同じクエリを同時に送っても対象ごとに通信・キャッシュを分離する', async () => {
    const { clients, requests } = setup();
    const [a, b, all] = await Promise.all([
      clients.get(tenantA).query({ query: TenantUsersDocument }),
      clients.get(tenantB).query({ query: TenantUsersDocument }),
      clients.get(GLOBAL_SCOPE).query({ query: TenantUsersDocument }),
    ]);
    expect(a.data.tenantUsers.map((u) => u.tenantId)).toEqual(['tenant-a', 'tenant-a']);
    expect(b.data.tenantUsers.map((u) => u.tenantId)).toEqual(['tenant-b']);
    expect(all.data.tenantUsers).toHaveLength(3);
    expect(requests).toHaveLength(3);
    expect(requests.map((r) => r.headers.get('x-tenant-id')).sort()).toEqual(
      ['tenant-a', 'tenant-b', null].sort(),
    );
    expect(requests.every((r) => r.headers.get('authorization') === `Bearer ${DEMO_TOKEN}`)).toBe(
      true,
    );
    expect(clients.get(tenantA)).toBe(clients.get({ ...tenantA }));
    expect(clients.get(tenantA).cache).not.toBe(clients.get(tenantB).cache);
    await clients.get(tenantA).query({ query: TenantUsersDocument });
    expect(requests).toHaveLength(3);
  });

  it('テナント編集後に表示中の全体一覧を再取得し、非表示の一覧も無効化する', async () => {
    const { clients, requests } = setup();
    const global = clients.get(GLOBAL_SCOPE);
    const a = clients.get(tenantA);
    await global.query({ query: TenantUsersDocument });
    await a.query({ query: TenantUsersDocument });
    const observed = global.watchQuery({ query: TenantUsersDocument });
    const updates: string[] = [];
    const subscription = observed.subscribe((result) => {
      if (result.data?.tenantUsers) updates.push(result.data.tenantUsers[0].username);
    });
    try {
      await a.mutate({
        mutation: UpdateTenantUserDocument,
        variables: { id: 'user-a1', input: { username: '変更した名前' } },
      });
      await Promise.all([
        clients.invalidate(GLOBAL_SCOPE, ['tenantUsers']),
        clients.invalidate(tenantA, ['tenantUsers']),
      ]);
      expect(updates).toContain('変更した名前');
      const before = requests.length;
      expect((await a.query({ query: TenantUsersDocument })).data.tenantUsers[0].username).toBe(
        '変更した名前',
      );
      expect(requests.length).toBe(before + 1);
    } finally {
      subscription.unsubscribe();
    }
  });

  it('非表示の全体一覧も再表示時に更新される', async () => {
    const { clients } = setup();
    await clients.get(GLOBAL_SCOPE).query({ query: TenantUsersDocument });
    await clients.get(tenantA).mutate({
      mutation: UpdateTenantUserDocument,
      variables: { id: 'user-a1', input: { username: '新しい名前' } },
    });
    await clients.invalidate(GLOBAL_SCOPE, ['tenantUsers']);
    expect(
      (await clients.get(GLOBAL_SCOPE).query({ query: TenantUsersDocument })).data.tenantUsers[0]
        .username,
    ).toBe('新しい名前');
  });

  it('遅い旧テナントの応答が別テナントのキャッシュに入らない', async () => {
    const transport = createTransport();
    let release = () => {};
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    const clients = createApiClients({
      ...transport,
      fetch: async (input, init) => {
        if (new Headers(init?.headers).get('x-tenant-id') === 'tenant-a') await wait;
        return transport.fetch(input, init);
      },
      getToken: () => DEMO_TOKEN,
      onUnauthorized: vi.fn(),
    });
    registries.push(clients);
    const a = clients.get(tenantA).query({ query: ProductsDocument });
    const b = await clients.get(tenantB).query({ query: ProductsDocument });
    release();
    await a;
    expect(b.data.products.every((p) => p.tenantId === 'tenant-b')).toBe(true);
    expect(clients.get(tenantB).readQuery({ query: ProductsDocument })).toEqual(b.data);
  });

  it('セッション破棄後はClientを再利用しない', async () => {
    const { clients } = setup();
    const previous = clients.get(tenantA);
    await previous.query({ query: ProductsDocument });
    clients.clear();
    expect(previous.cache.extract()).toEqual({});
    expect(clients.get(tenantA)).not.toBe(previous);
    expect(clients.get(tenantA).cache.extract()).toEqual({});
  });
});
