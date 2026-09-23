import { ProductDetails } from '../features/products/ProductDetails';
import { Products } from '../features/products/Products';

export function ProductsPage({ onEdit }: { onEdit: (id: string) => void }) {
  return (
    <section>
      <h1>商品一覧</h1>
      <Products onEdit={onEdit} />
    </section>
  );
}

export function ProductDetailsPage({ id, onBack }: { id: string; onBack: () => void }) {
  return (
    <section>
      <button type="button" onClick={onBack}>
        商品一覧へ戻る
      </button>
      <h1>商品詳細・編集</h1>
      <ProductDetails id={id} />
    </section>
  );
}
