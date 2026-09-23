import { Navigate } from '@remix-run/react';

export default function HomeRoute() {
  return <Navigate to="/tenant-users" replace />;
}
