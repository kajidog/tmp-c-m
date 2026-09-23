export type User = {
  id: string;
  cognitoId: string;
  tenantId: string | null;
  role: 'TENANT_USER' | 'SYSTEM_ADMIN';
  username: string;
};

export function createData() {
  return {
    tenants: [
      { id: 'tenant-a', name: 'テナントA' },
      { id: 'tenant-b', name: 'テナントB' },
    ],
    users: [
      {
        id: 'admin-1',
        cognitoId: 'cognito-admin-1',
        tenantId: null,
        role: 'SYSTEM_ADMIN',
        username: 'デモ管理者',
      },
      {
        id: 'admin-2',
        cognitoId: 'cognito-admin-2',
        tenantId: null,
        role: 'SYSTEM_ADMIN',
        username: '運用管理者',
      },
      {
        id: 'user-a1',
        cognitoId: 'cognito-user-a1',
        tenantId: 'tenant-a',
        role: 'TENANT_USER',
        username: '田中 太郎',
      },
      {
        id: 'user-a2',
        cognitoId: 'cognito-user-a2',
        tenantId: 'tenant-a',
        role: 'TENANT_USER',
        username: '佐藤 花子',
      },
      {
        id: 'user-b1',
        cognitoId: 'cognito-user-b1',
        tenantId: 'tenant-b',
        role: 'TENANT_USER',
        username: '鈴木 一郎',
      },
    ] as User[],
    products: [
      { id: 'product-a1', tenantId: 'tenant-a', name: 'ノート', price: 300 },
      { id: 'product-a2', tenantId: 'tenant-a', name: 'ボールペン', price: 150 },
      { id: 'product-b1', tenantId: 'tenant-b', name: 'マグカップ', price: 1200 },
    ],
  };
}
