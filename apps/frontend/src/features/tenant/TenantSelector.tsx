import { useQuery } from '@apollo/client';
import { QueryStatus } from '../../components/QueryStatus';
import { TenantsDocument } from './tenant.api';

export function TenantSelector({
  value,
  allowAll,
  onChange,
}: {
  value: string;
  allowAll: boolean;
  onChange: (value: string) => void;
}) {
  const { data, loading, error, refetch } = useQuery(TenantsDocument);
  return (
    <div className="tenant-selector">
      <label>
        テナント
        <select
          value={!allowAll && value === 'all' ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading || !!error}
        >
          {allowAll ? (
            <option value="all">すべてのテナント</option>
          ) : (
            <option value="" disabled>
              テナントを選択してください
            </option>
          )}
          {data?.tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </select>
      </label>
      <QueryStatus loading={loading} error={error} onRetry={refetch} />
    </div>
  );
}
