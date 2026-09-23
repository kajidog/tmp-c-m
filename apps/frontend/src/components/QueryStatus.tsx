export function QueryStatus({
  loading,
  error,
  onRetry,
}: {
  loading?: boolean;
  error?: { message: string };
  onRetry?: () => Promise<unknown>;
}) {
  if (loading) return <p role="status">読み込み中…</p>;
  if (error)
    return (
      <div role="alert">
        <p>{error.message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={() => {
              // 再取得のエラーもQueryの状態を通じて、このコンポーネントに表示します。
              void onRetry().catch(() => undefined);
            }}
          >
            再読み込み
          </button>
        )}
      </div>
    );
  return null;
}
