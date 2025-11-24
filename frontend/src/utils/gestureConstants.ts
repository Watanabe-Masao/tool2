/**
 * ジェスチャー操作の定数
 *
 * アプリケーション全体で統一されたジェスチャー閾値を定義します。
 * これにより、一貫したユーザー体験を提供します。
 */

export const GESTURE_THRESHOLDS = {
  /** スワイプ判定距離（ピクセル） */
  SWIPE_DISTANCE: 60,

  /** 長押し判定時間（ミリ秒） */
  LONG_PRESS_DURATION: 500,

  /** 垂直方向の許容範囲（ピクセル） - 横スワイプ時 */
  VERTICAL_TOLERANCE: 20,

  /** ドラッグ開始判定距離（ピクセル） */
  DRAG_ACTIVATION: 10,

  /** タッチ移動の最小検出距離（ピクセル） */
  TOUCH_MOVE_THRESHOLD: 5,
} as const;

/**
 * タッチターゲットサイズ（Appleガイドライン準拠）
 */
export const TOUCH_TARGET_SIZE = {
  /** 最小タッチターゲットサイズ（ピクセル） */
  MIN: 44,

  /** 推奨タッチターゲットサイズ（ピクセル） - タッチデバイス */
  RECOMMENDED: 48,
} as const;

/**
 * アニメーション定数
 */
export const ANIMATION = {
  /** 標準的なトランジション時間（ミリ秒） */
  DURATION_STANDARD: 200,

  /** 短いトランジション時間（ミリ秒） */
  DURATION_SHORT: 150,

  /** 長いトランジション時間（ミリ秒） */
  DURATION_LONG: 300,

  /** イージング関数 */
  EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;
