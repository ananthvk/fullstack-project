import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'


export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    return {
        // vite config
        plugins: [
            react(),
            {
                name: 'check-if-env-variables-are-set',
                config() {
                    if (!env.VITE_SUPABASE_URL) {
                        throw new Error("VITE_SUPABASE_URL not set")
                    }
                    if (!env.VITE_SUPABASE_KEY) {
                        throw new Error("VITE_SUPABASE_KEY not set")
                    }
                }
            }
        ],
        server: {
            port: 3000,
            host: true
        }
    }
})