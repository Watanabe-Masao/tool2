import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { env } from '@/config/env';

/**
 * BookNameダイアログの状態
 */
export interface BookNameDialog {
  open: boolean;
  bookName: string;
}

/**
 * Order Form UI状態管理Store
 *
 * このStoreは注文フォームのUI状態を一元管理します。
 * - ステップナビゲーション
 * - 商品インデックス・ナビゲーション
 * - フォームロック状態
 * - 店舗ロック状態
 * - カテゴリフィルター
 * - モーダル表示状態
 */
interface OrderFormState {
  // ===== ステップナビゲーション =====
  activeStep: number;
  setActiveStep: (step: number) => void;

  // ===== 商品関連 =====
  activeProductIndex: number;
  totalProducts: number;
  setActiveProductIndex: (index: number) => void;
  setTotalProducts: (total: number) => void;
  goToNextProduct: () => void;
  goToPrevProduct: () => void;
  goToProduct: (index: number) => void;
  resetProductIndex: () => void;
  handleProductDeleted: (deletedIndex: number) => void;

  // ===== フォームロック状態 =====
  isLocked: boolean;
  hasUnsavedChanges: boolean;
  isSubmitting: boolean;
  setIsLocked: (locked: boolean) => void;
  setHasUnsavedChanges: (changed: boolean) => void;
  setIsSubmitting: (submitting: boolean) => void;
  lockForm: () => void;
  unlockForm: () => void;
  markAsUnsaved: () => void;
  markAsSaved: () => void;
  startSubmitting: () => void;
  endSubmitting: (success?: boolean) => void;

  // ===== 店舗配分関連 =====
  lockedStores: Map<number, Set<string>>;
  setLockedStores: (
    storesOrUpdater: Map<number, Set<string>> | ((prev: Map<number, Set<string>>) => Map<number, Set<string>>)
  ) => void;
  toggleStoreLock: (productIndex: number, storeCode: string) => void;

  // ===== カテゴリフィルター =====
  selectedCategories: Map<number, Set<string>>;
  setSelectedCategories: (
    categoriesOrUpdater: Map<number, Set<string>> | ((prev: Map<number, Set<string>>) => Map<number, Set<string>>)
  ) => void;
  toggleCategorySelection: (productIndex: number, categoryCode: string) => void;

  // ===== レイアウト =====
  progressSummaryHeight: number;
  setProgressSummaryHeight: (height: number) => void;
  isProgressSummaryCollapsed: boolean;
  setIsProgressSummaryCollapsed: (collapsed: boolean) => void;
  toggleProgressSummaryCollapse: () => void;

  // ===== モーダル状態 =====
  showPDFPreview: boolean;
  setShowPDFPreview: (show: boolean) => void;

  showDownloadModal: boolean;
  setShowDownloadModal: (show: boolean) => void;

  showPreviewModal: boolean;
  setShowPreviewModal: (show: boolean) => void;

  showEmailModal: boolean;
  setShowEmailModal: (show: boolean) => void;

  showGeneratedPreview: boolean;
  setShowGeneratedPreview: (show: boolean) => void;

  bookNameDialog: BookNameDialog;
  setBookNameDialog: (dialog: BookNameDialog) => void;

  // ===== リセット =====
  reset: () => void;
}

/**
 * 初期状態
 */
const initialState = {
  // ステップ・商品
  activeStep: 0,
  activeProductIndex: 0,
  totalProducts: 1,
  // フォームロック
  isLocked: false,
  hasUnsavedChanges: false,
  isSubmitting: false,
  // 店舗・カテゴリ
  lockedStores: new Map<number, Set<string>>(),
  selectedCategories: new Map<number, Set<string>>(),
  // レイアウト
  progressSummaryHeight: 0,
  isProgressSummaryCollapsed: false,
  // モーダル
  showPDFPreview: false,
  showDownloadModal: false,
  showPreviewModal: false,
  showEmailModal: false,
  showGeneratedPreview: false,
  bookNameDialog: { open: false, bookName: '' },
};

/**
 * Order Form Store
 *
 * Redux DevToolsでデバッグ可能
 * ブラウザのlocalStorageに永続化（UIの位置情報のみ）
 */
export const useOrderFormStore = create<OrderFormState>()(
  devtools(
    persist(
      (set) => ({
        // 初期状態
        ...initialState,

        // ===== Actions =====

        // ステップ変更
        setActiveStep: (step) => set({ activeStep: step }, false, 'setActiveStep'),

        // 商品インデックス変更
        setActiveProductIndex: (index) =>
          set({ activeProductIndex: index }, false, 'setActiveProductIndex'),

        // 商品数設定
        setTotalProducts: (total) =>
          set({ totalProducts: total }, false, 'setTotalProducts'),

        // 次の商品へ
        goToNextProduct: () =>
          set(
            (state) => ({
              activeProductIndex: Math.min(
                state.activeProductIndex + 1,
                Math.max(state.totalProducts - 1, 0)
              ),
            }),
            false,
            'goToNextProduct'
          ),

        // 前の商品へ
        goToPrevProduct: () =>
          set(
            (state) => ({
              activeProductIndex: Math.max(state.activeProductIndex - 1, 0),
            }),
            false,
            'goToPrevProduct'
          ),

        // 特定の商品へ移動
        goToProduct: (index) =>
          set(
            (state) => ({
              activeProductIndex:
                index >= 0 && index < state.totalProducts ? index : state.activeProductIndex,
            }),
            false,
            'goToProduct'
          ),

        // 商品インデックスリセット
        resetProductIndex: () =>
          set({ activeProductIndex: 0 }, false, 'resetProductIndex'),

        // 商品削除時のインデックス調整
        handleProductDeleted: (deletedIndex) =>
          set(
            (state) => {
              let newIndex = state.activeProductIndex;
              if (state.activeProductIndex > deletedIndex) {
                newIndex = state.activeProductIndex - 1;
              } else if (state.activeProductIndex === deletedIndex) {
                if (state.activeProductIndex === state.totalProducts - 1) {
                  newIndex = Math.max(state.activeProductIndex - 1, 0);
                }
              }
              return {
                activeProductIndex: newIndex,
                totalProducts: Math.max(state.totalProducts - 1, 1),
              };
            },
            false,
            'handleProductDeleted'
          ),

        // ===== フォームロック状態 =====

        // ロック状態設定
        setIsLocked: (locked) => set({ isLocked: locked }, false, 'setIsLocked'),

        // 未保存変更フラグ設定
        setHasUnsavedChanges: (changed) =>
          set({ hasUnsavedChanges: changed }, false, 'setHasUnsavedChanges'),

        // 送信中状態設定
        setIsSubmitting: (submitting) =>
          set({ isSubmitting: submitting }, false, 'setIsSubmitting'),

        // フォームをロック
        lockForm: () => set({ isLocked: true }, false, 'lockForm'),

        // フォームをアンロック
        unlockForm: () => set({ isLocked: false }, false, 'unlockForm'),

        // 未保存変更をマーク
        markAsUnsaved: () => set({ hasUnsavedChanges: true }, false, 'markAsUnsaved'),

        // 保存完了をマーク
        markAsSaved: () => set({ hasUnsavedChanges: false }, false, 'markAsSaved'),

        // 送信開始
        startSubmitting: () =>
          set({ isSubmitting: true, isLocked: true }, false, 'startSubmitting'),

        // 送信終了
        endSubmitting: (success = true) =>
          set(
            {
              isSubmitting: false,
              isLocked: false,
              hasUnsavedChanges: success ? false : undefined,
            },
            false,
            'endSubmitting'
          ),

        // 店舗ロック状態設定（関数型更新もサポート）
        setLockedStores: (storesOrUpdater) =>
          set(
            (state) => ({
              lockedStores:
                typeof storesOrUpdater === 'function'
                  ? storesOrUpdater(state.lockedStores)
                  : storesOrUpdater,
            }),
            false,
            'setLockedStores'
          ),

        // 店舗ロックトグル
        toggleStoreLock: (productIndex, storeCode) =>
          set(
            (state) => {
              const newMap = new Map(state.lockedStores);
              const productLocks = new Set(newMap.get(productIndex) || []);

              if (productLocks.has(storeCode)) {
                productLocks.delete(storeCode);
              } else {
                productLocks.add(storeCode);
              }

              newMap.set(productIndex, productLocks);
              return { lockedStores: newMap };
            },
            false,
            'toggleStoreLock'
          ),

        // カテゴリフィルター設定（関数型更新もサポート）
        setSelectedCategories: (categoriesOrUpdater) =>
          set(
            (state) => ({
              selectedCategories:
                typeof categoriesOrUpdater === 'function'
                  ? categoriesOrUpdater(state.selectedCategories)
                  : categoriesOrUpdater,
            }),
            false,
            'setSelectedCategories'
          ),

        // カテゴリ選択トグル
        toggleCategorySelection: (productIndex, categoryCode) =>
          set(
            (state) => {
              const newMap = new Map(state.selectedCategories);
              const productCategories = new Set(newMap.get(productIndex) || []);

              if (productCategories.has(categoryCode)) {
                productCategories.delete(categoryCode);
              } else {
                productCategories.add(categoryCode);
              }

              newMap.set(productIndex, productCategories);
              return { selectedCategories: newMap };
            },
            false,
            'toggleCategorySelection'
          ),

        // 進捗サマリー高さ設定
        setProgressSummaryHeight: (height) =>
          set({ progressSummaryHeight: height }, false, 'setProgressSummaryHeight'),

        // 進捗サマリー折りたたみ状態設定
        setIsProgressSummaryCollapsed: (collapsed) =>
          set({ isProgressSummaryCollapsed: collapsed }, false, 'setIsProgressSummaryCollapsed'),

        // 進捗サマリー折りたたみトグル
        toggleProgressSummaryCollapse: () =>
          set(
            (state) => ({ isProgressSummaryCollapsed: !state.isProgressSummaryCollapsed }),
            false,
            'toggleProgressSummaryCollapse'
          ),

        // モーダル状態設定
        setShowPDFPreview: (show) => set({ showPDFPreview: show }, false, 'setShowPDFPreview'),
        setShowDownloadModal: (show) =>
          set({ showDownloadModal: show }, false, 'setShowDownloadModal'),
        setShowPreviewModal: (show) =>
          set({ showPreviewModal: show }, false, 'setShowPreviewModal'),
        setShowEmailModal: (show) => set({ showEmailModal: show }, false, 'setShowEmailModal'),
        setShowGeneratedPreview: (show) =>
          set({ showGeneratedPreview: show }, false, 'setShowGeneratedPreview'),
        setBookNameDialog: (dialog) =>
          set({ bookNameDialog: dialog }, false, 'setBookNameDialog'),

        // 状態リセット
        reset: () => set(initialState, false, 'reset'),
      }),
      {
        name: 'order-form-ui-storage',
        // 永続化する項目を限定（セキュリティ考慮）
        partialize: (state) => ({
          activeStep: state.activeStep,
          progressSummaryHeight: state.progressSummaryHeight,
        }),
      }
    ),
    {
      name: 'OrderFormStore',
      enabled: env.isDevelopment(),
    }
  )
);

/**
 * Selector Hooks（パフォーマンス最適化用）
 */

// ステップ情報のみ取得
export const useActiveStep = () =>
  useOrderFormStore((state) => ({
    activeStep: state.activeStep,
    setActiveStep: state.setActiveStep,
  }));

// 商品インデックスと操作を取得
export const useActiveProductIndex = () =>
  useOrderFormStore((state) => ({
    activeProductIndex: state.activeProductIndex,
    totalProducts: state.totalProducts,
    setActiveProductIndex: state.setActiveProductIndex,
    setTotalProducts: state.setTotalProducts,
    goToNextProduct: state.goToNextProduct,
    goToPrevProduct: state.goToPrevProduct,
    goToProduct: state.goToProduct,
    resetProductIndex: state.resetProductIndex,
    handleProductDeleted: state.handleProductDeleted,
    // Computed
    isFirstProduct: state.activeProductIndex === 0,
    isLastProduct: state.activeProductIndex === Math.max(state.totalProducts - 1, 0),
    hasProducts: state.totalProducts > 0,
  }));

// モーダル状態のみ取得
export const useModalStates = () =>
  useOrderFormStore((state) => ({
    showPDFPreview: state.showPDFPreview,
    showDownloadModal: state.showDownloadModal,
    showPreviewModal: state.showPreviewModal,
    showEmailModal: state.showEmailModal,
    showGeneratedPreview: state.showGeneratedPreview,
    bookNameDialog: state.bookNameDialog,
    setShowPDFPreview: state.setShowPDFPreview,
    setShowDownloadModal: state.setShowDownloadModal,
    setShowPreviewModal: state.setShowPreviewModal,
    setShowEmailModal: state.setShowEmailModal,
    setShowGeneratedPreview: state.setShowGeneratedPreview,
    setBookNameDialog: state.setBookNameDialog,
  }));

// 店舗ロック状態のみ取得
export const useStoreLocks = () =>
  useOrderFormStore((state) => ({
    lockedStores: state.lockedStores,
    setLockedStores: state.setLockedStores,
    toggleStoreLock: state.toggleStoreLock,
  }));

// フォームロック状態を取得
export const useFormLock = () =>
  useOrderFormStore((state) => ({
    isLocked: state.isLocked,
    hasUnsavedChanges: state.hasUnsavedChanges,
    isSubmitting: state.isSubmitting,
    setIsLocked: state.setIsLocked,
    setHasUnsavedChanges: state.setHasUnsavedChanges,
    setIsSubmitting: state.setIsSubmitting,
    lockForm: state.lockForm,
    unlockForm: state.unlockForm,
    markAsUnsaved: state.markAsUnsaved,
    markAsSaved: state.markAsSaved,
    startSubmitting: state.startSubmitting,
    endSubmitting: state.endSubmitting,
    // Computed
    canSubmit: !state.isLocked && !state.isSubmitting,
    shouldWarnBeforeLeave: state.hasUnsavedChanges,
  }));
