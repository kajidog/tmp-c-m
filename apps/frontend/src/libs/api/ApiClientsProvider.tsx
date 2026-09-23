import { createContext, type ReactNode, useContext } from 'react';
import type { ApiClient, ApiClients, ApiScope } from './clients';

const ClientsContext = createContext<ApiClients | null>(null);

// ApolloProviderは置きません。useQuery / useMutation に client を渡し忘れると、
// 既定のClientで黙って送られるのではなく、Apolloのエラーとして気づけます。
export function ApiClientsProvider({
  clients,
  children,
}: {
  clients: ApiClients;
  children: ReactNode;
}) {
  return <ClientsContext.Provider value={clients}>{children}</ClientsContext.Provider>;
}

// 送信時に対象が決まる操作（作成フォームなど）と、別スコープのキャッシュの無効化に使います。
export function useApiClients() {
  const clients = useContext(ClientsContext);
  if (!clients) throw new Error('ApiClientsProvider is required');
  return clients;
}

// 呼び出し側で対象を明示し、useQuery(Doc, { client: useApiClient(scope) }) の形で使います。
export function useApiClient(scope: ApiScope): ApiClient {
  return useApiClients().get(scope);
}
