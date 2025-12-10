import { useState, useCallback, useMemo } from 'react';

/**
 * ViewMode type
 */
export type ViewMode = 'table' | 'calendar';

/**
 * 配分履歴ビュー管理フック
 *
 * 表示モード、フルスクリーン、列表示/非表示、行表示/非表示などのUI状態を管理します。
 *
 * @returns ビュー状態と操作関数
 *
 * @example
 * ```tsx
 * const { viewMode, isFullScreen, hiddenColumns, setViewMode, toggleFullScreen } =
 *   useAllocationView();
 * ```
 */
export const useAllocationView = () => {
  // 表示モード
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  // フルスクリーンモード
  const [isFullScreen, setIsFullScreen] = useState(false);

  // 列の表示/非表示
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // 行の表示/非表示
  const [hiddenRowIds, setHiddenRowIds] = useState<Set<string>>(new Set());

  /**
   * 表示モードを切り替え
   */
  const switchViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  /**
   * 表示モードをトグル
   */
  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'calendar' ? 'table' : 'calendar'));
  }, []);

  /**
   * フルスクリーンモードをトグル
   */
  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => !prev);
  }, []);

  /**
   * フルスクリーンモードを設定
   */
  const setFullScreen = useCallback((enabled: boolean) => {
    setIsFullScreen(enabled);
  }, []);

  /**
   * 列の表示/非表示を切り替え
   */
  const toggleColumn = useCallback((columnId: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  /**
   * 列を表示
   */
  const showColumn = useCallback((columnId: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      next.delete(columnId);
      return next;
    });
  }, []);

  /**
   * 列を非表示
   */
  const hideColumn = useCallback((columnId: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      next.add(columnId);
      return next;
    });
  }, []);

  /**
   * すべての列を表示
   */
  const showAllColumns = useCallback(() => {
    setHiddenColumns(new Set());
  }, []);

  /**
   * 行の表示/非表示を切り替え
   */
  const toggleRow = useCallback((rowId: string) => {
    setHiddenRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  /**
   * 行を表示
   */
  const showRow = useCallback((rowId: string) => {
    setHiddenRowIds((prev) => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  }, []);

  /**
   * 行を非表示
   */
  const hideRow = useCallback((rowId: string) => {
    setHiddenRowIds((prev) => {
      const next = new Set(prev);
      next.add(rowId);
      return next;
    });
  }, []);

  /**
   * すべての行を表示
   */
  const showAllRows = useCallback(() => {
    setHiddenRowIds(new Set());
  }, []);

  /**
   * 列が表示されているかどうか
   */
  const isColumnVisible = useCallback(
    (columnId: string) => {
      return !hiddenColumns.has(columnId);
    },
    [hiddenColumns]
  );

  /**
   * 行が表示されているかどうか
   */
  const isRowVisible = useCallback(
    (rowId: string) => {
      return !hiddenRowIds.has(rowId);
    },
    [hiddenRowIds]
  );

  // 戻り値をメモ化して無限ループを防止
  return useMemo(
    () => ({
      // 状態
      viewMode,
      isFullScreen,
      hiddenColumns,
      hiddenRowIds,

      // 表示モード操作
      setViewMode: switchViewMode,
      toggleViewMode,

      // フルスクリーン操作
      setFullScreen,
      toggleFullScreen,

      // 列操作
      toggleColumn,
      showColumn,
      hideColumn,
      showAllColumns,
      isColumnVisible,

      // 行操作
      toggleRow,
      showRow,
      hideRow,
      showAllRows,
      isRowVisible,
    }),
    [
      viewMode,
      isFullScreen,
      hiddenColumns,
      hiddenRowIds,
      switchViewMode,
      toggleViewMode,
      setFullScreen,
      toggleFullScreen,
      toggleColumn,
      showColumn,
      hideColumn,
      showAllColumns,
      isColumnVisible,
      toggleRow,
      showRow,
      hideRow,
      showAllRows,
      isRowVisible,
    ]
  );
};

/**
 * useAllocationView の戻り値型
 */
export type UseAllocationViewReturn = ReturnType<typeof useAllocationView>;
