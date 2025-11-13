/**
 * フォームユーティリティ
 *
 * 設計原則:
 * - 責務の明確化: フォーム関連のヘルパー関数のみを提供
 * - 再利用性: 汎用的なユーティリティ関数
 */

export class FormUtils {
    /**
     * 数値を安全にパースする
     * @param {any} value - パースする値
     * @param {number} defaultValue - デフォルト値
     * @returns {number} パースされた数値
     */
    static parseInt(value, defaultValue = 0) {
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    /**
     * 浮動小数点数を安全にパースする
     * @param {any} value - パースする値
     * @param {number} defaultValue - デフォルト値
     * @returns {number} パースされた浮動小数点数
     */
    static parseFloat(value, defaultValue = 0.0) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    /**
     * 文字列をトリム（nullセーフ）
     * @param {any} value - トリムする値
     * @param {string} defaultValue - デフォルト値
     * @returns {string} トリムされた文字列
     */
    static trim(value, defaultValue = '') {
        if (!value || typeof value !== 'string') {
            return defaultValue;
        }
        return value.trim();
    }

    /**
     * 空の文字列をnullに変換
     * @param {string} value - 変換する値
     * @returns {string|null} 空でない文字列またはnull
     */
    static emptyToNull(value) {
        const trimmed = this.trim(value);
        return trimmed.length > 0 ? trimmed : null;
    }

    /**
     * フォーム要素の値を取得（nullセーフ）
     * @param {string} elementId - 要素ID
     * @param {any} defaultValue - デフォルト値
     * @returns {any} 要素の値
     */
    static getValue(elementId, defaultValue = null) {
        const element = document.getElementById(elementId);
        return element ? element.value : defaultValue;
    }

    /**
     * 数値フォーマット（カンマ区切り）
     * @param {number} value - フォーマットする数値
     * @returns {string} フォーマットされた文字列
     */
    static formatNumber(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return '';
        }
        return value.toLocaleString('ja-JP');
    }

    /**
     * 日付フォーマット（YYYY-MM-DD）
     * @param {Date} date - フォーマットする日付
     * @returns {string} フォーマットされた日付文字列
     */
    static formatDate(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            return '';
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 現在の日付を取得（YYYY-MM-DD形式）
     * @returns {string} 現在の日付
     */
    static getCurrentDate() {
        return this.formatDate(new Date());
    }

    /**
     * 要素を表示
     * @param {string} elementId - 要素ID
     * @param {string} displayStyle - 表示スタイル（デフォルト: 'block'）
     */
    static showElement(elementId, displayStyle = 'block') {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = displayStyle;
        }
    }

    /**
     * 要素を非表示
     * @param {string} elementId - 要素ID
     */
    static hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    }
}
