import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'url'
import eslint from 'vite-plugin-eslint'

// https://vite.dev/config/
export default defineConfig({
    plugins: [eslint()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    define: {
        __BUILD_HASH__: JSON.stringify(
            process.env.CF_PAGES_COMMIT_SHA ?? 'DEV'
        ),
    },
    server: {
        allowedHosts: ['localhost.test'],
    },
})
