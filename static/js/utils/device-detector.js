/**
 * デバイス検出ユーティリティ
 *
 * 設計原則:
 * - 責務の明確化: デバイス情報の取得のみを担当
 * - 再利用性: 他のモジュールから利用可能
 */

export class DeviceDetector {
    /**
     * モバイルデバイスかどうかを判定
     * @returns {boolean} モバイルデバイスの場合true
     */
    static isMobile() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    /**
     * iOSデバイスかどうかを判定
     * @returns {boolean} iOSデバイスの場合true
     */
    static isIOS() {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    /**
     * Androidデバイスかどうかを判定
     * @returns {boolean} Androidデバイスの場合true
     */
    static isAndroid() {
        return /Android/i.test(navigator.userAgent);
    }

    /**
     * タブレットデバイスかどうかを判定
     * @returns {boolean} タブレットデバイスの場合true
     */
    static isTablet() {
        return /iPad|Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent);
    }

    /**
     * デスクトップデバイスかどうかを判定
     * @returns {boolean} デスクトップデバイスの場合true
     */
    static isDesktop() {
        return !this.isMobile();
    }

    /**
     * デバイス情報を取得
     * @returns {Object} デバイス情報
     */
    static getDeviceInfo() {
        return {
            isMobile: this.isMobile(),
            isIOS: this.isIOS(),
            isAndroid: this.isAndroid(),
            isTablet: this.isTablet(),
            isDesktop: this.isDesktop(),
            userAgent: navigator.userAgent
        };
    }
}
