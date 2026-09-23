import { createApp } from '../apps/backend/src/server';

export function createTransport() {
  const app = createApp();
  const requests: Request[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request.clone());
    return app.fetch(request);
  };
  return { fetch, requests, uri: 'http://localhost/graphql' };
}
