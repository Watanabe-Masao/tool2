import { useMemo } from 'react';
import { useAllocationBatches, type UseAllocationBatchesReturn } from './useAllocationBatches';
import { useAllocationFilters, type UseAllocationFiltersReturn } from './useAllocationFilters';
import { useAllocationModals, type UseAllocationModalsReturn } from './useAllocationModals';
import { useAllocationView, type UseAllocationViewReturn } from './useAllocationView';
import { useAllocationTableData, type UseAllocationTableDataReturn } from './useAllocationTableData';

/**
 * useAllocationHistory のパラメータ
 */
export interface UseAllocationHistoryParams {
  /** ユーザーID */
  userId: string | undefined;
}

/**
 * useAllocationHistory の戻り値型
 */
export interface UseAllocationHistoryReturn {
  /** データ取得・バッチ管理 */
  batches: UseAllocationBatchesReturn;
  /** フィルタリング・ソート管理 */
  filters: UseAllocationFiltersReturn;
  /** モーダル・ドロワー管理 */
  modals: UseAllocationModalsReturn;
  /** ビュー・UI状態管理 */
  view: UseAllocationViewReturn;
  /** テーブルデータ生成 */
  tableData: UseAllocationTableDataReturn;
}

/**
 * 配分履歴統合フック
 *
 * 配分履歴機能で使用するすべてのカスタムフックを統合し、
 * 自動的に接続して返します。
 *
 * **目的:**
 * - 5つのhooksの手動接続を不要にする
 * - ページコンポーネントの複雑性を削減
 * - hooks間の依存関係を隠蔽
 *
 * **使用方法:**
 * ```tsx
 * const allocationHistory = useAllocationHistory({ userId });
 *
 * // 個別のhooksにアクセス
 * allocationHistory.batches.fetchHistory();
 * allocationHistory.filters.setGroupMode('product');
 * allocationHistory.modals.deleteDialog.openDialog(batch);
 * allocationHistory.view.toggleFullScreen();
 * const rows = allocationHistory.tableData.rows;
 * ```
 *
 * **最適化:**
 * - useMemoによる不要な再計算の防止
 * - 各hookは独立してメモ化されている
 *
 * @param params - パラメータ
 * @returns 統合された配分履歴管理オブジェクト
 *
 * @example
 * ```tsx
 * // AllocationHistoryPage.tsx
 * const AllocationHistoryPage = () => {
 *   const { user } = useAuth();
 *   const allocationHistory = useAllocationHistory({ userId: user?.id });
 *
 *   return (
 *     <AllocationHistoryContainer
 *       batches={allocationHistory.batches}
 *       filters={allocationHistory.filters}
 *       modals={allocationHistory.modals}
 *       view={allocationHistory.view}
 *       tableData={allocationHistory.tableData}
 *     />
 *   );
 * };
 * ```
 */
export const useAllocationHistory = (
  params: UseAllocationHistoryParams
): UseAllocationHistoryReturn => {
  const { userId } = params;

  // 1. データ取得・バッチ管理
  const batches = useAllocationBatches(userId);

  // 2. フィルタリング・ソート管理
  const filters = useAllocationFilters();

  // 3. モーダル・ドロワー管理
  const modals = useAllocationModals();

  // 4. ビュー・UI状態管理
  const view = useAllocationView();

  // 5. テーブルデータ生成（自動接続）
  // Note: paramsオブジェクトは毎レンダー新規作成（useAllocationTableData内でメモ化済み）
  const tableData = useAllocationTableData({
    details: batches.details,
    selectedDateRange: batches.selectedDateRange,
    groupMode: filters.groupMode,
    sortOrder: filters.sortOrder,
    compositeKeyFields: filters.compositeKeyFields,
    filters: filters.filters,
    hiddenColumns: view.hiddenColumns,
    hiddenRowIds: view.hiddenRowIds,
    onHideRow: view.hideRow,
  });

  // 統合オブジェクトを返す（各hookがメモ化済みなので、参照の安定性を保証）
  return useMemo(
    () => ({
      batches,
      filters,
      modals,
      view,
      tableData,
    }),
    [batches, filters, modals, view, tableData]
  );
};

/**
 * ヘルパー型: 統合フックの各部分へのアクセス
 */
export type AllocationHistoryBatches = UseAllocationHistoryReturn['batches'];
export type AllocationHistoryFilters = UseAllocationHistoryReturn['filters'];
export type AllocationHistoryModals = UseAllocationHistoryReturn['modals'];
export type AllocationHistoryView = UseAllocationHistoryReturn['view'];
export type AllocationHistoryTableData = UseAllocationHistoryReturn['tableData'];
