import { createServer } from 'node:http';
import { createApp } from './server';

const port = Number(process.env.PORT ?? 4000);
createServer(createApp()).listen(port, () =>
  console.log(`GraphQL: http://localhost:${port}/graphql`),
);
