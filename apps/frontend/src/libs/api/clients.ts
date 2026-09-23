import {
  type ApolloCache,
  ApolloClient,
  HttpLink,
  InMemoryCache,
  type NormalizedCacheObject,
  split,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { getMainDefinition } from '@apollo/client/utilities';
import type { Query } from '../../api/graphql';
import { GraphqlSseLink } from './GraphqlSseLink';

export type TenantScope = { kind: 'tenant'; tenantId: string };
export type ApiScope = { kind: 'global' } | TenantScope;
export const GLOBAL_SCOPE: ApiScope = { kind: 'global' };
export const scopeKey = (scope: ApiScope) =>
  scope.kind === 'global' ? 'global' : `tenant:${scope.tenantId}`;
export type ApiClient = ApolloClient<NormalizedCacheObject>;

// スキーマのルートフィールドに限定し、無効化するフィールド名の打ち間違いを型で防ぎます。
export type QueryField = keyof Omit<Query, '__typename'>;

// ルートの一覧フィールドを捨て、次の読み取りでサーバーに問い合わせ直させます。
// エンティティ自体はmutationの戻り値で更新されるため、捨てるのは一覧の並びと件数です。
export function evictQueryFields(cache: ApolloCache<unknown>, fields: QueryField[]) {
  for (const fieldName of fields) cache.evict({ id: 'ROOT_QUERY', fieldName });
  cache.gc();
}

type Options = {
  // リクエストのたびに呼びます。Cognitoのセッション取得は期限切れなら更新して返します。
  getToken: () => Promise<string | null>;
  onUnauthorized: () => void;
  uri?: string;
  fetch?: typeof fetch;
};

// 認証セッションごとに管理します。生成後のClientの対象テナントは変更しません。
export function createApiClients(options: Options) {
  const clients = new Map<string, ApiClient>();
  const subscriptions = new Map<string, GraphqlSseLink>();

  function get(scope: ApiScope): ApiClient {
    const key = scopeKey(scope);
    const existing = clients.get(key);
    if (existing) return existing;
    if (scope.kind === 'tenant' && !scope.tenantId) throw new Error('tenantId is required');
    const tenantId = scope.kind === 'tenant' ? scope.tenantId : null;

    const errors = onError(({ graphQLErrors, networkError }) => {
      const status = networkError && 'statusCode' in networkError ? networkError.statusCode : null;
      if (status === 401 || graphQLErrors?.some((e) => e.extensions?.code === 'UNAUTHENTICATED')) {
        options.onUnauthorized();
      }
    });
    // HttpLinkとSSEの両方がこの関数を使うため、トークンの取り直しはここ1箇所で済みます。
    const getHeaders = async (): Promise<Record<string, string>> => {
      const token = await options.getToken();
      if (!token) {
        options.onUnauthorized();
        throw new Error('ログインしてください。');
      }
      return {
        Authorization: `Bearer ${token}`,
        ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
      };
    };
    const auth = setContext(async () => ({ headers: await getHeaders() }));
    // connectedは購読を開始した後にしか発火しないため、生成後のClientをここで受け取ります。
    let self: ApiClient | null = null;
    const sse = new GraphqlSseLink({
      url: options.uri ?? '/graphql',
      headers: getHeaders,
      fetchFn: options.fetch,
      on: {
        connected(reconnected) {
          // 切断中の変更を補うため、再接続したら表示中のQueryを取り直します。
          if (reconnected) void self?.refetchQueries({ include: 'active' }).catch(() => undefined);
        },
      },
    });
    const transport = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
      },
      sse,
      auth.concat(new HttpLink({ uri: options.uri ?? '/graphql', fetch: options.fetch })),
    );
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: errors.concat(transport),
      defaultOptions: { watchQuery: { fetchPolicy: 'cache-first' } },
    });
    self = client;
    clients.set(key, client);
    subscriptions.set(key, sse);
    return client;
  }

  // 別のClientのキャッシュを無効化します。同じClientの中は正規化キャッシュが揃えるため不要です。
  async function invalidate(scope: ApiScope, fields: QueryField[]) {
    // 未生成のClientにはキャッシュがないため、無効化のためだけには生成しません。
    const client = clients.get(scopeKey(scope));
    if (!client) return;
    await client.refetchQueries({ updateCache: (cache) => evictQueryFields(cache, fields) });
  }

  function clear() {
    for (const subscription of subscriptions.values()) subscription.dispose();
    subscriptions.clear();
    for (const client of clients.values()) {
      client.stop();
      // 次のセッションを開始する前に、保持したデータを同期的に破棄します。
      client.cache.restore({});
    }
    clients.clear();
  }

  return { get, invalidate, clear };
}

export type ApiClients = ReturnType<typeof createApiClients>;
