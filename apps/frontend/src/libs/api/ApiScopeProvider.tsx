import { ApolloProvider } from '@apollo/client';
import { createContext, type ReactNode, useContext } from 'react';
import { type ApiClients, type ApiScope, scopeKey } from './clients';

const ClientsContext = createContext<ApiClients | null>(null);
const ScopeContext = createContext<ApiScope | null>(null);

export function ApiClientsProvider({
  clients,
  children,
}: {
  clients: ApiClients;
  children: ReactNode;
}) {
  return <ClientsContext.Provider value={clients}>{children}</ClientsContext.Provider>;
}

export function useApiClients() {
  const clients = useContext(ClientsContext);
  if (!clients) throw new Error('ApiClientsProvider is required');
  return clients;
}

export function useApiScope() {
  const scope = useContext(ScopeContext);
  if (!scope) throw new Error('ApiScopeProvider is required');
  return scope;
}

export function ApiScopeProvider({ scope, children }: { scope: ApiScope; children: ReactNode }) {
  const clients = useApiClients();
  return (
    <ApolloProvider key={scopeKey(scope)} client={clients.get(scope)}>
      <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>
    </ApolloProvider>
  );
}
