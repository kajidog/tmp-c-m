import { graphql } from '../../api';

export const ProductChangedDocument = graphql(`
  subscription ProductChanged { productChanged { id tenantId name price } }
`);

export const ProductsDocument = graphql(`
  query Products { products { id tenantId name price } }
`);
export const ProductDocument = graphql(`
  query Product($id: ID!) { product(id: $id) { id tenantId name price } }
`);
export const UpdateProductDocument = graphql(`
  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) { id tenantId name price }
  }
`);
