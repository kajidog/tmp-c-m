import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { QueryStatus } from '../../components/QueryStatus';
import { ApiScopeProvider } from '../../libs/api/ApiScopeProvider';
import { GLOBAL_SCOPE } from '../../libs/api/clients';
import { UserEditDialog } from './UserEditDialog';
import { type UserRow, UserTable } from './UserTable';
import { SystemAdministratorsDocument, UpdateSystemAdministratorDocument } from './users.api';

export function SystemAdministrators({ onUpdated }: { onUpdated: (user: UserRow) => void }) {
  const { data, loading, error, refetch } = useQuery(SystemAdministratorsDocument);
  const [editing, setEditing] = useState<UserRow | null>(null);
  return (
    <>
      <QueryStatus loading={loading} error={error} onRetry={refetch} />
      {data && !error && <UserTable users={data.systemAdministrators} onEdit={setEditing} />}
      {editing && (
        <ApiScopeProvider scope={GLOBAL_SCOPE}>
          <AdministratorEditor
            user={editing}
            onUpdated={onUpdated}
            onClose={() => setEditing(null)}
          />
        </ApiScopeProvider>
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
  const [updateUser] = useMutation(UpdateSystemAdministratorDocument);
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
