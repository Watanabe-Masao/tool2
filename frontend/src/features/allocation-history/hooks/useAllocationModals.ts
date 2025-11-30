import { useState, useCallback } from 'react';
import type { AllocationBatch } from '@/types/allocationHistory';

/**
 * 配分履歴モーダル・ドロワー管理フック
 *
 * 各種モーダルとドロワーの開閉状態を管理します。
 *
 * @returns モーダル状態と操作関数
 *
 * @example
 * ```tsx
 * const { deleteDialog, settings, datePicker, openDeleteDialog, closeDeleteDialog } =
 *   useAllocationModals();
 * ```
 */
export const useAllocationModals = () => {
  // 削除確認ダイアログ
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<AllocationBatch | null>(null);

  // 設定ドロワー
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 日付範囲ピッカー
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ start: string; end: string } | null>(null);

  /**
   * 削除確認ダイアログを開く
   */
  const openDeleteDialog = useCallback((batch: AllocationBatch) => {
    setBatchToDelete(batch);
    setDeleteDialogOpen(true);
  }, []);

  /**
   * 削除確認ダイアログを閉じる
   */
  const closeDeleteDialog = useCallback(() => {
    setBatchToDelete(null);
    setDeleteDialogOpen(false);
  }, []);

  /**
   * 設定ドロワーを開く
   */
  const openSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  /**
   * 設定ドロワーを閉じる
   */
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  /**
   * 設定ドロワーをトグル
   */
  const toggleSettings = useCallback(() => {
    setSettingsOpen((prev) => !prev);
  }, []);

  /**
   * 日付範囲ピッカーを開く
   */
  const openDatePicker = useCallback(() => {
    setDatePickerOpen(true);
  }, []);

  /**
   * 日付範囲ピッカーを閉じる
   */
  const closeDatePicker = useCallback(() => {
    setDatePickerOpen(false);
    setTempDateRange(null);
  }, []);

  /**
   * 一時的な日付範囲を設定
   */
  const updateTempDateRange = useCallback((range: { start: string; end: string } | null) => {
    setTempDateRange(range);
  }, []);

  /**
   * すべてのモーダルを閉じる
   */
  const closeAllModals = useCallback(() => {
    closeDeleteDialog();
    closeSettings();
    closeDatePicker();
  }, []);

  return {
    // 削除ダイアログ
    deleteDialog: {
      open: deleteDialogOpen,
      batch: batchToDelete,
      openDialog: openDeleteDialog,
      closeDialog: closeDeleteDialog,
    },

    // 設定ドロワー
    settings: {
      open: settingsOpen,
      openDrawer: openSettings,
      closeDrawer: closeSettings,
      toggle: toggleSettings,
    },

    // 日付範囲ピッカー
    datePicker: {
      open: datePickerOpen,
      tempRange: tempDateRange,
      openPicker: openDatePicker,
      closePicker: closeDatePicker,
      updateTempRange: updateTempDateRange,
    },

    // ユーティリティ
    closeAllModals,
  };
};

/**
 * useAllocationModals の戻り値型
 */
export type UseAllocationModalsReturn = ReturnType<typeof useAllocationModals>;
