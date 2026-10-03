import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: 'test-reports/junit.xml',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'clover', 'cobertura', 'json'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
    },
  },
});
