# テナントヘッダーの実装サンプル

Remix v2とApollo Client v3で、テナントIDをGraphQL引数からHTTPヘッダーへ移す構成です。
ページとダイアログの `ApiScopeProvider` で操作対象を指定し、対象ごとにClientとキャッシュを分離します。
Subscriptionは `graphql-sse` で送受信し、WebSocketを使いません。

## 起動

Node.js 22、pnpm 10を使用します。

```sh
pnpm install
pnpm dev
```

- フロントエンド: http://127.0.0.1:5173
- GraphQL: http://127.0.0.1:4000/graphql
- ログイン画面の「デモ管理者でログイン」で開始できます。
- データはバックエンドのメモリ上に保存します。再起動すると初期データに戻ります。

## 確認できる画面

| 画面 | テナント選択 | 編集 |
| --- | --- | --- |
| テナントユーザー一覧 | すべて / 単一テナント | 対象行の所属テナントを指定するダイアログ |
| システム管理者一覧 | 非表示 | テナント指定なしのダイアログ |
| 商品一覧 | 単一テナント必須 | テナントID・商品IDをURLに持つ詳細ページ |

ユーザー名、商品名、価格を編集できます。所属テナントとロールは変更しません。
商品詳細でテナントを切り替えると、そのテナントの商品一覧へ移動します。
切り替え・画面遷移時に未保存の入力は破棄します。

## 読む順番

1. [routes/_app.tenant-users.tsx](apps/frontend/src/routes/_app.tenant-users.tsx): ストアの選択をページのProviderに適用する箇所。
2. [features/users/TenantUsers.tsx](apps/frontend/src/features/users/TenantUsers.tsx): 全テナント一覧の内側に、対象行専用のProviderを置く箇所。
3. [libs/api/ApiScopeProvider.tsx](apps/frontend/src/libs/api/ApiScopeProvider.tsx): 対象に応じたClientを子コンポーネントへ渡す処理。
4. [libs/api/clients.ts](apps/frontend/src/libs/api/clients.ts): Client・ヘッダー・キャッシュの分離と一覧の無効化。
5. [libs/api/GraphqlSseLink.ts](apps/frontend/src/libs/api/GraphqlSseLink.ts): ApolloLinkと同じインターフェイスでSSE購読を扱うクラス。
6. [libs/cognito/index.ts](apps/frontend/src/libs/cognito/index.ts): localStorageを読むセッション取得関数と、サインイン関数。
7. [features/auth/auth-service.ts](apps/frontend/src/features/auth/auth-service.ts): セッション確認、ユーザー情報取得、リクエストごとのトークン供給。

## テナントの指定とキャッシュ

```tsx
// routesがZustandの選択をページに適用します。
<ApiScopeProvider scope={pageScope}>
  <TenantUsersPage />
</ApiScopeProvider>

// 一覧の選択とは独立して、編集する行のテナントを指定します。
<ApiScopeProvider scope={{ kind: 'tenant', tenantId: user.tenantId }}>
  <TenantUserEditor user={user} onClose={onClose} />
</ApiScopeProvider>
```

各featureでは通常の `useQuery` / `useMutation` を使います。
最も近いProviderのClientがリクエストを送るため、APIフックが選択ストアを直接参照する必要はありません。
Providerの対象が変わると配下を再マウントし、前のテナントの表示・フォーム状態を持ち越しません。
同じ対象のClientは再利用するため、同じテナントに戻ったときはキャッシュを使えます。

| 対象 | ヘッダー | Clientとキャッシュ |
| --- | --- | --- |
| `global` | `X-Tenant-Id` を省略 | テナント指定なし用 |
| `tenant:tenant-a` | `X-Tenant-Id: tenant-a` | テナントA専用 |
| `tenant:tenant-b` | `X-Tenant-Id: tenant-b` | テナントB専用 |

GraphQLの引数からテナントIDがなくなると、同じクエリと引数の結果をヘッダーだけでは区別できません。
Apolloはルートフィールド名と引数でキャッシュキーを、queryとvariablesで実行中クエリの重複排除を決めるためです。

`typePolicies` の `keyArgs` にテナントを混ぜる方法もありますが、
ルートフィールドを追加して設定を書き忘れると、リクエストが飛ばないまま別テナントのデータが返ります。
警告も例外も出ないため、Client自体を分ける方法を選んでいます。フィールドを追加しても混ざりようがありません。
エンティティのキーだけを `tenantId + id` に変えても、ルートの一覧フィールドの混同は解消しません。

この構成のコストは `libs/api` 一式です。
テナントIDをGraphQLの引数で持てるなら、Apolloの標準機能だけで足りるため、この仕組みは必要ありません。

Clientを生成した後で、そのClientのテナントヘッダーを変更することはありません。
認証ヘッダーは全Clientで共通の、メモリに保持したIDトークンを使います。
`libs` からfeatureのストアをimportしないため、依存方向を保てます。

### 保存後に一覧を揃える

同じClientの中は、mutationの戻り値と正規化キャッシュだけで一覧が揃います。無効化は書きません。
商品詳細と管理者ダイアログはこれに当たるため、保存処理はmutationの呼び出しだけです。
一覧の件数や並びが変わる操作（追加・削除）を足すときは、`evictQueryFields` でルートフィールドを捨てます。

明示的な無効化が要るのはClientをまたぐときだけです。
全テナント一覧からの編集は対象行のテナント用Clientで実行するため、global用Clientの別キャッシュには届きません。
[TenantUsers.tsx](apps/frontend/src/features/users/TenantUsers.tsx) の `clients.invalidate(GLOBAL_SCOPE, ...)` が唯一の呼び出しです。
表示中の一覧は再取得し、非表示の一覧は次回表示時に取得します。

無効化は保存の成否と切り離します。保存はmutationの完了で確定してダイアログを閉じます。
再取得だけが失敗した場合は、保存エラーとしてではなく一覧側の `QueryStatus` に再読み込みつきで表示します。

`useApiClients` は別スコープのClientに触るためだけのフックです。
自分のスコープのClientはApolloの `useMutation` / `useApolloClient` が渡すため、レジストリを経由しません。

## 認証とCognitoへの差し替え

1. 初回に `libs/cognito` の `getSession()` を呼び、セッションの有無を確認します。同時初期化は同じPromiseを共有します。
2. `Authorization: Bearer <IDトークン>` を付け、globalのClientで `me` を取得します。バックエンドはトークンの `sub` と `User.cognitoId` を照合します。
3. ユーザー情報をZustandの認証ストアに保存し、業務画面を表示します。
4. トークンなし、ユーザー情報なし、初期化失敗では `/login` へ遷移します。

トークンはメモリに保持せず、リクエストのたびに `getSession()` から取り直します。
[clients.ts](apps/frontend/src/libs/api/clients.ts) の `getHeaders` が唯一の取得点で、
HttpLink側の `setContext` とSSEの `headers` がどちらもこの関数を使います。
Amplifyの `fetchAuthSession()` のように、キャッシュを返しつつ期限切れなら更新する実装を前提にしています。

これで期限切れによる認証エラーはほとんど起きなくなりますが、なくなるわけではありません。
管理者によるユーザーの無効化・削除や、Cognitoには居るがアプリ側にユーザーがいない場合は、
トークンが有効なまま `UNAUTHENTICATED` が返るため、`onError` の処理は引き続き必要です。
ログアウト後は、保存先にトークンが残っていてもリクエストを送りません。
ログアウト・401・GraphQLの `UNAUTHENTICATED` ではユーザー情報と全Clientを破棄します。
ログイン後は新しいClient群で開始し、前セッションのキャッシュを再利用しません。
ログアウト後に古い初期化が完了しても、認証状態は復元しません。

[libs/cognito/index.ts](apps/frontend/src/libs/cognito/index.ts) が既存のCognito処理への差し替え箇所です。
`getSession` はlocalStorageからIDトークンを読み、`signIn` はデモトークンを保存し、`signOut` は削除するだけです。
SSR中には呼び出さず、ブラウザでマウントしてからセッションを確認します。
ログインするロールはシステム管理者に固定しています。

バックエンドの [auth.ts](apps/backend/src/auth.ts) は、ローカルデモ用JWTを検証し、`sub` を取り出します。
取得した値から `User.cognitoId` でユーザーを検索するため、ユーザーIDを固定した取得処理にはしていません。
実接続時は、この検証をCognitoの公開鍵・クレームの検証に置き換えます。
デモJWTはローカル用の固定鍵・有効期限なしで作成しています。Cognitoの実トークンや更新処理は含めていません。
Cognito IDのクレームは標準の `sub` を前提としています。

## SSEのSubscription

`GraphqlSseLink extends ApolloLink` は `request(operation): Observable<FetchResult>` を実装します。
Apolloの `split` でSubscriptionをSSEへ、Query/MutationをHttpLinkへ振り分けます。
どちらも同じヘッダー生成関数を使い、認証・テナント指定を一致させます。
SSEも対象ごとにClientを分け、接続の共有によるテナントの混在を避けます。

購読例は `productChanged` です。商品一覧を開いている間、選択中テナントの変更を受信します。
別タブで商品を編集すると、受信した商品の `id` と `__typename` により、そのテナントの正規化キャッシュと一覧が更新されます。
ダイアログ・詳細の入力中フォームを書き換えないよう、購読は商品一覧に置いています。

- `useSubscription` のアンマウントで購読を解除します。
- テナント切り替えで旧購読を閉じ、新しい対象で開始します。
- ログアウト時は `dispose()` で再接続の待機も含めて停止します。
- 切断後の再接続はgraphql-sseの既定設定を使い、再接続時に表示中のQueryを取り直します。
- 再接続を断念した場合は一覧に受信停止を表示します。

バックエンドはGraphQL YogaのSSEとテナント別PubSubを使います。
Remixの `/graphql` リソースルートを通してストリーミングします。
リソースルートは応答をバッファに読み切らず、`Response.body` を順次転送し、ブラウザによる購読解除は正常終了として扱います。
転送先は `GRAPHQL_BACKEND_URL` で変更でき、既定値は `http://127.0.0.1:4000/graphql` です。
ローカルでは購読ごとに接続するdistinct connectionsモードを使います。
本番のプロキシでもSSEのバッファリングを無効にし、長時間のHTTP応答を通せる設定が必要です。
複数バックエンド間のイベント配信はこのメモリ上のPubSubには含めていません。

## Remix v2のルーティング

`apps/frontend/src/routes/` がRemixのファイルベースルートです。
`_app.tsx` が認証後の共通レイアウトで、`_app.tenant-users.tsx` などを配下に配置します。
各routeから `src/pages/` の表示コンポーネントを呼び、`routes → pages → features → libs` の役割を保ちます。
`root.tsx` で認証ストアを作成し、ブラウザでマウントした後にセッションを初期化します。
商品詳細は `_app.tenants.$tenantId.products.$productId.tsx` に対応します。
`graphql.ts` は表示を持たないリソースルートで、認証・テナントヘッダーと応答ストリームを転送します。

Remix v2の対応範囲に合わせ、React 18を使用しています。
`vite.config.ts` ではApollo Client v3をSSRの変換対象に含めています。
また、`v3_singleFetch` を有効にして本番サーバーでも標準のFetch実装を使用し、SSEの接続解除を処理します。
参考: [Remixのルート規則](https://v2.remix.run/docs/file-conventions/routes/)、[graphql-sseのApollo連携](https://the-guild.dev/graphql/sse/guides/recipes#with-apollo)。

## ディレクトリとCodegen

```text
apps/frontend/src/
  root.tsx      HTML・認証初期化
  api/          Codegen生成物
  routes/       Remixのルート、認証ガード、テナント選択、Provider
  pages/        画面の組み立て
  features/     ドメインのUI、*.api.ts、認証・テナントのストア
  components/   共通UI
  hooks/        共通フック
  libs/         HTTP・SSE・Client管理
  libs/cognito/  セッション取得・サインインの関数
apps/backend/src/
  auth.ts       デモJWTの検証とCognito ID取得
  data.ts       初期データ（User.cognitoIdを含む）
  server.ts     ヘッダーの解釈とresolver
packages/schemas/
  schema.graphql
```

依存方向は `routes → pages → features → libs` です。
routesは画面を組み立てるためにfeatureのストアやlibsのProviderも参照します。
共通componentsとhooksはドメインに依存しません。
生成型・Documentは共通の `api` から参照します。

`codegen.ts` は共有SDLと `apps/frontend/src/**/*.api.ts` を読み、
client presetで `apps/frontend/src/api/` に型付きDocumentを生成します。
操作を追加・変更したら `pnpm codegen` を実行してください。生成ファイルは手で編集しません。
`pnpm dev` / `pnpm build` / `pnpm test:e2e` の開始時にも生成します。

## 整形と検証

```sh
pnpm format           # Biomeで整形
pnpm lint             # Biomeで整形・lint・import順を確認
pnpm lint:fix         # 自動修正可能な項目を修正
pnpm codegen
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Biomeはワークスペース共通の設定です。Codegen生成物とビルド成果物は対象外です。
VS Code用の推奨拡張と保存時整形の設定も同梱しています。
手書きのコメント・README・テスト名は日本語です。生成コードの説明文はCodegenの出力を維持しています。

Vitestではヘッダー・キャッシュ・同時リクエストの分離、一覧の無効化、認証初期化、Cognito IDの照合、SSEのテナント分離と接続解除を確認します。
Playwrightではログイン、全テナント一覧のダイアログ編集、管理者編集、商品詳細編集、直接アクセス、別タブからSSEで受信した更新とテナント切り替えを確認します。
E2Eはポート4000と5173を使用し、起動済みのサーバーがあれば再利用します。
本番ビルドを動かす場合は `pnpm build` 後に `pnpm --parallel --filter @example/backend --filter @example/frontend start` を実行します。
開発・本番の両方で同じリソースルートがSSEを転送します。
