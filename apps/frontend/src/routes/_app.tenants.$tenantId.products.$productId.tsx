import { useQuery } from '@apollo/client';
import { Link, useNavigate, useParams } from '@remix-run/react';
import { useEffect } from 'react';
import { QueryStatus } from '../components/QueryStatus';
import { useTenantStore } from '../features/tenant/stores/tenant-store';
import { TenantSelector } from '../features/tenant/TenantSelector';
import { TenantsDocument } from '../features/tenant/tenant.api';
import { ApiScopeProvider } from '../libs/api/ApiScopeProvider';
import { ProductDetailsPage } from '../pages/ProductsPage';

export default function ProductDetailsRoute() {
  const navigate = useNavigate();
  const { tenantId = '', productId = '' } = useParams();
  const { data, loading, error, refetch } = useQuery(TenantsDocument);
  const selectTenant = useTenantStore((s) => s.selectTenant);
  const validTenant = data?.tenants.some((t) => t.id === tenantId);
  useEffect(() => {
    if (validTenant) selectTenant(tenantId);
  }, [validTenant, tenantId, selectTenant]);
  if (loading || error) return <QueryStatus loading={loading} error={error} onRetry={refetch} />;
  if (!validTenant)
    return (
      <section>
        <h1>テナントが見つかりません。</h1>
        <Link to="/products">商品一覧へ</Link>
      </section>
    );
  return (
    <>
      <TenantSelector
        value={tenantId}
        allowAll={false}
        onChange={(id) => {
          selectTenant(id);
          navigate('/products');
        }}
      />
      <ApiScopeProvider scope={{ kind: 'tenant', tenantId }}>
        <ProductDetailsPage
          id={productId}
          onBack={() => {
            navigate('/products');
          }}
        />
      </ApiScopeProvider>
    </>
  );
}
