import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { useSaveAction } from '../../hooks/useSaveAction';
import type { UserRow } from './UserTable';

export function UserEditDialog({
  user,
  onSave,
  onClose,
}: {
  user: UserRow;
  onSave: (username: string) => Promise<void>;
  onClose: () => void;
}) {
  const [username, setUsername] = useState(user.username);
  const { save, saving, error } = useSaveAction();
  return (
    <Dialog title="ユーザーを編集" onClose={onClose} busy={saving}>
      <p className="muted">
        {user.tenant?.name ?? 'システム管理者'} / {user.id}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save(async () => {
            await onSave(username.trim());
            onClose();
          });
        }}
      >
        <label>
          ユーザー名
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={saving}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="actions">
          <button type="button" onClick={onClose} disabled={saving}>
            キャンセル
          </button>
          <button type="submit" className="primary" disabled={saving || !username.trim()}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
