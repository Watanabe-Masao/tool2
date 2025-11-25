/**
 * スワイプジェスチャー管理フック
 */

import { useState, useCallback } from 'react';
import type { SwipeState } from '../types';
import { INITIAL_SWIPE_STATE } from '../types';

interface UseSwipeGestureOptions {
  /** スワイプ判定の閾値（px） */
  threshold?: number;
  /** 縦方向の移動でキャンセルする閾値（px） */
  verticalCancelThreshold?: number;
  /** 左スワイプ時のコールバック */
  onSwipeLeft?: (id: string) => void;
  /** 右スワイプ時のコールバック */
  onSwipeRight?: (id: string) => void;
}

/**
 * スワイプジェスチャーを管理するカスタムフック
 */
export const useSwipeGesture = (options: UseSwipeGestureOptions = {}) => {
  const {
    threshold = 120,
    verticalCancelThreshold = 20,
    onSwipeLeft,
    onSwipeRight,
  } = options;

  const [swipeState, setSwipeState] = useState<SwipeState>(INITIAL_SWIPE_STATE);

  const handleSwipeStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent, id: string) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setSwipeState({
        id,
        startX: clientX,
        startY: clientY,
        currentX: clientX,
        currentY: clientY,
        isSwiping: false,
      });
    },
    []
  );

  const handleSwipeMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!swipeState.id) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - swipeState.startX;
      const deltaY = clientY - swipeState.startY;

      // 縦方向の移動が大きい場合はキャンセル
      if (Math.abs(deltaY) > verticalCancelThreshold) {
        setSwipeState(INITIAL_SWIPE_STATE);
        return;
      }

      // 横方向の移動が検出された場合
      if (Math.abs(deltaX) > 5) {
        setSwipeState((prev) => ({
          ...prev,
          currentX: clientX,
          currentY: clientY,
          isSwiping: true,
        }));
      }
    },
    [swipeState.id, swipeState.startX, swipeState.startY, verticalCancelThreshold]
  );

  const handleSwipeEnd = useCallback(
    (id: string) => {
      if (!swipeState.id || swipeState.id !== id) return;

      const deltaX = swipeState.currentX - swipeState.startX;

      // 左スワイプ
      if (deltaX < -threshold && onSwipeLeft) {
        onSwipeLeft(id);
      }

      // 右スワイプ
      if (deltaX > threshold && onSwipeRight) {
        onSwipeRight(id);
      }

      setSwipeState(INITIAL_SWIPE_STATE);
    },
    [swipeState, threshold, onSwipeLeft, onSwipeRight]
  );

  const resetSwipe = useCallback(() => {
    setSwipeState(INITIAL_SWIPE_STATE);
  }, []);

  const getSwipeOffset = useCallback(
    (id: string): number => {
      if (swipeState.id !== id || !swipeState.isSwiping) return 0;
      return swipeState.currentX - swipeState.startX;
    },
    [swipeState]
  );

  return {
    swipeState,
    handleSwipeStart,
    handleSwipeMove,
    handleSwipeEnd,
    resetSwipe,
    getSwipeOffset,
  };
};
