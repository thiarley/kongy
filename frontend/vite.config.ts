import { defineConfig } from 'vite'

export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: 8081,
        proxy: {
            '/api': {
                target: process.env.BACKEND_URL || 'http://backend:8000', // Docker service name or local override
                changeOrigin: true
            }
        }
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: 'index.html',
                login: 'login.html'
            }
        }
    }
})
