import { TenantUsers } from '../features/users/TenantUsers';
import type { ApiScope } from '../libs/api/clients';

export function TenantUsersPage({ scope }: { scope: ApiScope }) {
  return (
    <section>
      <h1>テナントユーザー一覧</h1>
      <TenantUsers scope={scope} />
    </section>
  );
}
