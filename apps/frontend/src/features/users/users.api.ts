import { graphql } from '../../api';

export const TenantUsersDocument = graphql(`
  query TenantUsers {
    tenantUsers { id tenantId role username tenant { id name } }
  }
`);
export const SystemAdministratorsDocument = graphql(`
  query SystemAdministrators {
    systemAdministrators { id tenantId role username tenant { id name } }
  }
`);
export const UpdateTenantUserDocument = graphql(`
  mutation UpdateTenantUser($id: ID!, $input: UpdateUserInput!) {
    updateTenantUser(id: $id, input: $input) { id tenantId role username tenant { id name } }
  }
`);
export const UpdateSystemAdministratorDocument = graphql(`
  mutation UpdateSystemAdministrator($id: ID!, $input: UpdateUserInput!) {
    updateSystemAdministrator(id: $id, input: $input) { id tenantId role username tenant { id name } }
  }
`);
