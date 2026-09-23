import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../apps/backend/src/server';
import { createAuthService } from '../apps/frontend/src/features/auth/auth-service';
import { TenantUsersDocument } from '../apps/frontend/src/features/users/users.api';
import { GLOBAL_SCOPE } from '../apps/frontend/src/libs/api/clients';
import * as cognito from '../apps/frontend/src/libs/cognito';
import { createTransport } from './helpers';

function mockSession() {
  return {
    getSession: vi
      .spyOn(cognito, 'getSession')
      .mockResolvedValue({ idToken: cognito.DEMO_ID_TOKEN }),
    signIn: vi.spyOn(cognito, 'signIn').mockResolvedValue(),
    signOut: vi.spyOn(cognito, 'signOut').mockImplementation(() => {}),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('認証の初期化', () => {
  it('セッション保存先にアクセスできなくても未認証の状態になる', async () => {
    const session = mockSession();
    session.getSession.mockRejectedValue(new Error('保存先にアクセスできません。'));
    session.signOut.mockImplementation(() => {
      throw new Error('保存先にアクセスできません。');
    });
    const auth = createAuthService(createTransport());
    await auth.initialize();
    expect(auth.store.getState()).toMatchObject({ status: 'anonymous', user: null });
  });

  it('同時初期化でもmeの取得は1回に共有し、以降はリクエストごとにトークンを取り直す', async () => {
    const session = mockSession();
    const transport = createTransport();
    const auth = createAuthService(transport);
    await Promise.all([auth.initialize(), auth.initialize(), auth.initialize()]);
    // 同時に呼んでも初期化は共有され、meの送信は1本だけです。
    expect(transport.requests).toHaveLength(1);
    expect(transport.requests[0].headers.get('x-tenant-id')).toBeNull();
    expect(auth.store.getState()).toMatchObject({
      status: 'authenticated',
      user: { id: 'admin-1', tenantId: null },
    });
    // 送信のたびにセッションを取り直すため、期限切れのトークンを送り続けません。
    const before = session.getSession.mock.calls.length;
    await auth.clients.get(GLOBAL_SCOPE).query({ query: TenantUsersDocument });
    expect(session.getSession.mock.calls.length).toBe(before + 1);
    // 初期化そのものは再実行しません。
    await auth.initialize();
    expect(transport.requests).toHaveLength(2);
    auth.logout();
    expect(auth.store.getState()).toMatchObject({ status: 'anonymous', user: null });
  });

  it('ログアウト後は保存先にトークンが残っていてもリクエストを送らない', async () => {
    // signOutのモックは保存先を消さないため、getSessionはトークンを返し続けます。
    mockSession();
    const transport = createTransport();
    const auth = createAuthService(transport);
    await auth.initialize();
    auth.logout();
    const before = transport.requests.length;
    await expect(
      auth.clients.get(GLOBAL_SCOPE).query({ query: TenantUsersDocument }),
    ).rejects.toThrow('ログインしてください。');
    expect(transport.requests).toHaveLength(before);
  });

  it.each(['missing', 'empty', 'session-error', 'user-missing', 'network-error', 'invalid-token'])(
    '%sなら未認証になり業務画面を開かない',
    async (reason) => {
      const session = mockSession();
      if (reason === 'missing') session.getSession.mockResolvedValue(null);
      if (reason === 'empty') session.getSession.mockResolvedValue({ idToken: '' });
      if (reason === 'session-error') session.getSession.mockRejectedValue(new Error('取得失敗'));
      if (reason === 'invalid-token') session.getSession.mockResolvedValue({ idToken: 'invalid' });
      const transport = createTransport();
      if (reason === 'user-missing')
        transport.fetch = async () => Response.json({ data: { me: null } });
      if (reason === 'network-error')
        transport.fetch = async () => {
          throw new Error('通信失敗');
        };
      const auth = createAuthService(transport);
      await auth.initialize();
      expect(auth.store.getState()).toMatchObject({ status: 'anonymous', user: null });
      expect(session.signOut).toHaveBeenCalled();
    },
  );

  it('初期化失敗後にデモログインして再初期化できる', async () => {
    const session = mockSession();
    session.getSession.mockResolvedValueOnce(null);
    const auth = createAuthService(createTransport());
    await auth.initialize();
    expect(auth.store.getState().status).toBe('anonymous');
    const before = session.getSession.mock.calls.length;
    await auth.login();
    expect(auth.store.getState().status).toBe('authenticated');
    // 前回の結果を使い回さず、ログイン後にセッションを取り直しています。
    expect(session.getSession.mock.calls.length).toBeGreaterThan(before);
    expect(session.signIn).toHaveBeenCalledOnce();
    auth.logout();
  });

  it('ログアウト後に初期化が完了してもユーザー情報を復元しない', async () => {
    let release = (_: cognito.Session) => {};
    const session = mockSession();
    session.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const auth = createAuthService(createTransport());
    const pending = auth.initialize();
    auth.logout();
    release({ idToken: cognito.DEMO_ID_TOKEN });
    await pending;
    expect(auth.store.getState().status).toBe('anonymous');
  });

  it('Cognitoのモック関数はlocalStorageでセッションを読み書きする', async () => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    });
    expect(await cognito.getSession()).toBeNull();
    await cognito.signIn();
    expect(await cognito.getSession()).toEqual({ idToken: cognito.DEMO_ID_TOKEN });
    cognito.signOut();
    expect(await cognito.getSession()).toBeNull();
  });
});

describe('セッション中のトークン失効', () => {
  async function authenticated() {
    const app = createApp();
    let expired = false;
    mockSession();
    const auth = createAuthService({
      uri: 'http://localhost/graphql',
      fetch: async (input, init) =>
        expired
          ? Response.json({
              errors: [
                { message: 'ログインしてください。', extensions: { code: 'UNAUTHENTICATED' } },
              ],
            })
          : app.fetch(new Request(input as never, init)),
    });
    await auth.initialize();
    expect(auth.store.getState().status).toBe('authenticated');
    return { auth, expire: () => (expired = true) };
  }

  it('業務画面のQueryがUNAUTHENTICATEDを返したらログイン画面へ戻す', async () => {
    const { auth, expire } = await authenticated();
    expire();
    await expect(
      auth.clients
        .get({ kind: 'tenant', tenantId: 'tenant-a' })
        .query({ query: TenantUsersDocument, fetchPolicy: 'network-only' }),
    ).rejects.toThrow();
    expect(auth.store.getState()).toMatchObject({
      status: 'anonymous',
      user: null,
      error: 'ログインし直してください。',
    });
  });

  it('プロキシなどがHTTP 401を返した場合もログイン画面へ戻す', async () => {
    mockSession();
    let expired = false;
    const app = createApp();
    const auth = createAuthService({
      uri: 'http://localhost/graphql',
      fetch: async (input, init) =>
        expired
          ? new Response('Unauthorized', { status: 401 })
          : app.fetch(new Request(input as never, init)),
    });
    await auth.initialize();
    expect(auth.store.getState().status).toBe('authenticated');
    expired = true;
    await expect(
      auth.clients
        .get(GLOBAL_SCOPE)
        .query({ query: TenantUsersDocument, fetchPolicy: 'network-only' }),
    ).rejects.toThrow();
    expect(auth.store.getState()).toMatchObject({
      status: 'anonymous',
      error: 'ログインし直してください。',
    });
  });
});
