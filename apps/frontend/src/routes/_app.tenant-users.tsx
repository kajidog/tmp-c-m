import { useTenantStore } from '../features/tenant/stores/tenant-store';
import { TenantSelector } from '../features/tenant/TenantSelector';
import { GLOBAL_SCOPE, scopeKey } from '../libs/api/clients';
import { TenantUsersPage } from '../pages/TenantUsersPage';

export default function TenantUsersRoute() {
  const { selectedTenantId, selectTenant } = useTenantStore();
  // 一覧の表示対象はここで決め、propsで渡します。
  const scope =
    selectedTenantId === 'all'
      ? GLOBAL_SCOPE
      : { kind: 'tenant' as const, tenantId: selectedTenantId };
  return (
    <>
      <TenantSelector value={selectedTenantId} allowAll onChange={selectTenant} />
      {/* 切り替えで開いているダイアログや入力を持ち越さないよう、対象ごとに再マウントします。 */}
      <TenantUsersPage key={scopeKey(scope)} scope={scope} />
    </>
  );
}
