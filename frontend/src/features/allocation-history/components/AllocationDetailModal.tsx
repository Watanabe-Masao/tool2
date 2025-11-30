import { Box, Dialog, DialogContent, CircularProgress } from '@mui/material';
import { CalendarMonth } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type {
  AllocationHistoryBatches,
  AllocationHistoryFilters,
  AllocationHistoryView,
  AllocationHistoryTableData,
} from '../hooks';
import { useFilterCount } from '../hooks';
import { EmptyState } from '@/components/ui';
import { useMemo } from 'react';
import { AllocationDetailModalHeader } from './AllocationDetailModalHeader';
import { GroupModeSelector } from './GroupModeSelector';
import {
  FONT_SIZE,
  ICON_SIZE,
  PADDING,
  MIN_HEIGHT,
  LINE_HEIGHT,
  TRANSITION,
  HEIGHT,
} from '../styles';

/**
 * AllocationDetailModal Props
 */
export interface AllocationDetailModalProps {
  /** バッチデータ（batches hook） */
  batches: AllocationHistoryBatches;
  /** フィルター状態（filters hook） */
  filters: AllocationHistoryFilters;
  /** ビュー状態（view hook） */
  view: AllocationHistoryView;
  /** テーブルデータ（tableData hook） */
  tableData: AllocationHistoryTableData;
  /** 設定ドロワー開閉状態 */
  settingsOpen: boolean;
  /** 設定ドロワーを開く */
  onSettingsOpen: () => void;
  /** 日付範囲ピッカーを開く */
  onDatePickerOpen: () => void;
}

/**
 * AllocationDetailModal Component
 *
 * 配分履歴の詳細モーダル（Phase B+C+D最適化済み）。
 * 単一バッチまたは日付範囲の配分詳細をDataGridで表示します。
 *
 * **Phase B 最適化:**
 * - AllocationDetailModalHeader コンポーネント抽出（~110行削減）
 * - GroupModeSelector コンポーネント抽出（~60行削減）
 * - 薄いラッパーコンポーネントに（392 → ~170行）
 *
 * **Phase C 最適化:**
 * - useFilterCount フック導入（~10行削減）
 *
 * **Phase D 最適化:**
 * - Style constants 導入（マジックナンバー削減）
 *
 * **機能:**
 * - 単一バッチ詳細表示
 * - 日付範囲詳細表示（グループ化機能付き）
 * - フルスクリーンモード
 * - 行/列の表示/非表示
 * - グループ化モード切替（日付/商品/複合）
 * - フィルター状態表示
 *
 * @example
 * ```tsx
 * <AllocationDetailModal
 *   batches={allocationHistory.batches}
 *   filters={allocationHistory.filters}
 *   view={allocationHistory.view}
 *   tableData={allocationHistory.tableData}
 *   settingsOpen={settingsOpen}
 *   onSettingsOpen={() => setSettingsOpen(true)}
 *   onDatePickerOpen={() => setDatePickerOpen(true)}
 * />
 * ```
 */
export const AllocationDetailModal: React.FC<AllocationDetailModalProps> = ({
  batches,
  filters,
  view,
  tableData,
  settingsOpen,
  onSettingsOpen,
  onDatePickerOpen,
}) => {
  const { selectedBatch, selectedDateRange, details, detailsLoading, closeDetails } = batches;
  const { groupMode, setGroupMode } = filters;
  const { isFullScreen, toggleFullScreen, hiddenRowIds, showAllRows, hiddenColumns } = view;
  const { rows, columns } = tableData;

  // モーダルが開いているかどうか
  const isOpen = Boolean(selectedBatch) || Boolean(selectedDateRange);

  // タイトル
  const title = selectedDateRange ? '配分履歴' : '配分詳細';

  // Phase C: useFilterCount フックを使用してフィルター数を計算
  const filterCount = useFilterCount(filters);

  // 非表示数（useMemoで最適化）
  const hiddenCount = useMemo(
    () => hiddenRowIds.size + hiddenColumns.size,
    [hiddenRowIds.size, hiddenColumns.size]
  );

  return (
    <Dialog
      open={isOpen}
      onClose={closeDetails}
      maxWidth="xl"
      fullWidth
      fullScreen={isFullScreen || window.innerWidth < 600}
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: isFullScreen ? 0 : 3,
          overflow: 'hidden',
        },
      }}
    >
      {/* ヘッダー（抽出済みコンポーネント） */}
      <AllocationDetailModalHeader
        title={title}
        selectedBatch={selectedBatch}
        selectedDateRange={selectedDateRange}
        detailsCount={details.length}
        isFullScreen={isFullScreen}
        hiddenRowsCount={hiddenRowIds.size}
        settingsOpen={settingsOpen}
        onToggleFullScreen={toggleFullScreen}
        onSettingsOpen={onSettingsOpen}
        onDatePickerOpen={onDatePickerOpen}
        onShowAllRows={showAllRows}
        onClose={closeDetails}
      />

      {/* グループ化コントロール（抽出済みコンポーネント） */}
      {selectedDateRange && !settingsOpen && (
        <GroupModeSelector
          groupMode={groupMode}
          onGroupModeChange={setGroupMode}
          filterCount={filterCount}
          hiddenCount={hiddenCount}
        />
      )}

      {/* コンテンツ */}
      <DialogContent sx={{ p: 0 }}>
        {detailsLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : details.length === 0 ? (
          <EmptyState
            icon={<CalendarMonth sx={{ fontSize: ICON_SIZE.XL, color: 'grey.400' }} />}
            title="詳細データがありません"
            iconBgColor="grey.100"
          />
        ) : (
          /* データグリッド表示 - モダンスタイル（Phase D: 定数化） */
          <Box
            sx={{
              height: isFullScreen
                ? HEIGHT.FULLSCREEN_OFFSET
                : { xs: HEIGHT.GRID_MOBILE, sm: HEIGHT.GRID_TABLET, md: HEIGHT.GRID_DESKTOP },
              width: '100%',
            }}
          >
            <DataGrid
              rows={rows.filter((row) => !hiddenRowIds.has(row.id))}
              columns={columns}
              disableRowSelectionOnClick
              disableColumnFilter
              disableColumnSelector
              disableDensitySelector
              hideFooter
              getRowClassName={(params) => {
                const row = params.row as { rowType?: string };
                if (row.rowType === 'grandtotal') return 'row-grandtotal';
                if (row.rowType === 'subtotal') return 'row-subtotal';
                return '';
              }}
              sx={{
                border: 'none',
                '& .MuiDataGrid-main': {
                  fontSize: { xs: FONT_SIZE.SM, sm: FONT_SIZE.BASE },
                },
                '& .MuiDataGrid-cell': {
                  borderColor: 'grey.100',
                  fontSize: { xs: FONT_SIZE.SM, sm: FONT_SIZE.BASE },
                  padding: PADDING.CELL_XS,
                  lineHeight: LINE_HEIGHT.NORMAL,
                },
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: 'grey.50',
                  borderBottom: '1px solid',
                  borderColor: 'grey.200',
                  minHeight: { xs: MIN_HEIGHT.HEADER_XS, sm: MIN_HEIGHT.HEADER_SM },
                },
                '& .MuiDataGrid-columnHeader': {
                  padding: PADDING.CELL_XS,
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 700,
                  whiteSpace: 'pre-wrap',
                  lineHeight: LINE_HEIGHT.COMPACT,
                  fontSize: { xs: FONT_SIZE.XS, sm: FONT_SIZE.MD },
                  color: 'grey.600',
                },
                '& .MuiDataGrid-row': {
                  minHeight: { xs: MIN_HEIGHT.ROW_XS, sm: MIN_HEIGHT.ROW_SM },
                  transition: `background-color ${TRANSITION.FAST}`,
                  '&:hover': {
                    bgcolor: 'rgba(99, 102, 241, 0.04)',
                  },
                },
                '& .MuiDataGrid-virtualScroller': {
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                },
                // 小計行のスタイル - モダン
                '& .row-subtotal': {
                  background: 'linear-gradient(to right, #eff6ff, #dbeafe) !important',
                  '& .MuiDataGrid-cell': {
                    color: '#3b82f6',
                    fontWeight: 600,
                    borderTop: '1px solid #93c5fd',
                    borderBottom: '1px solid #93c5fd',
                    fontSize: { xs: FONT_SIZE.SM, sm: FONT_SIZE.BASE },
                  },
                },
                // 総合計行のスタイル - モダン
                '& .row-grandtotal': {
                  background: 'linear-gradient(to right, #6366f1, #8b5cf6) !important',
                  '& .MuiDataGrid-cell': {
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: { xs: FONT_SIZE.MD, sm: FONT_SIZE.LG },
                    borderTop: 'none',
                    borderBottom: 'none',
                  },
                },
              }}
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
