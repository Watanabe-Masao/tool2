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
 * ### 使用例（型付きヘルパー関数）
 * - ページモーダル: zIndex('PAGE_MODAL')
 * - 閉じるボタン: zIndex('PAGE_MODAL', 'CLOSE_BUTTON')
 * - Drawer内のSelect: zIndex('NESTED_DIALOG', 'SELECT_MENU')
 *
 * ### stacking context に注意
 * z-indexは同じstacking context内でのみ有効です。
 * transform, filter, opacity < 1, position: fixed/relative + z-index等が
 * 付いた親要素は新しいstacking contextを作成するため注意が必要です。
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
 * レイヤー階層のzIndex定義
 *
 * アプリケーション全体の階層構造を定義します。
 */
export const LAYER_Z_INDEX = {
  /** ページコンテンツ - 0番台 */
  PAGE_CONTENT: 0,
  /** ヘッダー - 100番台 */
  HEADER: 100,
  /** モバイルボトムナビゲーション - 100番台 */
  MOBILE_BOTTOM_NAV: 100,
  /** フローティング進捗サマリー - 150番台 */
  FLOATING_SUMMARY: 150,
  /** サイドバー - 200番台 */
  SIDEBAR: 200,
  /** ページモーダル（第1階層）- 1000番台 */
  PAGE_MODAL: 1000,
  /** ネストされたダイアログ（第2階層）- 1500番台 */
  NESTED_DIALOG: 1500,
  /** さらにネストされたダイアログ（第3階層）- 2000番台 */
  NESTED_NESTED_DIALOG: 2000,
  /** 最深階層のダイアログ（第4階層）- 2500番台 */
  DEEP_NESTED_DIALOG: 2500,
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
 * 後方互換性のための旧定数（非推奨）
 *
 * @deprecated 代わりに zIndex() ヘルパー関数を使用してください
 */
export const MODAL_Z_INDEX = {
  PAGE_MODAL: LAYER_Z_INDEX.PAGE_MODAL,
  NESTED_DIALOG: LAYER_Z_INDEX.NESTED_DIALOG,
  NESTED_NESTED_DIALOG: LAYER_Z_INDEX.NESTED_NESTED_DIALOG,
  DEEP_NESTED_DIALOG: LAYER_Z_INDEX.DEEP_NESTED_DIALOG,
} as const;

/**
 * @deprecated 代わりに zIndex() ヘルパー関数を使用してください
 */
export const MESSAGE_Z_INDEX = {
  TOAST: LAYER_Z_INDEX.TOAST,
  SNACKBAR: LAYER_Z_INDEX.SNACKBAR,
  GLOBAL_ERROR: LAYER_Z_INDEX.GLOBAL_ERROR,
  LOADING_OVERLAY: LAYER_Z_INDEX.LOADING_OVERLAY,
} as const;

/**
 * @deprecated 代わりに zIndex() ヘルパー関数を使用してください
 */
export const APP_Z_INDEX = {
  HEADER: LAYER_Z_INDEX.HEADER,
  MOBILE_BOTTOM_NAV: LAYER_Z_INDEX.MOBILE_BOTTOM_NAV,
  FLOATING_PROGRESS_SUMMARY: LAYER_Z_INDEX.FLOATING_SUMMARY,
  SIDEBAR: LAYER_Z_INDEX.SIDEBAR,
} as const;

/**
 * レイヤー名の型
 */
type Layer = keyof typeof LAYER_Z_INDEX;

/**
 * 要素オフセット名の型
 */
type ElementOffsetKey = keyof typeof ELEMENT_OFFSET;

/**
 * 型付きzIndexヘルパー関数
 *
 * レイヤーと要素オフセットを組み合わせてzIndex値を計算します。
 * タイプセーフで、補完が効きます。
 *
 * @param layer - レイヤー名
 * @param offset - 要素オフセット名（オプション）
 * @returns 計算されたzIndex値
 *
 * @example
 * ```tsx
 * // レイヤーのみ指定
 * <Dialog sx={{ zIndex: zIndex('PAGE_MODAL') }}>  // 1000
 *
 * // レイヤー + 要素オフセット
 * <IconButton sx={{ zIndex: zIndex('PAGE_MODAL', 'CLOSE_BUTTON') }}>  // 1001
 *
 * // Drawer内のSelect
 * <Select MenuProps={{ sx: { zIndex: zIndex('NESTED_DIALOG', 'SELECT_MENU') } }} />  // 1600
 * ```
 */
export const zIndex = (layer: Layer, offset?: ElementOffsetKey): number => {
  return LAYER_Z_INDEX[layer] + (offset ? ELEMENT_OFFSET[offset] : 0);
};

/**
 * MUI Theme用のzIndexカスタマイズ
 *
 * createTheme()のzIndexオプションとして使用します。
 *
 * @example
 * ```tsx
 * import { createTheme } from '@mui/material/styles';
 * import { muiThemeZIndex } from '@/constants/zIndex';
 *
 * const theme = createTheme({
 *   zIndex: muiThemeZIndex,
 * });
 * ```
 */
export const muiThemeZIndex = {
  mobileStepper: LAYER_Z_INDEX.PAGE_CONTENT + 50,  // 50
  fab: LAYER_Z_INDEX.FLOATING_SUMMARY,  // 150
  speedDial: LAYER_Z_INDEX.FLOATING_SUMMARY + 50,  // 200
  appBar: LAYER_Z_INDEX.HEADER,  // 100
  drawer: LAYER_Z_INDEX.SIDEBAR,  // 200
  modal: LAYER_Z_INDEX.PAGE_MODAL,  // 1000
  snackbar: LAYER_Z_INDEX.SNACKBAR,  // 3000
  tooltip: LAYER_Z_INDEX.PAGE_MODAL + ELEMENT_OFFSET.POPOVER,  // 1050
};

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
 *  200番台: サイドバー、speedDial
 *  150番台: フローティング進捗サマリー、FAB
 *  100番台: ヘッダー、ボトムナビ
 *   50番台: mobileStepper
 *    0番台: ページコンテンツ
 */
