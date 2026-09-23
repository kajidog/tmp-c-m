import { readFileSync } from 'node:fs';
import { createGraphQLError, createPubSub, createSchema, createYoga } from 'graphql-yoga';
import { getCognitoId } from './auth';
import { createData, type User } from './data';

const typeDefs = readFileSync(
  new URL('../../../packages/schemas/schema.graphql', import.meta.url),
  'utf8',
);

type Context = { tenantId: string | null; user: User };
const fail = (message: string, code = 'BAD_USER_INPUT'): never => {
  throw createGraphQLError(message, { extensions: { code } });
};
const requiredName = (value: string) => value.trim() || fail('名前を入力してください。');
const requiredTenant = (context: Context) =>
  context.tenantId || fail('テナントを指定してください。');
const globalOnly = (context: Context) => {
  if (context.tenantId) fail('この操作ではテナントを指定できません。');
};

// サーバーごとにデータを保持するため、テストでもDBの準備は不要です。
export function createApp(data = createData()) {
  const pubsub = createPubSub<{
    productChanged: [tenantId: string, product: (typeof data.products)[number]];
  }>();
  const schema = createSchema<Context>({
    typeDefs,
    resolvers: {
      User: { tenant: (user: User) => data.tenants.find((t) => t.id === user.tenantId) ?? null },
      Query: {
        me: (_: unknown, __: unknown, ctx: Context) => ctx.user,
        tenants: () => data.tenants,
        tenantUsers: (_: unknown, __: unknown, ctx: Context) =>
          data.users.filter(
            (u) => u.role === 'TENANT_USER' && (!ctx.tenantId || u.tenantId === ctx.tenantId),
          ),
        systemAdministrators: (_: unknown, __: unknown, ctx: Context) => {
          globalOnly(ctx);
          return data.users.filter((u) => u.role === 'SYSTEM_ADMIN');
        },
        products: (_: unknown, __: unknown, ctx: Context) => {
          const tenantId = requiredTenant(ctx);
          return data.products.filter((p) => p.tenantId === tenantId);
        },
        product: (_: unknown, { id }: { id: string }, ctx: Context) => {
          const tenantId = requiredTenant(ctx);
          return (
            data.products.find((p) => p.id === id && p.tenantId === tenantId) ??
            fail('商品が見つかりません。', 'NOT_FOUND')
          );
        },
      },
      Mutation: {
        updateTenantUser: (
          _: unknown,
          { id, input }: { id: string; input: { username: string } },
          ctx: Context,
        ) => {
          const tenantId = requiredTenant(ctx);
          const user = data.users.find(
            (u) => u.id === id && u.tenantId === tenantId && u.role === 'TENANT_USER',
          );
          if (!user) return fail('ユーザーが見つかりません。', 'NOT_FOUND');
          user.username = requiredName(input.username);
          return user;
        },
        updateSystemAdministrator: (
          _: unknown,
          { id, input }: { id: string; input: { username: string } },
          ctx: Context,
        ) => {
          globalOnly(ctx);
          const user = data.users.find((u) => u.id === id && u.role === 'SYSTEM_ADMIN');
          if (!user) return fail('管理者が見つかりません。', 'NOT_FOUND');
          user.username = requiredName(input.username);
          return user;
        },
        updateProduct: (
          _: unknown,
          { id, input }: { id: string; input: { name: string; price: number } },
          ctx: Context,
        ) => {
          const tenantId = requiredTenant(ctx);
          const product = data.products.find((p) => p.id === id && p.tenantId === tenantId);
          if (!product) return fail('商品が見つかりません。', 'NOT_FOUND');
          const name = requiredName(input.name);
          if (input.price < 0) fail('価格は0円以上で入力してください。');
          Object.assign(product, { name, price: input.price });
          pubsub.publish('productChanged', tenantId, { ...product });
          return product;
        },
      },
      Subscription: {
        productChanged: {
          subscribe: (_: unknown, __: unknown, ctx: Context) =>
            pubsub.subscribe('productChanged', requiredTenant(ctx)),
          resolve: (product: (typeof data.products)[number]) => product,
        },
      },
    },
  });

  return createYoga({
    schema,
    graphqlEndpoint: '/graphql',
    logging: false,
    context: ({ request }): Context => {
      const cognitoId = getCognitoId(request.headers.get('authorization'));
      const user = data.users.find((u) => u.cognitoId === cognitoId);
      if (!user) return fail('ユーザー情報を取得できません。', 'UNAUTHENTICATED');
      const tenantId = request.headers.get('x-tenant-id');
      if (tenantId !== null && !data.tenants.some((t) => t.id === tenantId))
        fail('テナントが見つかりません。');
      return { user, tenantId };
    },
  });
}
