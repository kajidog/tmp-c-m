import { afterEach, describe, expect, it, vi } from 'vitest';
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

  it('同時初期化でもセッションとmeを一度だけ取得し、以降は保存済みトークンを使う', async () => {
    const session = mockSession();
    const transport = createTransport();
    const auth = createAuthService(transport);
    await Promise.all([auth.initialize(), auth.initialize(), auth.initialize()]);
    expect(session.getSession).toHaveBeenCalledTimes(1);
    expect(transport.requests).toHaveLength(1);
    expect(transport.requests[0].headers.get('x-tenant-id')).toBeNull();
    expect(auth.store.getState()).toMatchObject({
      status: 'authenticated',
      user: { id: 'admin-1', tenantId: null },
    });
    await auth.clients.get(GLOBAL_SCOPE).query({ query: TenantUsersDocument });
    await auth.initialize();
    expect(session.getSession).toHaveBeenCalledTimes(1);
    auth.logout();
    expect(auth.store.getState()).toMatchObject({ status: 'anonymous', user: null });
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
    await auth.login();
    expect(auth.store.getState().status).toBe('authenticated');
    expect(session.getSession).toHaveBeenCalledTimes(2);
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
