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
      // ======================================
      // AIコーディング事故防止ルール
      // ======================================

      // z-indexのハードコードを禁止
      'custom-rules/no-hardcoded-zindex': ['error', {
        // 100以下の小さな値は許可（UIの微調整用）
        maxAllowedValue: 100,
        // 特定の値を許可（必要に応じて追加）
        allowedValues: [1, 10],
      }],

      // カラー値のハードコードを禁止
      // 注: 既存コードに違反が多いため warn で開始
      'custom-rules/no-hardcoded-colors': ['warn', {
        // CSS標準キーワードは許可
        allowedColors: ['transparent', 'inherit', 'currentColor', 'none', 'unset', 'initial'],
        // grey.xxx形式のMUI色を許可
        allowGrey: true,
      }],

      // フォントサイズのハードコードを禁止
      // 注: 既存コードに違反が多いため warn で開始
      'custom-rules/no-hardcoded-fontsize': ['warn', {
        // CSS標準キーワードは許可
        allowedValues: ['inherit', 'unset', 'initial'],
        // レスポンシブ対応のオブジェクト形式を許可
        allowResponsive: true,
      }],

      // スペーシング値のハードコードを禁止
      // 注: 既存コードに違反が多いため warn で開始
      'custom-rules/no-hardcoded-spacing': ['warn', {
        // CSS標準キーワードは許可
        allowedValues: ['auto', 'inherit', 'unset', 'initial', '0', '100%'],
        // 4px以下の微調整は許可
        maxAllowedPx: 4,
        // レスポンシブ対応のオブジェクト形式を許可
        allowResponsive: true,
      }],
    },
  },
])
