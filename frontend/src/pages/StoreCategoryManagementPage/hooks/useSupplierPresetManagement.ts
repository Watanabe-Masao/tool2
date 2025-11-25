/**
 * 帳合先プリセット管理ロジックフック
 */

import { useState, useCallback, useRef } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { useFirestoreService } from '@/context/ServiceContext';
import type { SupplierPresetEntity } from '@/hooks/useSupplierPresets';
import type { DragState } from '../types';
import { INITIAL_DRAG_STATE } from '../types';

interface UseSupplierPresetManagementProps {
  presets: SupplierPresetEntity[];
  loadPresets: () => Promise<void>;
}

/**
 * 帳合先プリセット管理のロジックを提供するカスタムフック
 */
export const useSupplierPresetManagement = ({
  presets,
  loadPresets,
}: UseSupplierPresetManagementProps) => {
  const { showSuccess, showError } = useNotification();
  const firestoreService = useFirestoreService();

  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  // 長押しドラッグ開始
  const handleLongPressStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent, supplierId: string) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const timer = window.setTimeout(() => {
        // 長押し判定成功 - ドラッグ開始
        setDragState({
          draggingId: supplierId,
          longPressTimer: null,
          startY: clientY,
          currentY: clientY,
          dragOverIndex: null,
          isDragging: true,
        });
      }, 500); // 500ms長押しで掴む

      setDragState({
        draggingId: null,
        longPressTimer: timer,
        startY: clientY,
        currentY: clientY,
        dragOverIndex: null,
        isDragging: false,
      });
    },
    []
  );

  // 長押しドラッグ中の移動
  const handleLongPressMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (dragState.longPressTimer) {
        // 長押し判定前に移動したらキャンセル
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaY = Math.abs(clientY - dragState.startY);

        if (deltaY > 10) {
          window.clearTimeout(dragState.longPressTimer);
          setDragState(INITIAL_DRAG_STATE);
        }
        return;
      }

      if (!dragState.isDragging || !dragState.draggingId) return;

      // ドラッグ中 - Y座標を更新
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // 各アイテムの位置を確認してドラッグオーバーを判定
      let newDragOverIndex: number | null = null;
      presets.forEach((preset, index) => {
        const element = itemRefs.current.get(preset.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          const centerY = rect.top + rect.height / 2;
          if (clientY >= rect.top && clientY <= rect.bottom) {
            newDragOverIndex = clientY < centerY ? index : index;
          }
        }
      });

      setDragState((prev) => ({
        ...prev,
        currentY: clientY,
        dragOverIndex: newDragOverIndex,
      }));
    },
    [dragState.longPressTimer, dragState.isDragging, dragState.draggingId, dragState.startY, presets]
  );

  // 長押しドラッグ終了
  const handleLongPressEnd = useCallback(async () => {
    if (dragState.longPressTimer) {
      window.clearTimeout(dragState.longPressTimer);
      setDragState(INITIAL_DRAG_STATE);
      return;
    }

    if (!dragState.isDragging || !dragState.draggingId) {
      setDragState(INITIAL_DRAG_STATE);
      return;
    }

    // ドロップ処理（Firestoreに並び順を保存）
    const dragIndex = presets.findIndex((p) => p.id === dragState.draggingId);
    const dropIndex = dragState.dragOverIndex;

    if (dragIndex !== -1 && dropIndex !== null && dragIndex !== dropIndex) {
      // 並び替え処理
      const reorderedPresets = [...presets];
      const [removed] = reorderedPresets.splice(dragIndex, 1);
      reorderedPresets.splice(dropIndex, 0, removed);

      // displayOrderを更新してFirestoreに保存
      const updates = reorderedPresets.map((item, index) => ({
        id: item.id,
        displayOrder: index,
      }));

      try {
        await firestoreService.reorderSupplierPresets(updates);
        await loadPresets();
        showSuccess('並び順を更新しました');
      } catch (error) {
        console.error('Failed to reorder presets:', error);
        showError('並び順の更新に失敗しました');
      }
    }

    setDragState(INITIAL_DRAG_STATE);
  }, [dragState, presets, firestoreService, loadPresets, showSuccess, showError]);

  // ドラッグ中のY座標オフセットを取得
  const getDragOffset = useCallback(
    (id: string): number => {
      if (dragState.draggingId !== id || !dragState.isDragging) return 0;
      return dragState.currentY - dragState.startY;
    },
    [dragState]
  );

  // refの登録
  const setItemRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      itemRefs.current.set(id, el);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  // スワイプ状態をリセット（ドラッグ開始時に使用）
  const resetForDrag = useCallback(() => {
    // 外部のスワイプ状態をリセットする際に使用
  }, []);

  return {
    dragState,
    handleLongPressStart,
    handleLongPressMove,
    handleLongPressEnd,
    getDragOffset,
    setItemRef,
    resetForDrag,
  };
};
