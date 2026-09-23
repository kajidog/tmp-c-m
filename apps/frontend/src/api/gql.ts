/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query Me {\n    me { id tenantId role username }\n  }\n": typeof types.MeDocument,
    "\n  subscription ProductChanged { productChanged { id tenantId name price } }\n": typeof types.ProductChangedDocument,
    "\n  query Products { products { id tenantId name price } }\n": typeof types.ProductsDocument,
    "\n  query Product($id: ID!) { product(id: $id) { id tenantId name price } }\n": typeof types.ProductDocument,
    "\n  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {\n    updateProduct(id: $id, input: $input) { id tenantId name price }\n  }\n": typeof types.UpdateProductDocument,
    "\n  query Tenants { tenants { id name } }\n": typeof types.TenantsDocument,
    "\n  fragment UserFields on User {\n    id tenantId role username tenant { id name }\n  }\n": typeof types.UserFieldsFragmentDoc,
    "\n  query TenantUsers {\n    tenantUsers { ...UserFields }\n  }\n": typeof types.TenantUsersDocument,
    "\n  query SystemAdministrators {\n    systemAdministrators { ...UserFields }\n  }\n": typeof types.SystemAdministratorsDocument,
    "\n  mutation UpdateTenantUser($id: ID!, $input: UpdateUserInput!) {\n    updateTenantUser(id: $id, input: $input) { ...UserFields }\n  }\n": typeof types.UpdateTenantUserDocument,
    "\n  mutation UpdateSystemAdministrator($id: ID!, $input: UpdateUserInput!) {\n    updateSystemAdministrator(id: $id, input: $input) { ...UserFields }\n  }\n": typeof types.UpdateSystemAdministratorDocument,
};
const documents: Documents = {
    "\n  query Me {\n    me { id tenantId role username }\n  }\n": types.MeDocument,
    "\n  subscription ProductChanged { productChanged { id tenantId name price } }\n": types.ProductChangedDocument,
    "\n  query Products { products { id tenantId name price } }\n": types.ProductsDocument,
    "\n  query Product($id: ID!) { product(id: $id) { id tenantId name price } }\n": types.ProductDocument,
    "\n  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {\n    updateProduct(id: $id, input: $input) { id tenantId name price }\n  }\n": types.UpdateProductDocument,
    "\n  query Tenants { tenants { id name } }\n": types.TenantsDocument,
    "\n  fragment UserFields on User {\n    id tenantId role username tenant { id name }\n  }\n": types.UserFieldsFragmentDoc,
    "\n  query TenantUsers {\n    tenantUsers { ...UserFields }\n  }\n": types.TenantUsersDocument,
    "\n  query SystemAdministrators {\n    systemAdministrators { ...UserFields }\n  }\n": types.SystemAdministratorsDocument,
    "\n  mutation UpdateTenantUser($id: ID!, $input: UpdateUserInput!) {\n    updateTenantUser(id: $id, input: $input) { ...UserFields }\n  }\n": types.UpdateTenantUserDocument,
    "\n  mutation UpdateSystemAdministrator($id: ID!, $input: UpdateUserInput!) {\n    updateSystemAdministrator(id: $id, input: $input) { ...UserFields }\n  }\n": types.UpdateSystemAdministratorDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Me {\n    me { id tenantId role username }\n  }\n"): (typeof documents)["\n  query Me {\n    me { id tenantId role username }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription ProductChanged { productChanged { id tenantId name price } }\n"): (typeof documents)["\n  subscription ProductChanged { productChanged { id tenantId name price } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Products { products { id tenantId name price } }\n"): (typeof documents)["\n  query Products { products { id tenantId name price } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Product($id: ID!) { product(id: $id) { id tenantId name price } }\n"): (typeof documents)["\n  query Product($id: ID!) { product(id: $id) { id tenantId name price } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {\n    updateProduct(id: $id, input: $input) { id tenantId name price }\n  }\n"): (typeof documents)["\n  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {\n    updateProduct(id: $id, input: $input) { id tenantId name price }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Tenants { tenants { id name } }\n"): (typeof documents)["\n  query Tenants { tenants { id name } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment UserFields on User {\n    id tenantId role username tenant { id name }\n  }\n"): (typeof documents)["\n  fragment UserFields on User {\n    id tenantId role username tenant { id name }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query TenantUsers {\n    tenantUsers { ...UserFields }\n  }\n"): (typeof documents)["\n  query TenantUsers {\n    tenantUsers { ...UserFields }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SystemAdministrators {\n    systemAdministrators { ...UserFields }\n  }\n"): (typeof documents)["\n  query SystemAdministrators {\n    systemAdministrators { ...UserFields }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateTenantUser($id: ID!, $input: UpdateUserInput!) {\n    updateTenantUser(id: $id, input: $input) { ...UserFields }\n  }\n"): (typeof documents)["\n  mutation UpdateTenantUser($id: ID!, $input: UpdateUserInput!) {\n    updateTenantUser(id: $id, input: $input) { ...UserFields }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateSystemAdministrator($id: ID!, $input: UpdateUserInput!) {\n    updateSystemAdministrator(id: $id, input: $input) { ...UserFields }\n  }\n"): (typeof documents)["\n  mutation UpdateSystemAdministrator($id: ID!, $input: UpdateUserInput!) {\n    updateSystemAdministrator(id: $id, input: $input) { ...UserFields }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;