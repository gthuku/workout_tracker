import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['server/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
        exclude: ['node_modules', 'dist'],
        setupFiles: ['./server/test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage/server',
            exclude: [
                'node_modules/',
                'server/test/',
                '**/*.d.ts',
                '**/*.test.ts',
                '**/*.spec.ts',
            ],
        },
        testTimeout: 10000,
    },
});
