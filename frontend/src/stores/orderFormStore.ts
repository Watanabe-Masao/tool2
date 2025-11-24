import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

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
 * - 商品インデックス
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
  setActiveProductIndex: (index: number) => void;

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
  activeStep: 0,
  activeProductIndex: 0,
  lockedStores: new Map<number, Set<string>>(),
  selectedCategories: new Map<number, Set<string>>(),
  progressSummaryHeight: 0,
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
      enabled: process.env.NODE_ENV === 'development',
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

// 商品インデックスのみ取得
export const useActiveProductIndex = () =>
  useOrderFormStore((state) => ({
    activeProductIndex: state.activeProductIndex,
    setActiveProductIndex: state.setActiveProductIndex,
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
