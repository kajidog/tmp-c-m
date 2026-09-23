import { ProductDetails } from '../features/products/ProductDetails';
import { Products } from '../features/products/Products';
import type { TenantScope } from '../libs/api/clients';

export function ProductsPage({
  scope,
  onEdit,
}: {
  scope: TenantScope;
  onEdit: (id: string) => void;
}) {
  return (
    <section>
      <h1>商品一覧</h1>
      <Products scope={scope} onEdit={onEdit} />
    </section>
  );
}

export function ProductDetailsPage({
  scope,
  id,
  onBack,
}: {
  scope: TenantScope;
  id: string;
  onBack: () => void;
}) {
  return (
    <section>
      <button type="button" onClick={onBack}>
        商品一覧へ戻る
      </button>
      <h1>商品詳細・編集</h1>
      <ProductDetails scope={scope} id={id} />
    </section>
  );
}
