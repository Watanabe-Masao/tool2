import { describe, it, expect, beforeEach } from 'vitest';
import { useOrderFormStore } from '@/stores/orderFormStore';
import { act } from '@testing-library/react';

describe('orderFormStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useOrderFormStore.getState().reset();
    });
  });

  describe('初期状態', () => {
    it('activeStepの初期値は0', () => {
      const { activeStep } = useOrderFormStore.getState();
      expect(activeStep).toBe(0);
    });

    it('activeProductIndexの初期値は0', () => {
      const { activeProductIndex } = useOrderFormStore.getState();
      expect(activeProductIndex).toBe(0);
    });

    it('lockedStoresの初期値は空のMap', () => {
      const { lockedStores } = useOrderFormStore.getState();
      expect(lockedStores).toBeInstanceOf(Map);
      expect(lockedStores.size).toBe(0);
    });

    it('全モーダルの初期状態はfalse', () => {
      const {
        showPDFPreview,
        showDownloadModal,
        showPreviewModal,
        showEmailModal,
        showGeneratedPreview,
      } = useOrderFormStore.getState();

      expect(showPDFPreview).toBe(false);
      expect(showDownloadModal).toBe(false);
      expect(showPreviewModal).toBe(false);
      expect(showEmailModal).toBe(false);
      expect(showGeneratedPreview).toBe(false);
    });

    it('bookNameDialogの初期状態', () => {
      const { bookNameDialog } = useOrderFormStore.getState();
      expect(bookNameDialog).toEqual({
        open: false,
        bookName: '',
      });
    });
  });

  describe('ステップ管理', () => {
    it('setActiveStepでステップを変更できる', () => {
      act(() => {
        useOrderFormStore.getState().setActiveStep(3);
      });

      const { activeStep } = useOrderFormStore.getState();
      expect(activeStep).toBe(3);
    });

    it('複数回のsetActiveStepが正しく動作する', () => {
      act(() => {
        useOrderFormStore.getState().setActiveStep(1);
      });
      expect(useOrderFormStore.getState().activeStep).toBe(1);

      act(() => {
        useOrderFormStore.getState().setActiveStep(4);
      });
      expect(useOrderFormStore.getState().activeStep).toBe(4);
    });
  });

  describe('商品インデックス管理', () => {
    it('setActiveProductIndexで商品インデックスを変更できる', () => {
      act(() => {
        useOrderFormStore.getState().setActiveProductIndex(2);
      });

      const { activeProductIndex } = useOrderFormStore.getState();
      expect(activeProductIndex).toBe(2);
    });
  });

  describe('店舗ロック管理', () => {
    it('toggleStoreLockでロック状態を切り替えられる', () => {
      // ロック追加
      act(() => {
        useOrderFormStore.getState().toggleStoreLock(0, 'store-001');
      });

      let { lockedStores } = useOrderFormStore.getState();
      let productLocks = lockedStores.get(0);
      expect(productLocks).toBeDefined();
      expect(productLocks?.has('store-001')).toBe(true);

      // ロック解除
      act(() => {
        useOrderFormStore.getState().toggleStoreLock(0, 'store-001');
      });

      lockedStores = useOrderFormStore.getState().lockedStores;
      productLocks = lockedStores.get(0);
      expect(productLocks?.has('store-001')).toBe(false);
    });

    it('複数の店舗をロックできる', () => {
      act(() => {
        useOrderFormStore.getState().toggleStoreLock(0, 'store-001');
        useOrderFormStore.getState().toggleStoreLock(0, 'store-002');
        useOrderFormStore.getState().toggleStoreLock(0, 'store-003');
      });

      const { lockedStores } = useOrderFormStore.getState();
      const productLocks = lockedStores.get(0);

      expect(productLocks?.size).toBe(3);
      expect(productLocks?.has('store-001')).toBe(true);
      expect(productLocks?.has('store-002')).toBe(true);
      expect(productLocks?.has('store-003')).toBe(true);
    });

    it('異なる商品の店舗ロックを独立して管理できる', () => {
      act(() => {
        useOrderFormStore.getState().toggleStoreLock(0, 'store-001');
        useOrderFormStore.getState().toggleStoreLock(1, 'store-002');
      });

      const { lockedStores } = useOrderFormStore.getState();
      const product0Locks = lockedStores.get(0);
      const product1Locks = lockedStores.get(1);

      expect(product0Locks?.has('store-001')).toBe(true);
      expect(product0Locks?.has('store-002')).toBe(false);
      expect(product1Locks?.has('store-001')).toBe(false);
      expect(product1Locks?.has('store-002')).toBe(true);
    });
  });

  describe('モーダル状態管理', () => {
    it('setShowPDFPreviewでモーダルを開閉できる', () => {
      act(() => {
        useOrderFormStore.getState().setShowPDFPreview(true);
      });
      expect(useOrderFormStore.getState().showPDFPreview).toBe(true);

      act(() => {
        useOrderFormStore.getState().setShowPDFPreview(false);
      });
      expect(useOrderFormStore.getState().showPDFPreview).toBe(false);
    });

    it('setBookNameDialogでダイアログ状態を変更できる', () => {
      act(() => {
        useOrderFormStore.getState().setBookNameDialog({
          open: true,
          bookName: 'テストブック名',
        });
      });

      const { bookNameDialog } = useOrderFormStore.getState();
      expect(bookNameDialog.open).toBe(true);
      expect(bookNameDialog.bookName).toBe('テストブック名');
    });
  });

  describe('カテゴリフィルター管理', () => {
    it('toggleCategorySelectionでカテゴリ選択を切り替えられる', () => {
      // カテゴリ選択
      act(() => {
        useOrderFormStore.getState().toggleCategorySelection(0, 'category-A');
      });

      let { selectedCategories } = useOrderFormStore.getState();
      let productCategories = selectedCategories.get(0);
      expect(productCategories?.has('category-A')).toBe(true);

      // カテゴリ選択解除
      act(() => {
        useOrderFormStore.getState().toggleCategorySelection(0, 'category-A');
      });

      selectedCategories = useOrderFormStore.getState().selectedCategories;
      productCategories = selectedCategories.get(0);
      expect(productCategories?.has('category-A')).toBe(false);
    });
  });

  describe('reset', () => {
    it('reset()で全ての状態が初期化される', () => {
      // 状態を変更
      act(() => {
        useOrderFormStore.getState().setActiveStep(3);
        useOrderFormStore.getState().setActiveProductIndex(2);
        useOrderFormStore.getState().toggleStoreLock(0, 'store-001');
        useOrderFormStore.getState().setShowPDFPreview(true);
        useOrderFormStore.getState().setBookNameDialog({
          open: true,
          bookName: 'test',
        });
      });

      // リセット
      act(() => {
        useOrderFormStore.getState().reset();
      });

      // 初期状態に戻ることを確認
      const state = useOrderFormStore.getState();
      expect(state.activeStep).toBe(0);
      expect(state.activeProductIndex).toBe(0);
      expect(state.lockedStores.size).toBe(0);
      expect(state.showPDFPreview).toBe(false);
      expect(state.bookNameDialog).toEqual({ open: false, bookName: '' });
    });
  });
});
