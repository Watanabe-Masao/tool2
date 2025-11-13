/**
 * ローディング表示管理
 *
 * 設計原則:
 * - 責務の明確化: ローディング表示のみを担当
 * - シンプルさ: 表示/非表示の単純な操作
 */

export class LoadingUI {
    /**
     * ローディングを表示
     */
    static show() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            console.log('[LoadingUI] Loading shown');
        }
    }

    /**
     * ローディングを非表示
     */
    static hide() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
            console.log('[LoadingUI] Loading hidden');
        }
    }

    /**
     * ローディング状態を切り替え
     */
    static toggle() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            const isVisible = loadingOverlay.style.display === 'flex';
            loadingOverlay.style.display = isVisible ? 'none' : 'flex';
        }
    }
}
