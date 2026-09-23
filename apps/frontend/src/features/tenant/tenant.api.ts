import { graphql } from '../../api';

export const TenantsDocument = graphql(`
  query Tenants { tenants { id name } }
`);
