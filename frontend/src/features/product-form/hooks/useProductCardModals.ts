import { useState, useCallback } from 'react';
import type { ProductHistoryItem } from '@/hooks/useProductHistory';

/**
 * プリセット確認ダイアログの状態
 */
export interface PresetConfirmDialogState {
  open: boolean;
  preset: ProductHistoryItem | null;
}

/**
 * 削除ダイアログの状態
 */
export interface DeleteDialogState {
  open: boolean;
  type: 'name' | 'origin' | 'specification' | 'quantity' | 'specificationUnit';
  value: string | number;
  conditions: {
    name?: string;
    origin?: string;
    specification?: string;
    quantityPerPackage?: number;
    specificationUnit?: string;
  };
}

/**
 * useProductCardModals の戻り値
 */
export interface UseProductCardModalsReturn {
  // カテゴリーモーダル
  categoryModal: {
    open: boolean;
    openModal: () => void;
    closeModal: () => void;
  };
  // プリセットモーダル
  presetModal: {
    open: boolean;
    openModal: () => void;
    closeModal: () => void;
  };
  // 品名履歴モーダル
  nameHistoryModal: {
    open: boolean;
    openModal: () => void;
    closeModal: () => void;
  };
  // 商品保存ダイアログ
  saveDialog: {
    open: boolean;
    openDialog: () => void;
    closeDialog: () => void;
  };
  // 帳合先選択モーダル
  supplierSelect: {
    open: boolean;
    openModal: () => void;
    closeModal: () => void;
  };
  // プリセット確認ダイアログ
  presetConfirmDialog: {
    state: PresetConfirmDialogState;
    openDialog: (preset: ProductHistoryItem) => void;
    closeDialog: () => void;
  };
  // 削除ダイアログ
  deleteDialog: {
    state: DeleteDialogState;
    openDialog: (
      type: DeleteDialogState['type'],
      value: string | number,
      conditions: DeleteDialogState['conditions']
    ) => void;
    closeDialog: () => void;
  };
  // カードメニュー
  cardMenu: {
    anchorEl: HTMLElement | null;
    open: boolean;
    openMenu: (element: HTMLElement) => void;
    closeMenu: () => void;
  };
}

/**
 * 商品カードのモーダル状態管理フック
 *
 * ProductFormCardBasic で使用する複数のモーダル/ダイアログの
 * 状態を一元管理します。
 *
 * @example
 * ```tsx
 * const modals = useProductCardModals();
 *
 * // カテゴリーモーダルを開く
 * modals.categoryModal.openModal();
 *
 * // プリセット確認ダイアログを開く
 * modals.presetConfirmDialog.openDialog(preset);
 * ```
 */
export const useProductCardModals = (): UseProductCardModalsReturn => {
  // カテゴリーモーダル
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // プリセットモーダル
  const [presetModalOpen, setPresetModalOpen] = useState(false);

  // 品名履歴モーダル
  const [nameHistoryModalOpen, setNameHistoryModalOpen] = useState(false);

  // 商品保存ダイアログ
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // 帳合先選択モーダル
  const [supplierSelectOpen, setSupplierSelectOpen] = useState(false);

  // プリセット確認ダイアログ
  const [presetConfirmDialogState, setPresetConfirmDialogState] = useState<PresetConfirmDialogState>({
    open: false,
    preset: null,
  });

  // 削除ダイアログ
  const [deleteDialogState, setDeleteDialogState] = useState<DeleteDialogState>({
    open: false,
    type: 'name',
    value: '',
    conditions: {},
  });

  // カードメニュー
  const [cardMenuAnchor, setCardMenuAnchor] = useState<HTMLElement | null>(null);

  // カテゴリーモーダル
  const openCategoryModal = useCallback(() => setCategoryModalOpen(true), []);
  const closeCategoryModal = useCallback(() => setCategoryModalOpen(false), []);

  // プリセットモーダル
  const openPresetModal = useCallback(() => setPresetModalOpen(true), []);
  const closePresetModal = useCallback(() => setPresetModalOpen(false), []);

  // 品名履歴モーダル
  const openNameHistoryModal = useCallback(() => setNameHistoryModalOpen(true), []);
  const closeNameHistoryModal = useCallback(() => setNameHistoryModalOpen(false), []);

  // 商品保存ダイアログ
  const openSaveDialog = useCallback(() => setSaveDialogOpen(true), []);
  const closeSaveDialog = useCallback(() => setSaveDialogOpen(false), []);

  // 帳合先選択モーダル
  const openSupplierSelect = useCallback(() => setSupplierSelectOpen(true), []);
  const closeSupplierSelect = useCallback(() => setSupplierSelectOpen(false), []);

  // プリセット確認ダイアログ
  const openPresetConfirmDialog = useCallback((preset: ProductHistoryItem) => {
    setPresetConfirmDialogState({ open: true, preset });
  }, []);
  const closePresetConfirmDialog = useCallback(() => {
    setPresetConfirmDialogState({ open: false, preset: null });
  }, []);

  // 削除ダイアログ
  const openDeleteDialog = useCallback(
    (
      type: DeleteDialogState['type'],
      value: string | number,
      conditions: DeleteDialogState['conditions']
    ) => {
      setDeleteDialogState({ open: true, type, value, conditions });
    },
    []
  );
  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogState((prev) => ({ ...prev, open: false }));
  }, []);

  // カードメニュー
  const openCardMenu = useCallback((element: HTMLElement) => {
    setCardMenuAnchor(element);
  }, []);
  const closeCardMenu = useCallback(() => {
    setCardMenuAnchor(null);
  }, []);

  return {
    categoryModal: {
      open: categoryModalOpen,
      openModal: openCategoryModal,
      closeModal: closeCategoryModal,
    },
    presetModal: {
      open: presetModalOpen,
      openModal: openPresetModal,
      closeModal: closePresetModal,
    },
    nameHistoryModal: {
      open: nameHistoryModalOpen,
      openModal: openNameHistoryModal,
      closeModal: closeNameHistoryModal,
    },
    saveDialog: {
      open: saveDialogOpen,
      openDialog: openSaveDialog,
      closeDialog: closeSaveDialog,
    },
    supplierSelect: {
      open: supplierSelectOpen,
      openModal: openSupplierSelect,
      closeModal: closeSupplierSelect,
    },
    presetConfirmDialog: {
      state: presetConfirmDialogState,
      openDialog: openPresetConfirmDialog,
      closeDialog: closePresetConfirmDialog,
    },
    deleteDialog: {
      state: deleteDialogState,
      openDialog: openDeleteDialog,
      closeDialog: closeDeleteDialog,
    },
    cardMenu: {
      anchorEl: cardMenuAnchor,
      open: Boolean(cardMenuAnchor),
      openMenu: openCardMenu,
      closeMenu: closeCardMenu,
    },
  };
};
