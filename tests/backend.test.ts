import { describe, expect, it } from 'vitest';
import { createDemoIdToken, DEMO_TOKEN } from '../apps/backend/src/auth';
import { createApp } from '../apps/backend/src/server';

describe('バックエンドのテナント境界', () => {
  it('IDトークンのsubをCognitoIdと照合してユーザーを取得する', async () => {
    const response = await createApp().fetch('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${createDemoIdToken('cognito-admin-2')}`,
      },
      body: JSON.stringify({ query: '{ me { id username } }' }),
    });
    expect((await response.json()).data.me).toEqual({ id: 'admin-2', username: '運用管理者' });
  });

  it('subに対応するユーザーが存在しない場合は認証エラーにする', async () => {
    const response = await createApp().fetch('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${createDemoIdToken('missing-cognito-user')}`,
      },
      body: JSON.stringify({ query: '{ me { id } }' }),
    });
    expect((await response.json()).errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });
  it.each([null, 'tenant-b'])('所属と異なるヘッダー %s では更新できない', async (tenantId) => {
    const app = createApp();
    const response = await app.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${DEMO_TOKEN}`,
        ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
      },
      body: JSON.stringify({
        query:
          'mutation { updateTenantUser(id: "user-a1", input: {username: "不正な更新"}) { id } }',
      }),
    });
    const body = await response.json();
    expect(body.errors[0].extensions.code).toBe(tenantId ? 'NOT_FOUND' : 'BAD_USER_INPUT');
  });

  it.each([
    [null, 'BAD_USER_INPUT'],
    ['tenant-b', null],
  ])('ユーザー作成はヘッダー %s のテナントに作る', async (tenantId, code) => {
    const response = await createApp().fetch('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${DEMO_TOKEN}`,
        ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
      },
      body: JSON.stringify({
        query:
          'mutation { createTenantUser(input: {username: "新規"}) { tenantId role username } }',
      }),
    });
    const body = await response.json();
    if (code) expect(body.errors[0].extensions.code).toBe(code);
    else
      expect(body.data.createTenantUser).toEqual({
        tenantId: 'tenant-b',
        role: 'TENANT_USER',
        username: '新規',
      });
  });

  it('テナント指定なしの商品取得を拒否する', async () => {
    const response = await createApp().fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${DEMO_TOKEN}` },
      body: JSON.stringify({ query: '{ products { id } }' }),
    });
    expect((await response.json()).errors[0].extensions.code).toBe('BAD_USER_INPUT');
  });

  it('テナント指定付きの管理者更新を拒否する', async () => {
    const response = await createApp().fetch('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${DEMO_TOKEN}`,
        'x-tenant-id': 'tenant-a',
      },
      body: JSON.stringify({
        query:
          'mutation { updateSystemAdministrator(id: "admin-1", input: {username: "不正な更新"}) { id } }',
      }),
    });
    expect((await response.json()).errors[0].extensions.code).toBe('BAD_USER_INPUT');
  });
});
