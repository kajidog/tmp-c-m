import type { LinksFunction } from '@remix-run/node';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { AuthProvider } from './features/auth/AuthContext';
import { createAuthService } from './features/auth/auth-service';
import stylesheet from './styles.css?url';

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: stylesheet }];

export default function App() {
  const [auth] = useState(() => createAuthService());
  // SSRではストレージに触れず、ブラウザで初回だけセッションを確認します。
  useEffect(() => {
    void auth.initialize();
  }, [auth]);
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>テナント管理</title>
        <Meta />
        <Links />
      </head>
      <body>
        <AuthProvider service={auth}>
          <Outlet />
        </AuthProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
