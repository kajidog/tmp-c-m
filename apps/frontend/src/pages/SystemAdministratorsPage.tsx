import { useAuthService } from '../features/auth/AuthContext';
import { SystemAdministrators } from '../features/users/SystemAdministrators';

export function SystemAdministratorsPage() {
  const auth = useAuthService();
  return (
    <section>
      <h1>システム管理者一覧</h1>
      <SystemAdministrators onUpdated={auth.updateCurrentUser} />
    </section>
  );
}
