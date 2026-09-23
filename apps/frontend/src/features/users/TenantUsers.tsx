import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { QueryStatus } from '../../components/QueryStatus';
import { ApiScopeProvider, useApiClients, useApiScope } from '../../libs/api/ApiScopeProvider';
import { GLOBAL_SCOPE } from '../../libs/api/clients';
import { UserEditDialog } from './UserEditDialog';
import { type UserRow, UserTable } from './UserTable';
import { TenantUsersDocument, UpdateTenantUserDocument } from './users.api';

export function TenantUsers() {
  const { data, loading, error, refetch } = useQuery(TenantUsersDocument);
  const [editing, setEditing] = useState<UserRow | null>(null);
  return (
    <>
      <QueryStatus loading={loading} error={error} onRetry={refetch} />
      {data && !error && <UserTable users={data.tenantUsers} showTenant onEdit={setEditing} />}
      {editing?.tenantId && (
        // 一覧が全テナントでも、ダイアログの操作対象はこの行の所属テナントに固定します。
        <ApiScopeProvider scope={{ kind: 'tenant', tenantId: editing.tenantId }}>
          <TenantUserEditor user={editing} onClose={() => setEditing(null)} />
        </ApiScopeProvider>
      )}
    </>
  );
}

function TenantUserEditor({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [updateUser] = useMutation(UpdateTenantUserDocument);
  const clients = useApiClients();
  const scope = useApiScope();
  return (
    <UserEditDialog
      user={user}
      onClose={onClose}
      onSave={async (username) => {
        await updateUser({ variables: { id: user.id, input: { username } } });
        // Client間でキャッシュは同期されないため、全体用とテナント用の一覧を無効化します。
        await Promise.all([
          clients.invalidate(GLOBAL_SCOPE, ['tenantUsers']),
          clients.invalidate(scope, ['tenantUsers']),
        ]);
      }}
    />
  );
}
