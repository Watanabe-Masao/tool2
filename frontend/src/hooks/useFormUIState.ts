import { useState } from 'react';

/**
 * useFormUIState
 *
 * フォームのUI状態（商品インデックス、ロック状態、高さ）を管理するカスタムフック
 *
 * 責務:
 * - 現在編集中の商品インデックス管理
 * - 店舗のロック状態管理（商品別）
 * - カテゴリフィルター管理（商品別）
 * - FloatingProgressSummaryの高さ管理
 *
 * @returns UI状態とセッター関数
 *
 * @example
 * ```typescript
 * const {
 *   activeProductIndex,
 *   setActiveProductIndex,
 *   lockedStores,
 *   setLockedStores,
 *   selectedCategories,
 *   setSelectedCategories,
 *   progressSummaryHeight,
 *   setProgressSummaryHeight,
 * } = useFormUIState();
 * ```
 */
export const useFormUIState = () => {
  // 現在編集中の商品インデックス（ステップ2-4で使用）
  const [activeProductIndex, setActiveProductIndex] = useState(0);

  // 店舗のロック状態（商品別、ステップ4とステップ5で共有）
  // Map<商品インデックス, Set<店舗コード>>
  const [lockedStores, setLockedStores] = useState<Map<number, Set<string>>>(new Map());

  // カテゴリフィルター（商品別、ステップ4とステップ5で共有）
  // Map<商品インデックス, Set<カテゴリコード>>
  const [selectedCategories, setSelectedCategories] = useState<Map<number, Set<string>>>(new Map());

  // FloatingProgressSummaryの高さ
  const [progressSummaryHeight, setProgressSummaryHeight] = useState(0);

  return {
    activeProductIndex,
    setActiveProductIndex,
    lockedStores,
    setLockedStores,
    selectedCategories,
    setSelectedCategories,
    progressSummaryHeight,
    setProgressSummaryHeight,
  };
};
