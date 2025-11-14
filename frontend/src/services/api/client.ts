import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL } from '@/utils/constants';

/**
 * Axiosインスタンスの作成
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30秒
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // リクエストインターセプター
  client.interceptors.request.use(
    (config) => {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error('[API] Request error:', error);
      return Promise.reject(error);
    }
  );

  // レスポンスインターセプター
  client.interceptors.response.use(
    (response) => {
      console.log(`[API] Response from ${response.config.url}:`, response.status);
      return response;
    },
    (error: AxiosError) => {
      console.error('[API] Response error:', error.response?.status, error.message);

      // エラーメッセージの標準化
      if (error.response) {
        // サーバーからのエラーレスポンス
        const errorMessage =
          (error.response.data as any)?.detail ||
          (error.response.data as any)?.message ||
          'サーバーエラーが発生しました';
        return Promise.reject(new Error(errorMessage));
      } else if (error.request) {
        // リクエストは送信されたがレスポンスがない
        return Promise.reject(new Error('サーバーに接続できませんでした'));
      } else {
        // リクエスト設定エラー
        return Promise.reject(new Error('リクエストの送信に失敗しました'));
      }
    }
  );

  return client;
};

/**
 * APIクライアントインスタンス
 */
export const apiClient = createApiClient();
