import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { QueryStatus } from '../../components/QueryStatus';
import { useApiClient } from '../../libs/api/ApiClientsProvider';
import { GLOBAL_SCOPE } from '../../libs/api/clients';
import { UserEditDialog } from './UserEditDialog';
import { type UserRow, UserTable } from './UserTable';
import { SystemAdministratorsDocument, UpdateSystemAdministratorDocument } from './users.api';

// システム管理者はどのテナントにも属さないため、常にglobalで取得・更新します。
export function SystemAdministrators({ onUpdated }: { onUpdated: (user: UserRow) => void }) {
  const { data, loading, error, refetch } = useQuery(SystemAdministratorsDocument, {
    client: useApiClient(GLOBAL_SCOPE),
  });
  const [editing, setEditing] = useState<UserRow | null>(null);
  return (
    <>
      <QueryStatus loading={loading} error={error} onRetry={refetch} />
      {data && !error && <UserTable users={data.systemAdministrators} onEdit={setEditing} />}
      {editing && (
        <AdministratorEditor
          user={editing}
          onUpdated={onUpdated}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function AdministratorEditor({
  user,
  onClose,
  onUpdated,
}: {
  user: UserRow;
  onClose: () => void;
  onUpdated: (user: UserRow) => void;
}) {
  const [updateUser] = useMutation(UpdateSystemAdministratorDocument, {
    client: useApiClient(GLOBAL_SCOPE),
  });
  return (
    <UserEditDialog
      user={user}
      onClose={onClose}
      onSave={async (username) => {
        // 一覧もこのダイアログもglobal用Clientを使うため、更新結果の正規化で一覧が揃います。
        const { data } = await updateUser({ variables: { id: user.id, input: { username } } });
        // ヘッダーの表示名はApolloの外の認証ストアが持つため、ここで明示的に反映します。
        if (data) onUpdated(data.updateSystemAdministrator);
      }}
    />
  );
}
