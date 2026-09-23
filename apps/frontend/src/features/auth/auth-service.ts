import { createStore } from 'zustand/vanilla';
import type { MeQuery } from '../../api/graphql';
import { createApiClients, GLOBAL_SCOPE } from '../../libs/api/clients';
import { getSession, signIn, signOut } from '../../libs/cognito';
import { MeDocument } from './auth.api';

type User = NonNullable<MeQuery['me']>;
type AuthState = {
  status: 'loading' | 'authenticated' | 'anonymous';
  user: User | null;
  error: string | null;
};

export function createAuthService(transport: { uri?: string; fetch?: typeof fetch } = {}) {
  const store = createStore<AuthState>(() => ({ status: 'loading', user: null, error: null }));
  // トークンは保持せず、リクエストのたびにセッションから取り直します。
  // ログアウト後も保存先にトークンが残っている場合に送らないよう、このフラグで止めます。
  let sessionActive = false;
  // StrictModeなどで同時に初期化されても、セッション確認とme取得を共有します。
  let initialization: Promise<void> | null = null;
  // ログアウト前に始まった非同期処理による、古い認証状態の復元を防ぎます。
  let generation = 0;
  const clients = createApiClients({
    ...transport,
    getToken: async () => {
      if (!sessionActive) return null;
      try {
        return (await getSession())?.idToken ?? null;
      } catch {
        // セッションを取得できない場合は未ログイン扱いにし、onUnauthorizedへ集約します。
        return null;
      }
    },
    onUnauthorized: () => reset('ログインし直してください。'),
  });

  function reset(error: string | null = null) {
    generation++;
    sessionActive = false;
    initialization = null;
    try {
      signOut();
    } catch {
      // 保存先にアクセスできない場合も、画面とメモリ上の認証状態は破棄します。
    }
    clients.clear();
    store.setState({ status: 'anonymous', user: null, error });
  }

  function initialize(): Promise<void> {
    if (initialization) return initialization;
    const attempt = generation;
    store.setState({ status: 'loading', error: null });
    initialization = (async () => {
      try {
        const currentSession = await getSession();
        if (attempt !== generation) return;
        if (!currentSession?.idToken) {
          reset();
          return;
        }
        sessionActive = true;
        const { data } = await clients
          .get(GLOBAL_SCOPE)
          .query({ query: MeDocument, fetchPolicy: 'network-only' });
        if (attempt !== generation) return;
        if (!data.me) throw new Error('ユーザー情報を取得できませんでした。');
        store.setState({ status: 'authenticated', user: data.me, error: null });
      } catch {
        if (attempt === generation) reset('セッションまたはユーザー情報を取得できませんでした。');
      }
    })();
    return initialization;
  }

  async function login() {
    try {
      await signIn();
      initialization = null;
      await initialize();
    } catch {
      reset('ログインできませんでした。');
    }
  }

  function updateCurrentUser(user: User) {
    if (store.getState().user?.id === user.id) store.setState({ user });
  }

  return { store, clients, initialize, login, logout: () => reset(), updateCurrentUser };
}

export type AuthService = ReturnType<typeof createAuthService>;
