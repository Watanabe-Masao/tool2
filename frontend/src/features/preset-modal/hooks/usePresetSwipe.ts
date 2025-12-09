import { useState, useCallback } from 'react';
import type { ProductHistoryItem } from '@/hooks/useProductHistory';
import type { SwipeState } from '../components/SortablePresetItem';

/**
 * スワイプアクションの結果
 */
export interface SwipeAction {
  type: 'delete' | 'pin' | 'unpin' | 'none';
  preset: ProductHistoryItem | null;
}

/**
 * usePresetSwipeのパラメータ
 */
export interface UsePresetSwipeParams {
  /** スワイプ判定の閾値（ピクセル） */
  threshold?: number;
}

/**
 * usePresetSwipeの戻り値
 */
export interface UsePresetSwipeReturn {
  /** 現在のスワイプ状態 */
  swipeState: SwipeState;
  /** スワイプ開始ハンドラー */
  handleSwipeStart: (e: React.TouchEvent | React.MouseEvent, presetId: string) => void;
  /** スワイプ中ハンドラー */
  handleSwipeMove: (e: React.TouchEvent | React.MouseEvent) => void;
  /** スワイプ終了ハンドラー（アクションを返す） */
  handleSwipeEnd: (preset: ProductHistoryItem) => SwipeAction;
  /** スワイプ状態をリセット */
  resetSwipeState: () => void;
}

const initialSwipeState: SwipeState = {
  id: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  isSwiping: false,
};

/**
 * プリセットスワイプ処理フック
 *
 * 左右スワイプによる削除・ピン留め機能を提供します。
 */
export const usePresetSwipe = ({
  threshold = 60,
}: UsePresetSwipeParams = {}): UsePresetSwipeReturn => {
  const [swipeState, setSwipeState] = useState<SwipeState>(initialSwipeState);

  /**
   * スワイプ開始
   */
  const handleSwipeStart = useCallback((e: React.TouchEvent | React.MouseEvent, presetId: string) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setSwipeState({
      id: presetId,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      isSwiping: false,
    });
  }, []);

  /**
   * スワイプ中（左右のみ、上下は固定）
   */
  const handleSwipeMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!swipeState.id) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - swipeState.startX;
    const deltaY = clientY - swipeState.startY;

    // 上下の動きが大きい場合（20px以上）はスワイプをキャンセル
    if (Math.abs(deltaY) > 20) {
      setSwipeState(initialSwipeState);
      return;
    }

    // 左右に5px以上動いたらスワイプとみなす
    if (Math.abs(deltaX) > 5) {
      setSwipeState((prev) => ({
        ...prev,
        currentX: clientX,
        currentY: clientY,
        isSwiping: true,
      }));
    }
  }, [swipeState.id, swipeState.startX, swipeState.startY]);

  /**
   * スワイプ終了（アクションを返す）
   */
  const handleSwipeEnd = useCallback((preset: ProductHistoryItem): SwipeAction => {
    if (!swipeState.id || swipeState.id !== preset.id) {
      return { type: 'none', preset: null };
    }

    const deltaX = swipeState.currentX - swipeState.startX;
    let action: SwipeAction = { type: 'none', preset: null };

    // 左スワイプ（削除）
    if (deltaX < -threshold) {
      action = { type: 'delete', preset };
    }

    // 右スワイプ（ピン留め/ピン留め解除）
    if (deltaX > threshold) {
      action = {
        type: preset.pinned ? 'unpin' : 'pin',
        preset,
      };
    }

    // スワイプ状態をリセット
    setSwipeState(initialSwipeState);

    return action;
  }, [swipeState.id, swipeState.currentX, swipeState.startX, threshold]);

  /**
   * スワイプ状態をリセット
   */
  const resetSwipeState = useCallback(() => {
    setSwipeState(initialSwipeState);
  }, []);

  return {
    swipeState,
    handleSwipeStart,
    handleSwipeMove,
    handleSwipeEnd,
    resetSwipeState,
  };
};
