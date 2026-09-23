import { Navigate, NavLink, Outlet, useLocation } from '@remix-run/react';
import { useAuth, useAuthService } from '../features/auth/AuthContext';
import { useTenantStore } from '../features/tenant/stores/tenant-store';
import { ApiClientsProvider, ApiScopeProvider } from '../libs/api/ApiScopeProvider';
import { GLOBAL_SCOPE } from '../libs/api/clients';

// パスを増やさない共通レイアウトで、認証後の画面をまとめます。
export default function ProtectedLayout() {
  const { status, user } = useAuth();
  const auth = useAuthService();
  const location = useLocation();
  const selectTenant = useTenantStore((s) => s.selectTenant);
  if (status === 'loading')
    return (
      <main className="login">
        <p role="status">セッションを確認しています…</p>
      </main>
    );
  if (status === 'anonymous')
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );

  return (
    <ApiClientsProvider clients={auth.clients}>
      <ApiScopeProvider scope={GLOBAL_SCOPE}>
        <header>
          <div className="brand">TENANT CONSOLE</div>
          <div className="account">
            <span>{user?.username}</span>
            <button
              type="button"
              onClick={() => {
                selectTenant('all');
                auth.logout();
              }}
            >
              ログアウト
            </button>
          </div>
        </header>
        <div className="app-layout">
          <nav aria-label="メインメニュー">
            <NavLink to="/tenant-users">テナントユーザー</NavLink>
            <NavLink to="/system-administrators">システム管理者</NavLink>
            <NavLink
              to="/products"
              className={({ isActive }) =>
                isActive || location.pathname.startsWith('/tenants/') ? 'active' : undefined
              }
            >
              商品
            </NavLink>
          </nav>
          <main>
            <Outlet />
          </main>
        </div>
      </ApiScopeProvider>
    </ApiClientsProvider>
  );
}
