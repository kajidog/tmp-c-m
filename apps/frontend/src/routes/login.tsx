import { Navigate, useSearchParams } from '@remix-run/react';
import { useAuth } from '../features/auth/AuthContext';
import { LoginPage } from '../pages/LoginPage';

export default function LoginRoute() {
  const { status } = useAuth();
  const [params] = useSearchParams();
  if (status === 'loading')
    return (
      <main className="login">
        <p role="status">セッションを確認しています…</p>
      </main>
    );
  const next = params.get('next');
  // 戻り先はアプリ内のパスに限定します。
  const destination =
    next?.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login')
      ? next
      : '/tenant-users';
  return status === 'authenticated' ? <Navigate to={destination} replace /> : <LoginPage />;
}
