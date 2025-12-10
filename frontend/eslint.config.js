import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { createRequire } from 'module'

// CommonJSモジュールをインポート
const require = createRequire(import.meta.url)
const customRules = require('./eslint-rules/index.cjs')

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'custom-rules': customRules,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // z-indexのハードコードを禁止（AIコーディング事故防止）
      'custom-rules/no-hardcoded-zindex': ['error', {
        // 100以下の小さな値は許可（UIの微調整用）
        maxAllowedValue: 100,
        // 特定の値を許可（必要に応じて追加）
        allowedValues: [1, 10],
      }],
    },
  },
])
