import { useRef, useState, useCallback } from 'react';

interface UseLongPressOptions {
  /** 長押し時間（ミリ秒） */
  duration?: number;
  /** 長押し完了時のコールバック */
  onLongPress?: () => void;
}

interface UseLongPressReturn {
  /** 長押し中かどうか */
  isPressing: boolean;
  /** タッチ/マウスダウン開始ハンドラー */
  handleStart: () => void;
  /** タッチ/マウスアップ終了ハンドラー */
  handleEnd: () => void;
}

/**
 * 長押し検知フック
 *
 * タッチデバイスとマウス両方に対応した長押し検知を提供します。
 *
 * @param options - オプション設定
 * @returns 長押し状態とハンドラー
 *
 * @example
 * ```tsx
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
 */
export const useLongPress = ({
  duration = 500,
  onLongPress,
}: UseLongPressOptions = {}): UseLongPressReturn => {
  const timerRef = useRef<number | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  const handleStart = useCallback(() => {
    setIsPressing(true);
    timerRef.current = window.setTimeout(() => {
      onLongPress?.();
      setIsPressing(false);
    }, duration);
  }, [duration, onLongPress]);

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
  };
};
