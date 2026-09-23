import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    remix({
      appDirectory: 'src',
      // 本番サーバーでも標準のFetch実装を使い、SSEの切断を処理します。
      future: { v3_singleFetch: true },
    }),
  ],
  // Apollo Client v3をSSRでもESモジュールとして読み込めるように変換します。
  ssr: { noExternal: ['@apollo/client'] },
  // Remixの既定エントリーが使う依存も、初回表示前に変換します。
  optimizeDeps: { include: ['react-dom/client'] },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
});
