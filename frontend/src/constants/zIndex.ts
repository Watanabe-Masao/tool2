/**
 * zIndex定数の中央管理
 *
 * アプリケーション全体のzIndex階層を一箇所で定義し、
 * モーダル・ダイアログ・オーバーレイの重なり順を管理します。
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
 * モーダル階層のzIndex定義
 */
export const MODAL_Z_INDEX = {
  /**
   * ページモーダル（第1階層）
   * 用途: 配分履歴、ユーザープロフィール、店舗管理などのページをモーダル表示
   * MUIのsnackbarと同じレベル
   */
  PAGE_MODAL: 1400,

  /**
   * ページモーダル内のダイアログ（第2階層）
   * 用途: ページモーダル内で開くダイアログ、設定画面、編集フォームなど
   * ページモーダルより100上に設定
   */
  NESTED_DIALOG: 1500,

  /**
   * ネストされたダイアログ内のダイアログ（第3階層）
   * 用途: 削除確認ダイアログ、エラーダイアログなど
   * ネストされたダイアログより100上に設定
   */
  NESTED_NESTED_DIALOG: 1600,

  /**
   * ページモーダルの閉じるボタン（第1階層 + 1）
   * 用途: モーダル内のコンテンツに重ならないように表示
   */
  PAGE_MODAL_CLOSE_BUTTON: 1401,
} as const;

/**
 * その他のzIndex定義
 */
export const APP_Z_INDEX = {
  /**
   * 固定ヘッダー
   * MUIのappBarより上に表示
   */
  HEADER: 1100,

  /**
   * モバイルボトムナビゲーション
   * MUIのappBarと同じレベル
   */
  MOBILE_BOTTOM_NAV: 1100,

  /**
   * フローティング進捗サマリー
   * ヘッダーやボトムナビの上に表示
   */
  FLOATING_PROGRESS_SUMMARY: 1150,
} as const;

/**
 * モーダル階層のヘルパー関数
 */
export const getModalZIndex = {
  /**
   * ページモーダルのzIndexを取得
   * @returns {number} zIndex値
   */
  pageModal: () => MODAL_Z_INDEX.PAGE_MODAL,

  /**
   * ページモーダル内のダイアログのzIndexを取得
   * @returns {number} zIndex値
   */
  nestedDialog: () => MODAL_Z_INDEX.NESTED_DIALOG,

  /**
   * ネストされたダイアログ内のダイアログのzIndexを取得
   * @returns {number} zIndex値
   */
  nestedNestedDialog: () => MODAL_Z_INDEX.NESTED_NESTED_DIALOG,

  /**
   * ページモーダルの閉じるボタンのzIndexを取得
   * @returns {number} zIndex値
   */
  pageModalCloseButton: () => MODAL_Z_INDEX.PAGE_MODAL_CLOSE_BUTTON,
} as const;

/**
 * zIndex使用例:
 *
 * @example ページモーダル
 * ```tsx
 * import { MODAL_Z_INDEX } from '@/constants/zIndex';
 *
 * <Dialog sx={{ zIndex: MODAL_Z_INDEX.PAGE_MODAL }}>
 *   ...
 * </Dialog>
 * ```
 *
 * @example ページモーダル内のダイアログ
 * ```tsx
 * import { MODAL_Z_INDEX } from '@/constants/zIndex';
 *
 * <Dialog sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }}>
 *   ...
 * </Dialog>
 * ```
 *
 * @example 削除確認ダイアログ（ネストされたダイアログ内）
 * ```tsx
 * import { MODAL_Z_INDEX } from '@/constants/zIndex';
 *
 * <Dialog sx={{ zIndex: MODAL_Z_INDEX.NESTED_NESTED_DIALOG }}>
 *   ...
 * </Dialog>
 * ```
 */
