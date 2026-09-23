import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { useSaveAction } from '../../hooks/useSaveAction';
import { useApiClients } from '../../libs/api/ApiClientsProvider';
import { GLOBAL_SCOPE } from '../../libs/api/clients';
import { TenantSelector } from '../tenant/TenantSelector';
import { CreateTenantUserDocument } from './users.api';

export function TenantUserCreateDialog({
  initialTenantId,
  onClose,
}: {
  // 一覧で単一テナントを選んでいれば初期値にします。「すべて」なら未選択から始めます。
  initialTenantId: string | null;
  onClose: () => void;
}) {
  // 作成先のテナントは入力値の一つです。一覧の選択（ストア）は変更しません。
  const [tenantId, setTenantId] = useState(initialTenantId ?? '');
  const [username, setUsername] = useState('');
  const clients = useApiClients();
  const { save, saving, error } = useSaveAction();
  return (
    <Dialog title="ユーザーを追加" onClose={onClose} busy={saving}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!tenantId || !username.trim()) return;
          void save(async () => {
            // 送信時点でフォームが選んでいるテナントのClientで送ります。
            const scope = { kind: 'tenant', tenantId } as const;
            await clients.get(scope).mutate({
              mutation: CreateTenantUserDocument,
              variables: { input: { username: username.trim() } },
            });
            // 追加は一覧の件数が変わるため、正規化だけでは揃いません。
            // 作成先テナントとglobalの一覧を捨てます。未生成のClientは飛ばされます。
            void Promise.all([
              clients.invalidate(scope, ['tenantUsers']),
              clients.invalidate(GLOBAL_SCOPE, ['tenantUsers']),
            ]).catch(() => undefined);
            onClose();
          });
        }}
      >
        <TenantSelector
          label="作成先テナント"
          value={tenantId}
          allowAll={false}
          onChange={setTenantId}
          disabled={saving}
        />
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
          <button
            type="submit"
            className="primary"
            disabled={saving || !tenantId || !username.trim()}
          >
            {saving ? '追加中…' : '追加'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
