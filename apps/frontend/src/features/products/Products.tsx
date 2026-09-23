import { useQuery, useSubscription } from '@apollo/client';
import { QueryStatus } from '../../components/QueryStatus';
import { ProductChangedDocument, ProductsDocument } from './products.api';

export function Products({ onEdit }: { onEdit: (id: string) => void }) {
  const { data, loading, error, refetch } = useQuery(ProductsDocument);
  // 同じClientの正規化キャッシュに受信した商品を反映し、一覧を更新します。
  const { error: subscriptionError } = useSubscription(ProductChangedDocument);
  return (
    <>
      <QueryStatus loading={loading} error={error} onRetry={refetch} />
      {subscriptionError && (
        <p role="alert">変更の自動受信が停止しました。画面を開き直してください。</p>
      )}
      {data &&
        !error &&
        (data.products.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>商品ID</th>
                  <th>商品名</th>
                  <th>価格</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td>{product.name}</td>
                    <td>{product.price.toLocaleString('ja-JP')}円</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onEdit(product.id)}
                        aria-label={`${product.name}の詳細`}
                      >
                        詳細・編集
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>商品がありません。</p>
        ))}
    </>
  );
}
