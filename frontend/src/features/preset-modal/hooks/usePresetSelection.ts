import { useState, useCallback } from 'react';
import type { ProductHistoryItem } from '@/hooks/useProductHistory';

/**
 * usePresetSelectionの戻り値
 */
export interface UsePresetSelectionReturn {
  /** 選択されたプリセットIDのセット */
  selectedIds: Set<string>;
  /** 選択されたプリセットの数量マップ */
  quantities: Map<string, number>;
  /** プリセットの選択をトグル */
  toggleSelect: (id: string) => void;
  /** すべて選択/解除 */
  selectAll: (presets: ProductHistoryItem[]) => void;
  /** 選択をクリア */
  clearSelection: () => void;
  /** 数量を変更 */
  setQuantity: (presetId: string, quantity: number) => void;
  /** 選択されたプリセットと数量を取得 */
  getSelectedWithQuantities: (
    presets: ProductHistoryItem[]
  ) => Array<ProductHistoryItem & { totalDelivery?: number }>;
}

/**
 * プリセット複数選択フック
 *
 * 複数選択モードの状態管理を提供します。
 */
export const usePresetSelection = (): UsePresetSelectionReturn => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());

  /**
   * プリセットの選択をトグル
   */
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
        // 選択解除時に数量もクリア
        setQuantities((prevQuantities) => {
          const newQuantities = new Map(prevQuantities);
          newQuantities.delete(id);
          return newQuantities;
        });
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  /**
   * すべて選択/解除
   */
  const selectAll = useCallback((presets: ProductHistoryItem[]) => {
    setSelectedIds((prev) => {
      if (prev.size === presets.length) {
        // すべて選択されている場合は解除
        setQuantities(new Map());
        return new Set();
      } else {
        // すべて選択
        return new Set(presets.map((p) => p.id));
      }
    });
  }, []);

  /**
   * 選択をクリア
   */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setQuantities(new Map());
  }, []);

  /**
   * 数量を変更
   */
  const setQuantity = useCallback((presetId: string, quantity: number) => {
    setQuantities((prev) => {
      const newQuantities = new Map(prev);
      if (quantity > 0) {
        newQuantities.set(presetId, quantity);
      } else {
        newQuantities.delete(presetId);
      }
      return newQuantities;
    });
  }, []);

  /**
   * 選択されたプリセットと数量を取得
   */
  const getSelectedWithQuantities = useCallback(
    (presets: ProductHistoryItem[]): Array<ProductHistoryItem & { totalDelivery?: number }> => {
      return presets
        .filter((p) => selectedIds.has(p.id))
        .map((preset) => ({
          ...preset,
          totalDelivery: quantities.get(preset.id) || 0,
        }));
    },
    [selectedIds, quantities]
  );

  return {
    selectedIds,
    quantities,
    toggleSelect,
    selectAll,
    clearSelection,
    setQuantity,
    getSelectedWithQuantities,
  };
};
