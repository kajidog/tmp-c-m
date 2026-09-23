import { ApolloProvider } from '@apollo/client';
import { createContext, type ReactNode, useContext } from 'react';
import { type ApiClients, type ApiScope, scopeKey } from './clients';

const ClientsContext = createContext<ApiClients | null>(null);

export function ApiClientsProvider({
  clients,
  children,
}: {
  clients: ApiClients;
  children: ReactNode;
}) {
  return <ClientsContext.Provider value={clients}>{children}</ClientsContext.Provider>;
}

// 別スコープのClientのキャッシュを触るときだけ使います。
// 自分のスコープのClientはApolloの useApolloClient / useMutation が渡してくれます。
export function useApiClients() {
  const clients = useContext(ClientsContext);
  if (!clients) throw new Error('ApiClientsProvider is required');
  return clients;
}

export function ApiScopeProvider({ scope, children }: { scope: ApiScope; children: ReactNode }) {
  const clients = useApiClients();
  // keyで配下を再マウントし、前の対象の表示・フォーム状態を持ち越しません。
  return (
    <ApolloProvider key={scopeKey(scope)} client={clients.get(scope)}>
      {children}
    </ApolloProvider>
  );
}
