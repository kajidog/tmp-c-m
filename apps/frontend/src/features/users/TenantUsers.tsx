import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { QueryStatus } from '../../components/QueryStatus';
import { ApiScopeProvider, useApiClients } from '../../libs/api/ApiScopeProvider';
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
      {/* tenantUsersはバックエンドがTENANT_USERだけを返すため、tenantIdは必ず入っています。 */}
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
  return (
    <UserEditDialog
      user={user}
      onClose={onClose}
      onSave={async (username) => {
        // このダイアログは対象行のテナント用Clientで更新します。
        // 同じClientの一覧は更新結果の正規化で揃うため、無効化するのはglobal用Clientだけです。
        await updateUser({ variables: { id: user.id, input: { username } } });
        // 保存の成否とは切り離します。再取得の失敗は一覧側のQueryStatusに再読み込みつきで出ます。
        void clients.invalidate(GLOBAL_SCOPE, ['tenantUsers']).catch(() => undefined);
      }}
    />
  );
}
