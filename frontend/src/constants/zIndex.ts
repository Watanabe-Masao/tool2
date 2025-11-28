/**
 * zIndex定数の中央管理
 *
 * ## 設計方針
 *
 * ### 階層構造（500飛び）
 * - 1000番台: ページモーダル（第1階層）
 * - 1500番台: ネストされたダイアログ（第2階層）
 * - 2000番台: さらにネストされたダイアログ（第3階層）
 * - 2500番台: 最深階層のダイアログ（第4階層）
 * - 3000番台: メッセージログ、トースト通知など
 *
 * ### 要素オフセット（1〜499）
 * - 1: 閉じるボタン
 * - 50: ポップオーバー
 * - 100: Selectのドロップダウンメニュー
 * - 150: オートコンプリートのドロップダウン
 * - 200: 日付ピッカー
 * - 250: カラーピッカー
 *
 * ### 使用例
 * - ページモーダル: MODAL_Z_INDEX.PAGE_MODAL
 * - 閉じるボタン: MODAL_Z_INDEX.PAGE_MODAL + ELEMENT_OFFSET.CLOSE_BUTTON
 * - Drawer内のSelect: MODAL_Z_INDEX.NESTED_DIALOG + ELEMENT_OFFSET.SELECT_MENU
 *
 * Material-UIのデフォルトzIndex:
 * - mobileStepper: 1000
 * - speedDial: 1050
 * - appBar: 1100
 * - drawer: 1200
 * - modal: 1300
 * - snackbar: 1400
 * - tooltip: 1500
 *
 * @see https://mui.com/material-ui/customization/z-index/
 */

/**
 * 要素オフセット定数（1〜499）
 *
 * 階層のベース値に加算して使用します。
 * これにより、同じ階層内での細かい前後関係を管理できます。
 */
export const ELEMENT_OFFSET = {
  /** 閉じるボタン */
  CLOSE_BUTTON: 1,
  /** ポップオーバー */
  POPOVER: 50,
  /** Selectのドロップダウンメニュー */
  SELECT_MENU: 100,
  /** オートコンプリートのドロップダウン */
  AUTOCOMPLETE_MENU: 150,
  /** 日付ピッカー */
  DATE_PICKER: 200,
  /** カラーピッカー */
  COLOR_PICKER: 250,
} as const;

/**
 * モーダル階層のzIndex定義（500飛び）
 *
 * 各階層は500の間隔を持ち、要素オフセット（1〜499）を加算できます。
 */
export const MODAL_Z_INDEX = {
  /** ページモーダル（第1階層）- 1000番台 */
  PAGE_MODAL: 1000,
  /** ネストされたダイアログ（第2階層）- 1500番台 */
  NESTED_DIALOG: 1500,
  /** さらにネストされたダイアログ（第3階層）- 2000番台 */
  NESTED_NESTED_DIALOG: 2000,
  /** 最深階層のダイアログ（第4階層）- 2500番台 */
  DEEP_NESTED_DIALOG: 2500,
} as const;

/**
 * メッセージ・通知のzIndex定義 - 3000番台
 *
 * すべてのモーダル階層より上に表示されます。
 */
export const MESSAGE_Z_INDEX = {
  /** トースト通知 - 3000番台 */
  TOAST: 3000,
  /** スナックバー - 3000番台 */
  SNACKBAR: 3000,
  /** グローバルエラーメッセージ - 3500番台 */
  GLOBAL_ERROR: 3500,
  /** ローディングオーバーレイ - 4000番台 */
  LOADING_OVERLAY: 4000,
} as const;

/**
 * アプリケーション固定要素のzIndex定義
 *
 * ページコンテンツより上、モーダルより下に配置されます。
 */
export const APP_Z_INDEX = {
  /** 固定ヘッダー - 100番台 */
  HEADER: 100,
  /** モバイルボトムナビゲーション - 100番台 */
  MOBILE_BOTTOM_NAV: 100,
  /** フローティング進捗サマリー - 150番台 */
  FLOATING_PROGRESS_SUMMARY: 150,
  /** サイドバー - 200番台 */
  SIDEBAR: 200,
} as const;

/**
 * zIndex階層の全体像
 *
 * 4000番台: ローディングオーバーレイ（最上層）
 * 3500番台: グローバルエラー
 * 3000番台: トースト通知、スナックバー
 * 2500番台: 最深階層ダイアログ（第4階層）
 * 2000番台: ネストされたダイアログ（第3階層）
 * 1500番台: ネストされたダイアログ（第2階層）
 * 1000番台: ページモーダル（第1階層）
 *  200番台: サイドバー
 *  150番台: フローティング進捗サマリー
 *  100番台: ヘッダー、ボトムナビ
 *    0番台: ページコンテンツ
 */
