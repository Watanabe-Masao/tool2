/**
 * 通知・結果表示管理
 *
 * 設計原則:
 * - 責務の明確化: 成功/エラーメッセージ表示のみを担当
 * - 標準化: 一貫したメッセージ表示方法
 */

export class NotificationUI {
    /**
     * 成功メッセージを表示
     * @param {string} message - 表示するメッセージ
     */
    static showSuccess(message) {
        const resultSection = document.getElementById('resultSection');
        const messageText = document.getElementById('messageText');

        if (resultSection && messageText) {
            messageText.textContent = message;
            resultSection.style.display = 'block';
        }

        // エラーセクションを非表示
        this.hideError();

        console.log('[NotificationUI] Success message shown:', message);
    }

    /**
     * エラーメッセージを表示
     * @param {string} message - 表示するエラーメッセージ
     */
    static showError(message) {
        const errorSection = document.getElementById('errorSection');
        const errorText = document.getElementById('errorText');

        if (errorSection && errorText) {
            errorText.textContent = message;
            errorSection.style.display = 'block';
        }

        // 成功セクションを非表示
        this.hideSuccess();

        console.log('[NotificationUI] Error message shown:', message);
    }

    /**
     * 成功メッセージを非表示
     */
    static hideSuccess() {
        const resultSection = document.getElementById('resultSection');
        if (resultSection) {
            resultSection.style.display = 'none';
        }
    }

    /**
     * エラーメッセージを非表示
     */
    static hideError() {
        const errorSection = document.getElementById('errorSection');
        if (errorSection) {
            errorSection.style.display = 'none';
        }
    }

    /**
     * すべての通知を非表示
     */
    static hideAll() {
        this.hideSuccess();
        this.hideError();

        // ダウンロードボタンも非表示にする
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.style.display = 'none';
        }

        console.log('[NotificationUI] All notifications hidden');
    }

    /**
     * ダウンロードボタンを表示
     */
    static showDownloadButton() {
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.style.display = 'inline-block';
        }
    }

    /**
     * ダウンロードボタンを非表示
     */
    static hideDownloadButton() {
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.style.display = 'none';
        }
    }
}
