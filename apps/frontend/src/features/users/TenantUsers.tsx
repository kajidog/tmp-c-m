import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { QueryStatus } from '../../components/QueryStatus';
import { useApiClient, useApiClients } from '../../libs/api/ApiClientsProvider';
import { type ApiScope, GLOBAL_SCOPE } from '../../libs/api/clients';
import { TenantUserCreateDialog } from './TenantUserCreateDialog';
import { UserEditDialog } from './UserEditDialog';
import { type UserRow, UserTable } from './UserTable';
import { TenantUsersDocument, UpdateTenantUserDocument } from './users.api';

// scopeは一覧を表示する対象です。routeがテナントの選択から決めて渡します。
export function TenantUsers({ scope }: { scope: ApiScope }) {
  const { data, loading, error, refetch } = useQuery(TenantUsersDocument, {
    client: useApiClient(scope),
  });
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <>
      <div className="actions">
        <button type="button" className="primary" onClick={() => setCreating(true)}>
          ユーザーを追加
        </button>
      </div>
      <QueryStatus loading={loading} error={error} onRetry={refetch} />
      {data && !error && <UserTable users={data.tenantUsers} showTenant onEdit={setEditing} />}
      {/* tenantUsersはバックエンドがTENANT_USERだけを返すため、tenantIdは必ず入っています。 */}
      {editing?.tenantId && (
        <TenantUserEditor
          user={editing}
          tenantId={editing.tenantId}
          onClose={() => setEditing(null)}
        />
      )}
      {creating && (
        <TenantUserCreateDialog
          initialTenantId={scope.kind === 'tenant' ? scope.tenantId : null}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}

function TenantUserEditor({
  user,
  tenantId,
  onClose,
}: {
  user: UserRow;
  tenantId: string;
  onClose: () => void;
}) {
  // 一覧が全テナントでも、更新はこの行の所属テナントで送ります。
  const [updateUser] = useMutation(UpdateTenantUserDocument, {
    client: useApiClient({ kind: 'tenant', tenantId }),
  });
  const clients = useApiClients();
  return (
    <UserEditDialog
      user={user}
      onClose={onClose}
      onSave={async (username) => {
        // 同じテナント用Clientの一覧は更新結果の正規化で揃うため、無効化するのはglobal用Clientだけです。
        await updateUser({ variables: { id: user.id, input: { username } } });
        // 保存の成否とは切り離します。再取得の失敗は一覧側のQueryStatusに再読み込みつきで出ます。
        void clients.invalidate(GLOBAL_SCOPE, ['tenantUsers']).catch(() => undefined);
      }}
    />
  );
}
