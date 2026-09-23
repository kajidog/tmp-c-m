import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'packages/schemas/schema.graphql',
  documents: ['apps/frontend/src/**/*.api.ts'],
  generates: {
    'apps/frontend/src/api/': {
      preset: 'client',
      presetConfig: { fragmentMasking: false },
      config: { useTypeImports: true, enumsAsTypes: true },
    },
  },
};
export default config;
