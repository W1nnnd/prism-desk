import { defineConfig } from 'vitest/config';

// Pure-logic tests run without the IWSDK dev plugin / emulator injection.
export default defineConfig({ test: { include: ['tests/**/*.test.ts'], environment: 'node' } });
