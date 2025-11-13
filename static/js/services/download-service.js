/**
 * ダウンロードサービス
 *
 * 設計原則:
 * - 責務の明確化: ファイルダウンロード処理のみを担当
 * - デバイス対応: iOS/モバイルデバイスの特性に対応
 */

export class DownloadService {
    /**
     * ファイルをダウンロード
     * @param {string} url - ダウンロードURL
     * @param {string} filename - ファイル名
     */
    static downloadFile(url, filename = 'template.xlsx') {
        if (!url) {
            alert('ダウンロードするファイルがありません');
            return;
        }

        // iOS（iPhone/iPad）またはモバイルデバイス検出
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (isMobile || isIOS) {
            // モバイルデバイスの場合：モーダルを表示
            this.showDownloadModal(url, filename);
        } else {
            // デスクトップの場合：自動ダウンロード
            this.triggerDownload(url, filename);
        }
    }

    /**
     * ダウンロードを実行
     * @param {string} url - ダウンロードURL
     * @param {string} filename - ファイル名
     */
    static triggerDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log('[DownloadService] Download initiated:', filename);
    }

    /**
     * ダウンロードモーダルを表示
     * @param {string} url - ダウンロードURL
     * @param {string} filename - ファイル名
     */
    static showDownloadModal(url, filename) {
        const modal = document.getElementById('downloadModal');
        const downloadLink = document.getElementById('downloadModalLink');
        const closeBtn = document.getElementById('downloadModalClose');

        if (!modal || !downloadLink) {
            // フォールバック：モーダルが存在しない場合は直接ダウンロード
            this.triggerDownload(url, filename);
            return;
        }

        // ダウンロードリンクを設定
        downloadLink.href = url;
        downloadLink.download = filename;

        // モーダルを表示
        modal.style.display = 'flex';

        // 閉じるボタンのイベントリスナー
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }

        // モーダル背景クリックで閉じる
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };

        console.log('[DownloadService] Download modal shown');
    }

    /**
     * モバイルデバイスかどうかを判定
     * @returns {boolean} モバイルデバイスの場合true
     */
    static isMobileDevice() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    /**
     * iOSデバイスかどうかを判定
     * @returns {boolean} iOSデバイスの場合true
     */
    static isIOSDevice() {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    }
}
