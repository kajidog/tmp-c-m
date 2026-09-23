import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';

// 応答を読み切らずに転送するため、開発・本番ともSSEを同じURLで利用できます。
async function proxyGraphql({ request }: LoaderFunctionArgs | ActionFunctionArgs) {
  const headers = new Headers();
  for (const name of ['content-type', 'accept', 'authorization', 'x-tenant-id']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const url = new URL(process.env.GRAPHQL_BACKEND_URL ?? 'http://127.0.0.1:4000/graphql');
  url.search = new URL(request.url).search;
  const response = await fetch(url, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
    signal: request.signal,
  });
  return new Response(forwardBody(response.body, request.signal), {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

function forwardBody(body: ReadableStream<Uint8Array> | null, signal: AbortSignal) {
  if (!body) return null;
  const reader = body.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (error) {
        // 画面遷移による購読解除は正常終了として扱います。
        if (signal.aborted) controller.close();
        else controller.error(error);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

export const loader = proxyGraphql;
export const action = proxyGraphql;
