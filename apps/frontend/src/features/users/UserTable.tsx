import type { UserFieldsFragment } from '../../api/graphql';

export type UserRow = UserFieldsFragment;

export function UserTable({
  users,
  onEdit,
  showTenant = false,
}: {
  users: UserRow[];
  onEdit: (user: UserRow) => void;
  showTenant?: boolean;
}) {
  if (!users.length) return <p>ユーザーがいません。</p>;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>ユーザーID</th>
            <th>ユーザー名</th>
            {showTenant && <th>テナント</th>}
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.username}</td>
              {showTenant && <td>{user.tenant?.name}</td>}
              <td>
                <button
                  type="button"
                  onClick={() => onEdit(user)}
                  aria-label={`${user.username}を編集`}
                >
                  編集
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
