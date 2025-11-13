/**
 * APIクライアント
 *
 * 設計原則:
 * - 抽象化: fetch APIの詳細を隠蔽
 * - エラーハンドリング: 一貫したエラー処理
 * - 責務の明確化: API通信のみを担当
 */

import { API_ENDPOINTS } from './endpoints.js';

export class APIClient {
    /**
     * テンプレート生成
     * @param {Object} data - リクエストデータ
     * @returns {Promise<Object>} レスポンス
     * @throws {Error} API通信エラー
     */
    static async generateTemplate(data) {
        try {
            const response = await fetch(API_ENDPOINTS.GENERATE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({
                    detail: 'テンプレート生成に失敗しました'
                }));
                throw new Error(error.detail || 'テンプレート生成に失敗しました');
            }

            return await response.json();
        } catch (error) {
            console.error('[APIClient] Generate template error:', error);
            throw error;
        }
    }

    /**
     * PDFプレビュー生成
     * @param {Object} data - リクエストデータ
     * @returns {Promise<Blob>} PDF Blob
     * @throws {Error} API通信エラー
     */
    static async generatePreview(data) {
        try {
            const response = await fetch(API_ENDPOINTS.PREVIEW, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({
                    detail: 'プレビュー生成に失敗しました'
                }));
                throw new Error(error.detail || 'プレビュー生成に失敗しました');
            }

            return await response.blob();
        } catch (error) {
            console.error('[APIClient] Generate preview error:', error);
            throw error;
        }
    }

    /**
     * ヘルスチェック
     * @returns {Promise<Object>} ヘルス状態
     */
    static async checkHealth() {
        try {
            const response = await fetch(API_ENDPOINTS.HEALTH);
            return await response.json();
        } catch (error) {
            console.error('[APIClient] Health check error:', error);
            throw error;
        }
    }

    /**
     * バージョン情報取得
     * @returns {Promise<Object>} バージョン情報
     */
    static async getVersion() {
        try {
            const response = await fetch(API_ENDPOINTS.VERSION);
            return await response.json();
        } catch (error) {
            console.error('[APIClient] Get version error:', error);
            throw error;
        }
    }

    /**
     * Firebase設定取得
     * @returns {Promise<Object>} Firebase設定
     */
    static async getFirebaseConfig() {
        try {
            const response = await fetch(API_ENDPOINTS.FIREBASE_CONFIG);
            return await response.json();
        } catch (error) {
            console.error('[APIClient] Get Firebase config error:', error);
            throw error;
        }
    }
}
