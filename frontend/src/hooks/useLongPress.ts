import { useRef, useState, useCallback } from 'react';

/**
 * 長押し検知オプション
 */
export interface UseLongPressOptions {
  /** 長押し時間（ミリ秒）デフォルト: 500ms */
  duration?: number;
  /** 長押し完了時のコールバック */
  onLongPress?: () => void;
  /** 長押し開始時のコールバック */
  onStart?: () => void;
  /** 長押しキャンセル時のコールバック */
  onCancel?: () => void;
}

/**
 * 長押し検知フックの戻り値
 */
export interface UseLongPressReturn {
  /** 長押し中かどうか */
  isPressing: boolean;
  /** タッチ/マウスダウン開始ハンドラー */
  handleStart: () => void;
  /** タッチ/マウスアップ終了ハンドラー */
  handleEnd: () => void;
  /** 長押しをキャンセル */
  cancel: () => void;
}

/**
 * 長押し検知フック
 *
 * タッチデバイスとマウス両方に対応した長押し検知を提供します。
 * 履歴削除、メニュー表示、ロック切り替えなど様々な用途に使用できます。
 *
 * @param options - オプション設定
 * @returns 長押し状態とハンドラー
 *
 * @example
 * ```tsx
 * // 基本的な使用方法
 * const { isPressing, handleStart, handleEnd } = useLongPress({
 *   duration: 500,
 *   onLongPress: () => console.log('Long pressed!')
 * });
 *
 * <div
 *   onTouchStart={handleStart}
 *   onTouchEnd={handleEnd}
 *   onMouseDown={handleStart}
 *   onMouseUp={handleEnd}
 *   onMouseLeave={handleEnd}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // 履歴削除用の使用方法
 * const { handleStart, handleEnd } = useLongPress({
 *   duration: 500,
 *   onLongPress: () => setDeleteDialog({ open: true, item: selectedItem })
 * });
 * ```
 */
export const useLongPress = ({
  duration = 500,
  onLongPress,
  onStart,
  onCancel,
}: UseLongPressOptions = {}): UseLongPressReturn => {
  const timerRef = useRef<number | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
    onCancel?.();
  }, [onCancel]);

  const handleStart = useCallback(() => {
    setIsPressing(true);
    onStart?.();
    timerRef.current = window.setTimeout(() => {
      onLongPress?.();
      setIsPressing(false);
    }, duration);
  }, [duration, onLongPress, onStart]);

  const handleEnd = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
  }, []);

  return {
    isPressing,
    handleStart,
    handleEnd,
    cancel,
  };
};
