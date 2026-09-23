export type Session = { idToken: string };

export const SESSION_KEY = 'tenant-example-session';
// ローカルデモ用のIDトークンです。subはUser.cognitoIdに対応します。
export const DEMO_ID_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb2duaXRvLWFkbWluLTEiLCJ0b2tlbl91c2UiOiJpZCIsImlzcyI6ImxvY2FsLWRlbW8ifQ.G_xertIzvaRGCihVMN-z67X8iZE6M564shgfPEgvAGA';

// 実環境では、この関数内をCognito SDKのセッション情報取得に置き換えます。
export async function getSession(): Promise<Session | null> {
  const idToken = localStorage.getItem(SESSION_KEY);
  return idToken ? { idToken } : null;
}

export async function signIn(): Promise<void> {
  localStorage.setItem(SESSION_KEY, DEMO_ID_TOKEN);
}

export function signOut(): void {
  localStorage.removeItem(SESSION_KEY);
}
