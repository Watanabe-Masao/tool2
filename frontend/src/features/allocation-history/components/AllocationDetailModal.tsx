import { Box, Dialog, DialogContent, Typography, IconButton, CircularProgress } from '@mui/material';
import {
  Close,
  Fullscreen,
  FullscreenExit,
  Settings,
  DateRange,
  Visibility,
  CalendarMonth,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DataGrid } from '@mui/x-data-grid';
import type { AllocationBatch } from '@/types/allocationHistory';
import type {
  AllocationHistoryBatches,
  AllocationHistoryFilters,
  AllocationHistoryView,
  AllocationHistoryTableData,
} from '../hooks';
import { MODAL_Z_INDEX } from '@/utils/constants';
import { StatusBadge, ClickableBox, EmptyState } from '@/components/ui';
import { useMemo } from 'react';

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
 * 配分履歴の詳細モーダル。
 * 単一バッチまたは日付範囲の配分詳細をDataGridで表示します。
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
  const { groupMode, setGroupMode, filters: filterState } = filters;
  const { isFullScreen, toggleFullScreen, hiddenRowIds, showAllRows, hiddenColumns } = view;
  const { rows, columns } = tableData;

  // モーダルが開いているかどうか
  const isOpen = Boolean(selectedBatch) || Boolean(selectedDateRange);

  // タイトル
  const title = selectedDateRange ? '配分履歴' : '配分詳細';

  // フィルター数（useMemoで最適化）
  const filterCount = useMemo(
    () =>
      filterState.productNames.length +
      filterState.origins.length +
      filterState.specifications.length +
      filterState.dates.length,
    [filterState.productNames, filterState.origins, filterState.specifications, filterState.dates]
  );

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
        zIndex: MODAL_Z_INDEX.NESTED_DIALOG,
        '& .MuiDialog-paper': {
          borderRadius: isFullScreen ? 0 : 3,
          overflow: 'hidden',
        },
      }}
    >
      {/* ヘッダー */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1.5, sm: 2 },
          py: 1.25,
          borderBottom: '1px solid',
          borderColor: 'grey.200',
          bgcolor: 'white',
        }}
      >
        {/* 左側: タイトル */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            sx={{
              fontSize: { xs: '0.9rem', sm: '1rem' },
              fontWeight: 700,
              color: 'text.primary',
            }}
          >
            {title}
          </Typography>
          {selectedBatch && (
            <StatusBadge variant="default" size="medium">
              {format(new Date(selectedBatch.deliveryDate), 'M/d(E)', { locale: ja })}
            </StatusBadge>
          )}
          {selectedDateRange && (
            <ClickableBox
              onClick={onDatePickerOpen}
              ariaLabel="日付範囲を変更"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'primary.50',
                '&:hover': { bgcolor: 'primary.100' },
              }}
            >
              <DateRange sx={{ fontSize: 14, color: 'primary.main' }} />
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'primary.main' }}>
                {format(parseISO(selectedDateRange.start), 'M/d', { locale: ja })} -{' '}
                {format(parseISO(selectedDateRange.end), 'M/d', { locale: ja })}
              </Typography>
            </ClickableBox>
          )}
          {details.length > 0 && (
            <StatusBadge variant="default">
              {details.length}品
            </StatusBadge>
          )}
        </Box>

        {/* 右側: コントロール */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          {hiddenRowIds.size > 0 && (
            <ClickableBox
              onClick={showAllRows}
              ariaLabel="非表示の行を再表示"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'warning.50',
                '&:hover': { bgcolor: 'warning.100' },
              }}
            >
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: 'warning.main' }}>
                {hiddenRowIds.size}件非表示
              </Typography>
              <Visibility sx={{ fontSize: 14, color: 'warning.main' }} />
            </ClickableBox>
          )}
          <IconButton
            size="small"
            onClick={toggleFullScreen}
            aria-label={isFullScreen ? 'フルスクリーンを解除' : 'フルスクリーンにする'}
            sx={{ p: 0.5, color: 'grey.500' }}
          >
            {isFullScreen ? <FullscreenExit sx={{ fontSize: 18 }} /> : <Fullscreen sx={{ fontSize: 18 }} />}
          </IconButton>
          {selectedDateRange && (
            <IconButton
              size="small"
              onClick={onSettingsOpen}
              aria-label="詳細設定を開く"
              sx={{
                p: 0.5,
                color: settingsOpen ? 'primary.main' : 'grey.500',
              }}
            >
              <Settings sx={{ fontSize: 18 }} />
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={closeDetails}
            aria-label="閉じる"
            sx={{ p: 0.5, color: 'grey.500' }}
          >
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* グループ化コントロール */}
      {selectedDateRange && !settingsOpen && (
        <Box
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 0.75,
            borderBottom: '1px solid',
            borderColor: 'grey.100',
            background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'grey.600' }}>
              グループ:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {[
                { value: 'date' as const, label: '日付' },
                { value: 'product' as const, label: '商品' },
                { value: 'composite' as const, label: '複合' },
              ].map((option) => (
                <Box
                  key={option.value}
                  onClick={() => setGroupMode(option.value)}
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    bgcolor: groupMode === option.value ? 'primary.main' : 'white',
                    color: groupMode === option.value ? 'white' : 'grey.600',
                    border: '1px solid',
                    borderColor: groupMode === option.value ? 'primary.main' : 'grey.300',
                    '&:hover': {
                      bgcolor: groupMode === option.value ? 'primary.dark' : 'grey.50',
                    },
                  }}
                >
                  {option.label}
                </Box>
              ))}
            </Box>

            {filterCount > 0 && (
              <StatusBadge variant="primary">
                フィルター {filterCount}
              </StatusBadge>
            )}

            {hiddenCount > 0 && (
              <StatusBadge variant="warning">
                非表示 {hiddenCount}
              </StatusBadge>
            )}
          </Box>
        </Box>
      )}

      <DialogContent sx={{ p: 0 }}>
        {detailsLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : details.length === 0 ? (
          <EmptyState
            icon={<CalendarMonth sx={{ fontSize: 24, color: 'grey.400' }} />}
            title="詳細データがありません"
            iconBgColor="grey.100"
          />
        ) : (
          /* データグリッド表示 - モダンスタイル */
          <Box sx={{ height: isFullScreen ? 'calc(100vh - 140px)' : { xs: 400, sm: 500, md: 600 }, width: '100%' }}>
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
                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                },
                '& .MuiDataGrid-cell': {
                  borderColor: 'grey.100',
                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                  padding: { xs: '4px 6px', sm: '8px 12px' },
                  lineHeight: 1.4,
                },
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: 'grey.50',
                  borderBottom: '1px solid',
                  borderColor: 'grey.200',
                  minHeight: { xs: '40px !important', sm: '48px !important' },
                },
                '& .MuiDataGrid-columnHeader': {
                  padding: { xs: '4px 6px', sm: '8px 12px' },
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 700,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.2,
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                  color: 'grey.600',
                },
                '& .MuiDataGrid-row': {
                  minHeight: { xs: '36px !important', sm: '44px !important' },
                  transition: 'background-color 0.15s ease',
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
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                  },
                },
                // 総合計行のスタイル - モダン
                '& .row-grandtotal': {
                  background: 'linear-gradient(to right, #6366f1, #8b5cf6) !important',
                  '& .MuiDataGrid-cell': {
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: { xs: '0.75rem', sm: '0.85rem' },
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
