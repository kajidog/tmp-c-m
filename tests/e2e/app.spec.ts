import { expect, type Page, test } from '@playwright/test';
import { DEMO_ID_TOKEN } from '../../apps/frontend/src/libs/cognito';

async function login(page: Page, path = '/tenant-users') {
  await page.goto(path);
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.getByRole('button', { name: 'デモ管理者でログイン' }).click();
  await expect(page).toHaveURL(path);
}

test('全テナント一覧の編集と切り替えでヘッダー・一覧が正しく更新される', async ({ page }) => {
  const requests: { operation: string; tenant: string | undefined; auth: string | undefined }[] =
    [];
  page.on('request', (request) => {
    if (request.url().endsWith('/graphql') && request.method() === 'POST') {
      requests.push({
        operation: request.postDataJSON().operationName,
        tenant: request.headers()['x-tenant-id'],
        auth: request.headers().authorization,
      });
    }
  });
  await login(page);
  const selector = page.getByRole('combobox', { name: 'テナント', exact: true });
  await expect(selector).toHaveValue('all');
  const row = page.getByRole('row').filter({ hasText: 'user-a1' });
  await row.getByRole('button', { name: /編集/ }).click();
  await page.getByRole('dialog').getByLabel('ユーザー名').fill('編集済みユーザー');
  await page.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(row).toContainText('編集済みユーザー');
  await expect(selector).toHaveValue('all');
  await selector.selectOption('tenant-b');
  await expect(page.getByRole('row').filter({ hasText: 'user-b1' })).toBeVisible();
  await expect(row).toHaveCount(0);
  await selector.selectOption('tenant-a');
  await expect(row).toContainText('編集済みユーザー');
  expect(requests.filter((r) => r.operation === 'Me')).toHaveLength(1);
  expect(requests.find((r) => r.operation === 'UpdateTenantUser')?.tenant).toBe('tenant-a');
  expect(
    requests.filter((r) => r.operation === 'TenantUsers').some((r) => r.tenant === undefined),
  ).toBe(true);
  expect(requests.every((r) => r.auth === `Bearer ${DEMO_ID_TOKEN}`)).toBe(true);
});

test('ユーザー追加はダイアログで選んだテナントで送り、切り替えても入力を保つ', async ({ page }) => {
  await login(page);
  const selector = page.getByRole('combobox', { name: 'テナント', exact: true });
  await page.getByRole('button', { name: 'ユーザーを追加' }).click();
  const dialog = page.getByRole('dialog');
  const target = dialog.getByRole('combobox', { name: '作成先テナント' });
  // 一覧が「すべて」なので未選択から始まり、選ぶまで追加できません。
  await expect(target).toHaveValue('');
  await dialog.getByLabel('ユーザー名').fill('追加したユーザー');
  await expect(dialog.getByRole('button', { name: '追加', exact: true })).toBeDisabled();
  await target.selectOption('tenant-a');
  await target.selectOption('tenant-b');
  await expect(dialog.getByLabel('ユーザー名')).toHaveValue('追加したユーザー');
  const requestPromise = page.waitForRequest(
    (request) =>
      request.url().endsWith('/graphql') &&
      request.postDataJSON()?.operationName === 'CreateTenantUser',
  );
  await dialog.getByRole('button', { name: '追加', exact: true }).click();
  expect((await requestPromise).headers()['x-tenant-id']).toBe('tenant-b');
  await expect(dialog).toHaveCount(0);
  // 一覧の選択はダイアログの選択に引きずられません。
  await expect(selector).toHaveValue('all');
  const row = page.getByRole('row').filter({ hasText: '追加したユーザー' });
  await expect(row).toContainText('テナントB');
  await selector.selectOption('tenant-b');
  await expect(row).toBeVisible();
  await selector.selectOption('tenant-a');
  await expect(row).toHaveCount(0);

  // 単一テナントの一覧から開くと、そのテナントが初期値になります。
  await page.getByRole('button', { name: 'ユーザーを追加' }).click();
  await expect(
    page.getByRole('dialog').getByRole('combobox', { name: '作成先テナント' }),
  ).toHaveValue('tenant-a');
});

test('管理者画面ではテナントを付けず、自分の表示名も更新する', async ({ page }) => {
  await login(page);
  await page.getByRole('combobox', { name: 'テナント', exact: true }).selectOption('tenant-b');
  await page.getByRole('link', { name: 'システム管理者', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'テナント', exact: true })).toHaveCount(0);
  await page.getByRole('row').filter({ hasText: 'admin-1' }).getByRole('button').click();
  await page.getByRole('dialog').getByLabel('ユーザー名').fill('更新後の管理者');
  const requestPromise = page.waitForRequest(
    (request) =>
      request.url().endsWith('/graphql') &&
      request.postDataJSON()?.operationName === 'UpdateSystemAdministrator',
  );
  await page.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click();
  const request = await requestPromise;
  expect(request.headers()['x-tenant-id']).toBeUndefined();
  await expect(page.locator('header')).toContainText('更新後の管理者');
  await page.getByRole('button', { name: 'ログアウト' }).click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.getByRole('button', { name: 'デモ管理者でログイン' }).click();
  await expect(page.getByRole('heading', { name: 'システム管理者一覧' })).toBeVisible();
});

test('商品は単一テナントで取得し、詳細編集・直接アクセス・切り替えができる', async ({ page }) => {
  await login(page, '/products');
  await expect(page.getByRole('option', { name: 'すべてのテナント' })).toHaveCount(0);
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'テナント', exact: true }).selectOption('tenant-a');
  await page.getByRole('row').filter({ hasText: 'product-a1' }).getByRole('button').click();
  await expect(page).toHaveURL('/tenants/tenant-a/products/product-a1');
  await page.getByLabel('商品名', { exact: true }).fill('更新後のノート');
  await page.getByLabel('価格（円）').fill('450');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('保存しました。');
  await page.getByRole('button', { name: '商品一覧へ戻る' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'product-a1' })).toContainText('450円');
  await page.goto('/tenants/tenant-b/products/product-b1');
  await expect(page.getByRole('combobox', { name: 'テナント', exact: true })).toHaveValue(
    'tenant-b',
  );
  await expect(page.getByLabel('商品名', { exact: true })).toHaveValue('マグカップ');
  await page.getByRole('combobox', { name: 'テナント', exact: true }).selectOption('tenant-a');
  await expect(page).toHaveURL('/products');
  await expect(page.getByRole('row').filter({ hasText: 'product-a1' })).toContainText(
    '更新後のノート',
  );
});

test('保存済みトークンが無効ならログイン画面へ戻り、再ログインできる', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => localStorage.setItem('tenant-example-session', 'invalid-token'));
  await page.goto('/products');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(
    page.getByRole('alert').filter({ hasText: 'ログインし直してください。' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'デモ管理者でログイン' }).click();
  await expect(page).toHaveURL('/products');
});

test('SSEで別タブの変更を受信し、テナント切り替え後も正しい一覧だけを更新する', async ({
  page,
  context,
}) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await login(page, '/products');
  const connectedA = page.waitForResponse(
    (response) =>
      response.url().endsWith('/graphql') &&
      response.request().postDataJSON()?.operationName === 'ProductChanged',
  );
  await page.getByRole('combobox', { name: 'テナント', exact: true }).selectOption('tenant-a');
  const stream = await connectedA;
  expect(stream.headers()['content-type']).toContain('text/event-stream');
  expect(stream.request().headers()['x-tenant-id']).toBe('tenant-a');
  expect(stream.request().headers().authorization).toBe(`Bearer ${DEMO_ID_TOKEN}`);

  const editor = await context.newPage();
  await editor.goto('/tenants/tenant-a/products/product-a1');
  await editor.getByLabel('商品名', { exact: true }).fill('別タブで更新したAの商品');
  await editor.getByRole('button', { name: '保存', exact: true }).click();
  await expect(editor.getByRole('status')).toHaveText('保存しました。');
  await expect(page.getByRole('row').filter({ hasText: 'product-a1' })).toContainText(
    '別タブで更新したAの商品',
  );

  const connectedB = page.waitForResponse(
    (response) =>
      response.url().endsWith('/graphql') &&
      response.request().postDataJSON()?.operationName === 'ProductChanged',
  );
  await page.getByRole('combobox', { name: 'テナント', exact: true }).selectOption('tenant-b');
  expect((await connectedB).request().headers()['x-tenant-id']).toBe('tenant-b');
  await expect(page.getByRole('row').filter({ hasText: 'product-a1' })).toHaveCount(0);
  await editor.goto('/tenants/tenant-b/products/product-b1');
  await editor.getByLabel('商品名', { exact: true }).fill('別タブで更新したBの商品');
  await editor.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'product-b1' })).toContainText(
    '別タブで更新したBの商品',
  );
  expect(browserErrors).toEqual([]);
});
