import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import type { ProductQuery } from '../../api/graphql';
import { QueryStatus } from '../../components/QueryStatus';
import { useSaveAction } from '../../hooks/useSaveAction';
import { ProductDocument, UpdateProductDocument } from './products.api';

export function ProductDetails({ id }: { id: string }) {
  const { data, loading, error, refetch } = useQuery(ProductDocument, { variables: { id } });
  return (
    <>
      <QueryStatus loading={loading} error={error} onRetry={refetch} />
      {data && !error && <ProductForm key={data.product.id} product={data.product} />}
    </>
  );
}

function ProductForm({ product }: { product: ProductQuery['product'] }) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [saved, setSaved] = useState(false);
  // 詳細も商品一覧も同じテナント用Clientを使うため、更新結果の正規化で一覧が揃います。
  // 件数が変わる操作（追加・削除）を足すときは evictQueryFields で products を捨ててください。
  const [updateProduct] = useMutation(UpdateProductDocument);
  const { save, saving, error } = useSaveAction();
  const validPrice =
    price.trim() !== '' &&
    Number.isInteger(Number(price)) &&
    Number(price) >= 0 &&
    Number(price) <= 2147483647;
  return (
    <form
      className="detail-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim() || !validPrice) return;
        setSaved(false);
        void save(async () => {
          const { data } = await updateProduct({
            variables: { id: product.id, input: { name: name.trim(), price: Number(price) } },
          });
          if (data) {
            setName(data.updateProduct.name);
            setPrice(String(data.updateProduct.price));
          }
          setSaved(true);
        });
      }}
    >
      <p className="muted">商品ID: {product.id}</p>
      <label>
        商品名
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          required
          disabled={saving}
        />
      </label>
      <label>
        価格（円）
        <input
          type="number"
          min="0"
          max="2147483647"
          step="1"
          value={price}
          onChange={(e) => {
            setPrice(e.target.value);
            setSaved(false);
          }}
          required
          disabled={saving}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">保存しました。</p>}
      <button type="submit" className="primary" disabled={saving || !name.trim() || !validPrice}>
        {saving ? '保存中…' : '保存'}
      </button>
    </form>
  );
}
