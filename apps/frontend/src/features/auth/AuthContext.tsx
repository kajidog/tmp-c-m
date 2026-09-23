import { createContext, type ReactNode, useContext } from 'react';
import { useStore } from 'zustand';
import type { AuthService } from './auth-service';

const AuthContext = createContext<AuthService | null>(null);

export function AuthProvider({ service, children }: { service: AuthService; children: ReactNode }) {
  return <AuthContext.Provider value={service}>{children}</AuthContext.Provider>;
}
export function useAuthService() {
  const service = useContext(AuthContext);
  if (!service) throw new Error('AuthProvider is required');
  return service;
}
export function useAuth() {
  return useStore(useAuthService().store);
}
