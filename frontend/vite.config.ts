/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { execSync } from 'child_process'

// Get Git information
const getGitInfo = () => {
  try {
    return {
      commit: execSync('git rev-parse HEAD').toString().trim(),
      branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
      commitShort: execSync('git rev-parse --short HEAD').toString().trim(),
      commitDate: execSync('git log -1 --format=%cd --date=iso').toString().trim(),
      commitMessage: execSync('git log -1 --format=%s').toString().trim(),
    }
  } catch {
    return {
      commit: 'unknown',
      branch: 'unknown',
      commitShort: 'unknown',
      commitDate: 'unknown',
      commitMessage: 'unknown',
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  const gitInfo = getGitInfo()
  const buildTime = new Date().toISOString()

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          name: '配分表作成ツール',
          short_name: '配分表',
          description: '36店舗への商品配分表を自動生成するWebアプリケーション',
          theme_color: '#1976d2',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          orientation: 'portrait',
          icons: [
            {
              src: '/icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB (increased for WebDataRocks)
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: false
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/__tests__/setup.ts',
      css: true,
    },
    base: '/',  // Ensure assets are loaded from root path
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      // Ensure build output is clean
      emptyOutDir: true
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true
        }
      }
    },
    // Explicitly define environment variables for replacement
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL),
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID),
      // Build and Git information
      '__BUILD_INFO__': JSON.stringify({
        buildTime,
        gitCommit: gitInfo.commit,
        gitBranch: gitInfo.branch,
        gitCommitShort: gitInfo.commitShort,
        gitCommitDate: gitInfo.commitDate,
        gitCommitMessage: gitInfo.commitMessage,
      }),
    }
  }
})
