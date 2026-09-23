import { useQuery } from '@apollo/client';
import { QueryStatus } from '../../components/QueryStatus';
import { useApiClient } from '../../libs/api/ApiClientsProvider';
import { GLOBAL_SCOPE } from '../../libs/api/clients';
import { TenantsDocument } from './tenant.api';

export function TenantSelector({
  value,
  allowAll,
  onChange,
  label = 'テナント',
  disabled = false,
}: {
  value: string;
  allowAll: boolean;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  // テナントの一覧自体はどのテナントにも属さないため、常にglobalで取得します。
  const { data, loading, error, refetch } = useQuery(TenantsDocument, {
    client: useApiClient(GLOBAL_SCOPE),
  });
  return (
    <div className="tenant-selector">
      <label>
        {label}
        <select
          value={!allowAll && value === 'all' ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading || !!error}
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
