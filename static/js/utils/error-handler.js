/**
 * エラーハンドラーユーティリティ
 *
 * 設計原則:
 * - 統一されたエラーハンドリング: すべてのエラーを一貫した方法で処理
 * - ユーザーフレンドリー: 技術的なエラーを分かりやすいメッセージに変換
 * - ログ記録: すべてのエラーをコンソールに記録
 */

export class ErrorHandler {
    /**
     * エラーメッセージの種類
     */
    static ErrorTypes = {
        NETWORK: 'NetworkError',
        VALIDATION: 'ValidationError',
        SERVER: 'ServerError',
        NOT_FOUND: 'NotFoundError',
        UNKNOWN: 'UnknownError'
    };

    /**
     * APIエラーハンドリング
     * @param {Error|Response} error - エラーオブジェクトまたはレスポンス
     * @param {string} context - エラー発生のコンテキスト（オプション）
     * @returns {string} ユーザー向けエラーメッセージ
     */
    static handle(error, context = '') {
        console.error('[ErrorHandler] Error occurred:', {
            error,
            context,
            timestamp: new Date().toISOString()
        });

        // エラータイプの判定
        const errorType = this.detectErrorType(error);
        const message = this.getErrorMessage(error, errorType);

        // コンテキストを含めたメッセージ
        const fullMessage = context
            ? `${context}: ${message}`
            : message;

        console.error(`[ErrorHandler] ${errorType}: ${fullMessage}`);

        return fullMessage;
    }

    /**
     * エラータイプを検出
     * @param {Error|Response} error - エラーオブジェクト
     * @returns {string} エラータイプ
     */
    static detectErrorType(error) {
        // ネットワークエラー
        if (this.isNetworkError(error)) {
            return this.ErrorTypes.NETWORK;
        }

        // HTTPレスポンスエラー
        if (error.status) {
            if (error.status === 404) {
                return this.ErrorTypes.NOT_FOUND;
            } else if (error.status === 422 || error.status === 400) {
                return this.ErrorTypes.VALIDATION;
            } else if (error.status >= 500) {
                return this.ErrorTypes.SERVER;
            }
        }

        return this.ErrorTypes.UNKNOWN;
    }

    /**
     * エラーメッセージを取得
     * @param {Error|Response} error - エラーオブジェクト
     * @param {string} errorType - エラータイプ
     * @returns {string} エラーメッセージ
     */
    static getErrorMessage(error, errorType) {
        // エラーオブジェクトからメッセージを抽出
        if (error.message) {
            return error.message;
        }

        // エラータイプに応じたデフォルトメッセージ
        switch (errorType) {
            case this.ErrorTypes.NETWORK:
                return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
            case this.ErrorTypes.VALIDATION:
                return '入力データが正しくありません。入力内容を確認してください。';
            case this.ErrorTypes.NOT_FOUND:
                return '指定されたリソースが見つかりません。';
            case this.ErrorTypes.SERVER:
                return 'サーバーエラーが発生しました。しばらく時間をおいて再度お試しください。';
            default:
                return '予期しないエラーが発生しました。';
        }
    }

    /**
     * ネットワークエラーかどうかを判定
     * @param {Error} error - エラーオブジェクト
     * @returns {boolean} ネットワークエラーの場合true
     */
    static isNetworkError(error) {
        return (
            error instanceof TypeError &&
            (error.message.includes('Failed to fetch') ||
             error.message.includes('Network request failed') ||
             error.message.includes('NetworkError'))
        );
    }

    /**
     * バリデーションエラーかどうかを判定
     * @param {Error} error - エラーオブジェクト
     * @returns {boolean} バリデーションエラーの場合true
     */
    static isValidationError(error) {
        return (
            error.status === 422 ||
            error.status === 400 ||
            (error.message && error.message.includes('validation'))
        );
    }

    /**
     * サーバーエラーかどうかを判定
     * @param {Error} error - エラーオブジェクト
     * @returns {boolean} サーバーエラーの場合true
     */
    static isServerError(error) {
        return error.status >= 500;
    }

    /**
     * エラー情報を構造化して取得
     * @param {Error} error - エラーオブジェクト
     * @returns {Object} 構造化されたエラー情報
     */
    static getErrorInfo(error) {
        return {
            type: this.detectErrorType(error),
            message: error.message || 'Unknown error',
            status: error.status || null,
            timestamp: new Date().toISOString(),
            stack: error.stack || null
        };
    }

    /**
     * エラーをユーザーに表示
     * @param {string} message - エラーメッセージ
     * @param {Function} displayFunction - 表示関数（オプション、デフォルトはalert）
     */
    static display(message, displayFunction = null) {
        if (displayFunction && typeof displayFunction === 'function') {
            displayFunction(message);
        } else {
            // デフォルトはalertで表示
            alert(message);
        }
    }

    /**
     * 開発モード用の詳細ログ
     * @param {Error} error - エラーオブジェクト
     */
    static logDetailedError(error) {
        if (console.table) {
            console.table(this.getErrorInfo(error));
        } else {
            console.log('[ErrorHandler] Detailed error info:', this.getErrorInfo(error));
        }

        if (error.stack) {
            console.log('[ErrorHandler] Stack trace:', error.stack);
        }
    }
}
