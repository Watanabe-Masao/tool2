import React, { useMemo, useCallback, useState } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Drawer,
  Stack,
  Typography,
  IconButton,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
} from '@mui/material';
import { CalendarMonth, Close } from '@mui/icons-material';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { GlassCalendar, type SupplierPreset } from '@/components/calendar/GlassCalendar';
import { useAuthContext } from '@/context/AuthContext';
import { useSupplierPresets } from '@/hooks/useSupplierPresets';
import { EmptyState } from '@/components/ui';

// Feature モジュールからインポート
import { useAllocationHistory } from '@/features/allocation-history';
import {
  AllocationDetailModal,
  AllocationDeleteDialog,
  AllocationSettingsDrawer,
  AllocationHistoryTable,
  AllocationHistoryToolbar,
  type WeekBatchGroup,
} from '@/features/allocation-history/components';

/**
 * 配分履歴一覧ページ（リファクタリング版）
 *
 * 過去の配分履歴を一覧表示し、詳細を確認できます。
 *
 * **最適化内容:**
 * - useAllocationHistory 統合フックを使用（2,479行 → ~350行）
 * - Feature-Sliced Design に準拠したコンポーネント分割
 * - 責務の分離（データ取得/フィルター/UI状態/テーブルデータ）
 */
export const AllocationHistoryPage: React.FC = () => {
  const { user } = useAuthContext();
  const { presets: supplierPresets } = useSupplierPresets();

  // 統合フックを使用（すべてのstate/actionを一元管理）
  const allocationHistory = useAllocationHistory({ userId: user?.uid });
  const { batches, filters, modals, view, tableData } = allocationHistory;

  // 日付範囲ピッカーのローカル状態
  const [tempDateRange, setTempDateRange] = useState<{ start: string; end: string } | null>(null);

  // GlassCalendar用の帳合先プリセット変換
  const calendarSupplierPresets: SupplierPreset[] = useMemo(() => {
    return supplierPresets.map((preset) => ({
      supplier: preset.supplier,
      displayOrder: preset.displayOrder,
    }));
  }, [supplierPresets]);

  // 週ごとにバッチをグループ化（テーブル表示用）
  const sortedWeeks: WeekBatchGroup[] = useMemo(() => {
    const weekMap = new Map<string, WeekBatchGroup>();

    batches.batches.forEach((batch) => {
      const deliveryDate = new Date(batch.deliveryDate);
      const weekStart = startOfWeek(deliveryDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(deliveryDate, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          weekStart,
          weekEnd,
          batches: [],
        });
      }
      weekMap.get(weekKey)!.batches.push(batch);
    });

    // 各週内のバッチを日付順にソート
    weekMap.forEach((week) => {
      week.batches.sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
    });

    // 週を降順にソート（最新の週が上）
    return Array.from(weekMap.values()).sort(
      (a, b) => b.weekStart.getTime() - a.weekStart.getTime()
    );
  }, [batches.batches]);

  // カレンダーのイベントクリック
  const handleEventClick = useCallback(
    (event: { data?: unknown }) => {
      const batchData = event.data as typeof batches.batches[number] | undefined;
      if (batchData) {
        batches.fetchBatchDetails(batchData);
      }
    },
    [batches.fetchBatchDetails]
  );

  // カレンダーの日付範囲選択
  const handleDateRangeSelect = useCallback(
    (start: Date, end: Date) => {
      batches.fetchDateRangeDetails(start, end);
    },
    [batches.fetchDateRangeDetails]
  );

  // カレンダーの日付選択変更（プレビュー用）
  const handleSelectedDatesChange = useCallback(
    (dates: string[]) => {
      batches.fetchPreviewProducts(dates);
    },
    [batches.fetchPreviewProducts]
  );

  // 削除処理
  const handleDelete = useCallback(async () => {
    const batchToDelete = modals.deleteDialog.batch;
    if (!batchToDelete?.id) return;

    const success = await batches.deleteBatch(batchToDelete.id);
    if (success) {
      modals.deleteDialog.closeDialog();
    }
  }, [batches.deleteBatch, modals.deleteDialog.batch, modals.deleteDialog.closeDialog]);

  // 日付範囲ピッカーで適用
  const handleDateRangeApply = useCallback(() => {
    if (tempDateRange) {
      handleDateRangeSelect(
        parseISO(tempDateRange.start),
        parseISO(tempDateRange.end)
      );
      modals.datePicker.closePicker();
      setTempDateRange(null);
    }
  }, [tempDateRange, handleDateRangeSelect, modals.datePicker.closePicker]);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* ヘッダー（テーブル表示時のみ） */}
      {view.viewMode === 'table' && (
        <AllocationHistoryToolbar
          batchCount={batches.batches.length}
          loading={batches.loading}
          onRefresh={batches.fetchHistory}
          onViewModeChange={() => view.setViewMode('calendar')}
        />
      )}

      {/* エラー表示 */}
      {batches.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={batches.clearError}>
          {batches.error}
        </Alert>
      )}

      {/* メインコンテンツ */}
      {batches.loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : batches.batches.length === 0 ? (
        <EmptyState
          icon={<CalendarMonth sx={{ fontSize: 24, color: 'grey.400' }} />}
          title="配分履歴がありません"
          description="配分表を生成して「履歴を保存」すると、ここに表示されます"
        />
      ) : view.viewMode === 'calendar' ? (
        /* カレンダー表示 */
        <GlassCalendar
          events={batches.calendarEvents}
          onSelectedDatesChange={handleSelectedDatesChange}
          onEventClick={handleEventClick}
          onDateRangeSelect={handleDateRangeSelect}
          viewMode={view.viewMode}
          onViewModeChange={(mode) => view.setViewMode(mode)}
          onRefresh={batches.fetchHistory}
          loading={batches.loading}
          supplierPresets={calendarSupplierPresets}
          previewProducts={batches.previewProducts}
          previewLoading={batches.previewLoading}
        />
      ) : (
        /* テーブル表示 */
        <AllocationHistoryTable
          weeks={sortedWeeks}
          supplierPresets={calendarSupplierPresets}
          onViewDetails={batches.fetchBatchDetails}
          onDelete={modals.deleteDialog.openDialog}
        />
      )}

      {/* 詳細モーダル */}
      <AllocationDetailModal
        batches={batches}
        filters={filters}
        view={view}
        tableData={tableData}
        settingsOpen={modals.settings.open}
        onSettingsOpen={modals.settings.openDrawer}
        onDatePickerOpen={modals.datePicker.openPicker}
      />

      {/* 削除確認ダイアログ */}
      <AllocationDeleteDialog
        open={modals.deleteDialog.open}
        batch={modals.deleteDialog.batch}
        deleting={batches.deleting}
        onClose={modals.deleteDialog.closeDialog}
        onDelete={handleDelete}
      />

      {/* 設定ドロワー */}
      <AllocationSettingsDrawer
        open={modals.settings.open}
        onClose={modals.settings.closeDrawer}
        filters={filters}
        view={view}
        tableData={tableData}
      />

      {/* 日付範囲選択ドロワー */}
      <Drawer
        anchor="bottom"
        open={modals.datePicker.open}
        onClose={modals.datePicker.closePicker}
        PaperProps={{
          sx: {
            borderRadius: '16px 16px 0 0',
            maxHeight: '80vh',
            overflow: 'auto',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* ヘッダー */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>期間選択</Typography>
            <IconButton size="small" onClick={modals.datePicker.closePicker}>
              <Close />
            </IconButton>
          </Stack>

          {/* 利用可能な日付リスト */}
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            日付を選択（複数選択可）
          </Typography>

          <FormGroup sx={{ maxHeight: '50vh', overflow: 'auto' }}>
            {batches.batches
              .map(b => b.deliveryDate)
              .filter((date, index, self) => self.indexOf(date) === index)
              .sort()
              .map((date) => {
                const isInRange = tempDateRange &&
                  date >= tempDateRange.start &&
                  date <= tempDateRange.end;
                const isEdge = tempDateRange &&
                  (date === tempDateRange.start || date === tempDateRange.end);

                return (
                  <FormControlLabel
                    key={date}
                    control={
                      <Checkbox
                        checked={!!isInRange}
                        indeterminate={!!(isInRange && !isEdge)}
                        onChange={() => {
                          if (!tempDateRange) {
                            setTempDateRange({ start: date, end: date });
                          } else {
                            const currentStart = tempDateRange.start;
                            const currentEnd = tempDateRange.end;

                            if (date < currentStart) {
                              setTempDateRange({ start: date, end: currentEnd });
                            } else if (date > currentEnd) {
                              setTempDateRange({ start: currentStart, end: date });
                            } else if (date === currentStart && currentStart === currentEnd) {
                              setTempDateRange(null);
                            } else {
                              setTempDateRange({ start: date, end: date });
                            }
                          }
                        }}
                      />
                    }
                    label={format(parseISO(date), 'yyyy年M月d日(E)', { locale: ja })}
                    sx={{
                      backgroundColor: isEdge ? 'primary.50' : isInRange ? 'action.hover' : 'transparent',
                      borderRadius: 1,
                      mx: -1,
                      px: 1,
                    }}
                  />
                );
              })}
          </FormGroup>

          {/* 選択された範囲の表示 */}
          {tempDateRange && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'primary.50', borderRadius: 1 }}>
              <Typography variant="body2" color="primary.main">
                選択範囲: {format(parseISO(tempDateRange.start), 'M月d日(E)', { locale: ja })}
                {tempDateRange.start !== tempDateRange.end && (
                  <> 〜 {format(parseISO(tempDateRange.end), 'M月d日(E)', { locale: ja })}</>
                )}
              </Typography>
            </Box>
          )}

          {/* 適用ボタン */}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              onClick={() => {
                setTempDateRange(null);
                modals.datePicker.closePicker();
              }}
            >
              キャンセル
            </Button>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              disabled={!tempDateRange}
              onClick={handleDateRangeApply}
            >
              適用
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </Box>
  );
};
