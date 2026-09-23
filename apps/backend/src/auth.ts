import { createHmac, timingSafeEqual } from 'node:crypto';
import { createGraphQLError } from 'graphql-yoga';

// ローカルデモ用の鍵です。実環境ではCognitoの公開鍵による検証に置き換えます。
const demoKey = 'tenant-example-local-signing-key';
const signature = (value: string) =>
  createHmac('sha256', demoKey).update(value).digest('base64url');

export function createDemoIdToken(cognitoId: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub: cognitoId, token_use: 'id', iss: 'local-demo' }),
  ).toString('base64url');
  const content = `${header}.${payload}`;
  return `${content}.${signature(content)}`;
}

export const DEMO_TOKEN = createDemoIdToken('cognito-admin-1');

export function getCognitoId(authorization: string | null): string {
  try {
    if (!authorization?.startsWith('Bearer ')) throw new Error('トークンがありません。');
    const parts = authorization.slice(7).split('.');
    if (parts.length !== 3) throw new Error('トークンの形式が不正です。');
    const [header, payload, receivedSignature] = parts;
    const expected = Buffer.from(signature(`${header}.${payload}`));
    const received = Buffer.from(receivedSignature);
    if (received.length !== expected.length || !timingSafeEqual(received, expected))
      throw new Error('署名が一致しません。');
    const metadata = JSON.parse(Buffer.from(header, 'base64url').toString());
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (
      metadata.alg !== 'HS256' ||
      claims.token_use !== 'id' ||
      claims.iss !== 'local-demo' ||
      typeof claims.sub !== 'string' ||
      !claims.sub
    )
      throw new Error('IDトークンではありません。');
    return claims.sub;
  } catch {
    throw createGraphQLError('ログインしてください。', { extensions: { code: 'UNAUTHENTICATED' } });
  }
}
