import { Link } from '@remix-run/react';

export function loader() {
  return new Response(null, { status: 404 });
}

export default function NotFound() {
  return (
    <section>
      <h1>ページが見つかりません。</h1>
      <Link to="/tenant-users">ユーザー一覧へ</Link>
    </section>
  );
}
