/**
 * APIエンドポイント定義
 *
 * 設計原則:
 * - SSOT: すべてのエンドポイントURLを一箇所で管理
 * - 保守性: URLの変更が容易
 */

export const API_ENDPOINTS = {
    /**
     * テンプレート生成エンドポイント
     */
    GENERATE: '/api/generate',

    /**
     * PDFプレビュー生成エンドポイント
     */
    PREVIEW: '/api/preview',

    /**
     * ファイルダウンロードエンドポイント
     * @param {string} fileId - ファイルID
     * @param {string} filename - ファイル名（オプション）
     * @returns {string} ダウンロードURL
     */
    DOWNLOAD: (fileId, filename = '配分表_テンプレート.xlsx') => {
        return `/api/download/${fileId}?filename=${encodeURIComponent(filename)}`;
    },

    /**
     * ヘルスチェックエンドポイント
     */
    HEALTH: '/api/health',

    /**
     * バージョン情報エンドポイント
     */
    VERSION: '/api/version',

    /**
     * Firebase設定エンドポイント
     */
    FIREBASE_CONFIG: '/api/firebase-config'
};
