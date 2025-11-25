/**
 * 環境変数設定
 * Single Source of Truth for environment variables
 *
 * 全ての環境変数参照はこのファイルを経由すること
 */

/**
 * APIのベースURL
 * 開発環境ではViteプロキシを使用するため'/api'
 * 本番環境では環境変数から取得
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 現在の実行環境
 * 'development' | 'production' | 'test'
 */
export const NODE_ENV = import.meta.env.MODE || 'development';

/**
 * 開発環境かどうか
 */
export const IS_DEVELOPMENT = NODE_ENV === 'development';

/**
 * 本番環境かどうか
 */
export const IS_PRODUCTION = NODE_ENV === 'production';

/**
 * テスト環境かどうか
 */
export const IS_TEST = NODE_ENV === 'test';

/**
 * 環境変数のヘルパー関数
 */
export const env = {
  /**
   * APIのベースURLを取得
   * テスト時の動的な変更に対応するため、毎回評価する
   */
  getApiBaseUrl: () => import.meta.env.VITE_API_BASE_URL || '/api',

  /**
   * バックエンドのベースURLを取得（/apiサフィックスを削除）
   * テスト時の動的な変更に対応するため、毎回評価する
   */
  getBackendBaseUrl: () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
    return apiBaseUrl ? apiBaseUrl.replace(/\/api$/, '') : window.location.origin;
  },

  /**
   * 現在の環境を取得
   */
  getNodeEnv: () => import.meta.env.MODE || 'development',

  /**
   * 開発環境かどうかを判定
   */
  isDevelopment: () => (import.meta.env.MODE || 'development') === 'development',

  /**
   * 本番環境かどうかを判定
   */
  isProduction: () => (import.meta.env.MODE || 'development') === 'production',

  /**
   * テスト環境かどうかを判定
   */
  isTest: () => (import.meta.env.MODE || 'development') === 'test',
} as const;
