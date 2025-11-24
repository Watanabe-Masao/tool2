/**
 * ハプティックフィードバック（触覚フィードバック）ユーティリティ
 *
 * モバイルデバイスでの操作に対して触覚フィードバックを提供します。
 * Vibration APIをラップし、クロスブラウザ対応と安全な実行を保証します。
 */

/**
 * ハプティックフィードバックのタイプ
 */
export type HapticType =
  | 'light'      // 軽いタップ（選択、切り替え）
  | 'medium'     // 中程度の振動（ボタン押下）
  | 'heavy'      // 強い振動（重要な操作、エラー）
  | 'success'    // 成功通知
  | 'warning'    // 警告通知
  | 'error';     // エラー通知

/**
 * 振動パターンの定義（ミリ秒）
 */
const VIBRATION_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,                      // 10ms の短い振動
  medium: 20,                     // 20ms の振動
  heavy: 30,                      // 30ms の強い振動
  success: [10, 50, 10],          // 短-長-短パターン
  warning: [20, 100, 20],         // 中-長-中パターン
  error: [50, 100, 50, 100, 50],  // 長いパターン（注意喚起）
};

/**
 * Vibration APIが利用可能かチェック
 */
const isVibrationSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

/**
 * ハプティックフィードバックを実行
 *
 * @param type - フィードバックのタイプ
 * @returns 振動が実行されたかどうか
 *
 * @example
 * ```tsx
 * import { haptic } from '@/utils/hapticFeedback';
 *
 * // ボタン押下時
 * <Button onClick={() => {
 *   haptic('medium');
 *   handleClick();
 * }}>
 *   クリック
 * </Button>
 *
 * // 成功時
 * haptic('success');
 *
 * // エラー時
 * haptic('error');
 * ```
 */
export const haptic = (type: HapticType = 'light'): boolean => {
  if (!isVibrationSupported()) {
    return false;
  }

  try {
    const pattern = VIBRATION_PATTERNS[type];
    navigator.vibrate(pattern);
    return true;
  } catch (error) {
    console.warn('Haptic feedback failed:', error);
    return false;
  }
};

/**
 * カスタム振動パターンを実行
 *
 * @param pattern - 振動パターン（ミリ秒の配列）
 * @returns 振動が実行されたかどうか
 *
 * @example
 * ```tsx
 * // カスタムパターン: 短-長-短-長
 * hapticPattern([50, 100, 50, 100]);
 * ```
 */
export const hapticPattern = (pattern: number | number[]): boolean => {
  if (!isVibrationSupported()) {
    return false;
  }

  try {
    navigator.vibrate(pattern);
    return true;
  } catch (error) {
    console.warn('Haptic pattern failed:', error);
    return false;
  }
};

/**
 * 振動を停止
 *
 * @returns 停止が成功したかどうか
 */
export const hapticStop = (): boolean => {
  if (!isVibrationSupported()) {
    return false;
  }

  try {
    navigator.vibrate(0);
    return true;
  } catch (error) {
    console.warn('Haptic stop failed:', error);
    return false;
  }
};

/**
 * ハプティックフィードバック付きのクリックハンドラーを作成
 *
 * @param handler - 元のクリックハンドラー
 * @param hapticType - フィードバックのタイプ（デフォルト: 'medium'）
 * @returns ハプティックフィードバック付きのハンドラー
 *
 * @example
 * ```tsx
 * const handleClick = withHaptic(() => {
 *   console.log('Clicked!');
 * }, 'light');
 *
 * <Button onClick={handleClick}>クリック</Button>
 * ```
 */
export const withHaptic = <T extends (...args: any[]) => any>(
  handler: T,
  hapticType: HapticType = 'medium'
): T => {
  return ((...args: any[]) => {
    haptic(hapticType);
    return handler(...args);
  }) as T;
};

/**
 * ハプティックフィードバックのフック
 */
export const useHaptic = () => {
  return {
    haptic,
    hapticPattern,
    hapticStop,
    withHaptic,
    isSupported: isVibrationSupported(),
  };
};
