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

/**
 * ジェスチャーヒントのタイプ
 */
export type GestureType =
  | 'swipe-horizontal'
  | 'swipe-vertical'
  | 'swipe-left'
  | 'swipe-right'
  | 'swipe-up'
  | 'swipe-down'
  | 'long-press'
  | 'tap';

/**
 * ハプティックフィードバック（触覚フィードバック）のタイプ
 */
export type HapticType =
  | 'light'      // 軽いタップ（選択、切り替え）
  | 'medium'     // 中程度の振動（ボタン押下）
  | 'heavy'      // 強い振動（重要な操作、エラー）
  | 'success'    // 成功通知
  | 'warning'    // 警告通知
  | 'error';     // エラー通知

/**
 * フォームステップの定義
 */
export interface FormStep {
  label: string;
  optional?: boolean;
}

/**
 * ダイアログ・モーダル状態型
 */

/**
 * 削除確認ダイアログの状態
 * @description 商品フォームカード内の一括削除機能で使用
 */
export interface DeleteDialogState {
  /** ダイアログが開いているか */
  open: boolean;
  /** 削除対象のフィールドタイプ */
  type: 'name' | 'origin' | 'specification' | 'quantity' | 'unit';
  /** 削除対象の値 */
  value: string | number;
  /** 削除条件 */
  conditions: {
    name?: string;
    origin?: string;
    specification?: string;
    quantityPerPackage?: number | null;
    unit?: string;
    packageUnit?: string;
  };
}

/**
 * 帳簿名ダイアログの状態
 * @description 注文フォームで帳簿名を入力するダイアログ
 */
export interface BookNameDialogState {
  /** ダイアログが開いているか */
  open: boolean;
  /** 帳簿名 */
  bookName: string;
}

/**
 * 帳合先削除確認ダイアログの状態
 * @description 帳合先を削除する際の確認ダイアログ
 */
export interface SupplierRemovalDialogState {
  /** ダイアログが開いているか */
  open: boolean;
  /** 削除対象の帳合先リスト */
  suppliersToRemove: string[];
  /** 影響を受ける商品の数 */
  affectedProductsCount: number;
  /** 新しく追加された帳合先リスト */
  newSuppliers: string[];
}

/**
 * モーダル状態
 * @description フォームモーダルの基本状態
 * @deprecated BookNameDialogState を使用してください
 */
export interface ModalState {
  /** モーダルが開いているか */
  open: boolean;
  /** 帳簿名 */
  bookName: string;
}
