import { graphql } from '../../api';

export const MeDocument = graphql(`
  query Me {
    me { id tenantId role username }
  }
`);
