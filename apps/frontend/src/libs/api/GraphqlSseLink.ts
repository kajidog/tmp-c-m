import { ApolloLink, type FetchResult, Observable, type Operation } from '@apollo/client';
import { print } from 'graphql';
import { type Client, type ClientOptions, createClient, NetworkError } from 'graphql-sse';

// HttpLinkと同じApolloLinkのインターフェイスで、SSEの購読を扱います。
export class GraphqlSseLink extends ApolloLink {
  private readonly client: Client;

  constructor(options: ClientOptions) {
    super();
    this.client = createClient({ ...options, singleConnection: false });
  }

  request(operation: Operation): Observable<FetchResult> {
    return new Observable((sink) =>
      this.client.subscribe(
        {
          query: print(operation.query),
          variables: operation.variables,
          operationName: operation.operationName,
        },
        {
          next: (result) => sink.next(result as FetchResult),
          complete: () => sink.complete(),
          error: (error) => {
            // HTTPの認証エラーも共通のErrorLinkで扱えるようにします。
            const normalized =
              error instanceof NetworkError
                ? Object.assign(new Error(error.message), { statusCode: error.response?.status })
                : error;
            sink.error(normalized);
          },
        },
      ),
    );
  }

  // ログアウト時は再接続の待機も含め、全購読を終了します。
  dispose() {
    this.client.dispose();
  }
}
