import { graphql } from '../../api';

// 一覧・更新の戻り値で同じ形を使うため、選択セットをフラグメントに集約します。
export const UserFieldsFragment = graphql(`
  fragment UserFields on User {
    id tenantId role username tenant { id name }
  }
`);

export const TenantUsersDocument = graphql(`
  query TenantUsers {
    tenantUsers { ...UserFields }
  }
`);
export const SystemAdministratorsDocument = graphql(`
  query SystemAdministrators {
    systemAdministrators { ...UserFields }
  }
`);
export const UpdateTenantUserDocument = graphql(`
  mutation UpdateTenantUser($id: ID!, $input: UpdateUserInput!) {
    updateTenantUser(id: $id, input: $input) { ...UserFields }
  }
`);
export const UpdateSystemAdministratorDocument = graphql(`
  mutation UpdateSystemAdministrator($id: ID!, $input: UpdateUserInput!) {
    updateSystemAdministrator(id: $id, input: $input) { ...UserFields }
  }
`);
export const CreateTenantUserDocument = graphql(`
  mutation CreateTenantUser($input: CreateUserInput!) {
    createTenantUser(input: $input) { ...UserFields }
  }
`);
