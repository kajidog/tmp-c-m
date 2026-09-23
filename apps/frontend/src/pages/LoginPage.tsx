import { useState } from 'react';
import { useAuth, useAuthService } from '../features/auth/AuthContext';

export function LoginPage() {
  const auth = useAuthService();
  const { error } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <section>
        <p className="eyebrow">TENANT CONSOLE</p>
        <h1>ログイン</h1>
        <p>デモ管理者で管理画面を開きます。</p>
        {error && <p role="alert">{error}</p>}
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void auth.login().finally(() => setBusy(false));
          }}
        >
          {busy ? 'ログイン中…' : 'デモ管理者でログイン'}
        </button>
      </section>
    </main>
  );
}
