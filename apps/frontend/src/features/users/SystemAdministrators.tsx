import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { QueryStatus } from '../../components/QueryStatus';
import { ApiScopeProvider, useApiClients } from '../../libs/api/ApiScopeProvider';
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
  const clients = useApiClients();
  return (
    <UserEditDialog
      user={user}
      onClose={onClose}
      onSave={async (username) => {
        const { data } = await updateUser({ variables: { id: user.id, input: { username } } });
        if (data) onUpdated(data.updateSystemAdministrator);
        await clients.invalidate(GLOBAL_SCOPE, ['systemAdministrators']);
      }}
    />
  );
}
