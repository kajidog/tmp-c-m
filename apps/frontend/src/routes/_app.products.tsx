import { useNavigate } from '@remix-run/react';
import { useTenantStore } from '../features/tenant/stores/tenant-store';
import { TenantSelector } from '../features/tenant/TenantSelector';
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
        <ProductsPage
          key={selectedTenantId}
          scope={{ kind: 'tenant', tenantId: selectedTenantId }}
          onEdit={(id) => {
            navigate(
              `/tenants/${encodeURIComponent(selectedTenantId)}/products/${encodeURIComponent(id)}`,
            );
          }}
        />
      )}
    </>
  );
}
