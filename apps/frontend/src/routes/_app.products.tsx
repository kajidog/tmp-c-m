import { useNavigate } from '@remix-run/react';
import { useTenantStore } from '../features/tenant/stores/tenant-store';
import { TenantSelector } from '../features/tenant/TenantSelector';
import { ApiScopeProvider } from '../libs/api/ApiScopeProvider';
import { ProductsPage } from '../pages/ProductsPage';

export default function ProductsRoute() {
  const { selectedTenantId, selectTenant } = useTenantStore();
  const navigate = useNavigate();
  return (
    <>
      <TenantSelector value={selectedTenantId} allowAll={false} onChange={selectTenant} />
      {selectedTenantId === 'all' ? (
        <section>
          <h1>商品一覧</h1>
          <p>テナントを選択してください。</p>
        </section>
      ) : (
        <ApiScopeProvider scope={{ kind: 'tenant', tenantId: selectedTenantId }}>
          <ProductsPage
            onEdit={(id) => {
              navigate(
                `/tenants/${encodeURIComponent(selectedTenantId)}/products/${encodeURIComponent(id)}`,
              );
            }}
          />
        </ApiScopeProvider>
      )}
    </>
  );
}
