/**
 * UI 関連型定義
 *
 * @description
 * デバイス検出、通知、テーマなど、UI に関連する全ての型を定義
 */

/**
 * デバイス検出結果
 */
export interface DeviceInfo {
  /** iOSかどうか */
  isIOS: boolean;
  /** Safariかどうか */
  isSafari: boolean;
  /** モバイルかどうか */
  isMobile: boolean;
  /** タブレットかどうか */
  isTablet: boolean;
}

/**
 * 通知の種類
 */
export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

/**
 * 通知データ
 */
export interface NotificationData {
  /** メッセージ */
  message: string;
  /** 種類 */
  severity: NotificationSeverity;
  /** 表示時間（ミリ秒） */
  duration?: number;
}
