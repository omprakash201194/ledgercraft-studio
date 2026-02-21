/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    root: path.resolve(process.cwd(), 'renderer'),
    base: './',
    build: {
        outDir: path.resolve(process.cwd(), 'dist/renderer'),
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        strictPort: true,
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/tests/setup.ts',
        css: false,
    },
});
