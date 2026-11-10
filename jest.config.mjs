/**
 * Jest (ESM) config. Uses @swc/jest to transpile TypeScript → ESM without type-checking,
 * so it works regardless of the TypeScript version and needs no generated Prisma types.
 *
 * Run with the npm scripts (they add --experimental-vm-modules for ESM module mocking).
 */
/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  // Our source imports use explicit ".js" extensions (NodeNext); strip them for resolution.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: false },
          target: 'es2022',
        },
        module: { type: 'es6' },
        sourceMaps: 'inline',
      },
    ],
  },
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
  clearMocks: true,
  restoreMocks: true,
};
