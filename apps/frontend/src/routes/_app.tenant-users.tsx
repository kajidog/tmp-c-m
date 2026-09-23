import { useTenantStore } from '../features/tenant/stores/tenant-store';
import { TenantSelector } from '../features/tenant/TenantSelector';
import { ApiScopeProvider } from '../libs/api/ApiScopeProvider';
import { GLOBAL_SCOPE } from '../libs/api/clients';
import { TenantUsersPage } from '../pages/TenantUsersPage';

export default function TenantUsersRoute() {
  const { selectedTenantId, selectTenant } = useTenantStore();
  const scope =
    selectedTenantId === 'all'
      ? GLOBAL_SCOPE
      : { kind: 'tenant' as const, tenantId: selectedTenantId };
  return (
    <>
      <TenantSelector value={selectedTenantId} allowAll onChange={selectTenant} />
      <ApiScopeProvider scope={scope}>
        <TenantUsersPage />
      </ApiScopeProvider>
    </>
  );
}
