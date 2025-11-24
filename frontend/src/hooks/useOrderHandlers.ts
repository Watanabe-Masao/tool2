import { useCallback } from 'react';
import type { UseFormReturn, FieldArrayWithId, UseFieldArrayRemove } from 'react-hook-form';
import type { OrderFormData } from '@/schemas/orderSchema';
import type { BookNameDialog } from '@/stores/orderFormStore';
import { SessionStorageService } from '@/utils/sessionStorageService';

/**
 * useOrderHandlersのパラメータ
 */
interface UseOrderHandlersParams {
  // Form methods
  methods: UseFormReturn<OrderFormData>;
  productFields: FieldArrayWithId<OrderFormData, 'products', 'id'>[];
  removeProduct: UseFieldArrayRemove;

  // State
  activeStep: number;
  setActiveStep: (step: number) => void;
  activeProductIndex: number;
  setActiveProductIndex: (index: number) => void;
  suppliers: string[] | undefined;
  setLockedStores: (
    storesOrUpdater: Map<number, Set<string>> | ((prev: Map<number, Set<string>>) => Map<number, Set<string>>)
  ) => void;

  // Modal/Dialog state
  setBookNameDialog: (state: BookNameDialog) => void;
  bookNameDialog: BookNameDialog;
  setRestoreDialogOpen: (open: boolean) => void;
  setShowGeneratedPreview: (show: boolean) => void;

  // Refs
  isInitialLoad: React.MutableRefObject<boolean>;

  // Callbacks
  submitOrder: (data: OrderFormData, onBookNameDialogOpen: () => void) => Promise<void | boolean>;
  handleGenerateTemplate: (
    data: OrderFormData,
    bookName: string,
    setHasUnsavedChanges: (value: boolean) => void
  ) => Promise<boolean>;
  setHasUnsavedChanges: (value: boolean) => void;
  showSuccess: (message: string) => void;

  // User
  user: { uid: string } | null;

  // Constants
  TOTAL_STEPS: number;
}

/**
 * useOrderHandlers
 *
 * 注文フォームの各種ハンドラー関数を提供するカスタムフック
 *
 * 責務:
 * - 商品の追加・削除・クリア
 * - ステップナビゲーション（前へ・次へ・タブ変更）
 * - 配分数量変更・店舗ロック切り替え
 * - フォーム送信・ブック名確認
 * - 下書き復元・破棄
 *
 * @example
 * ```typescript
 * const {
 *   handleRemoveProduct,
 *   handleClearProduct,
 *   handleTabChange,
 *   handlePrevStep,
 *   handleNextStep,
 *   // ... その他のハンドラー
 * } = useOrderHandlers({ ... });
 * ```
 */
export const useOrderHandlers = ({
  methods,
  productFields,
  removeProduct,
  activeStep,
  setActiveStep,
  activeProductIndex,
  setActiveProductIndex,
  suppliers,
  setLockedStores,
  setBookNameDialog,
  bookNameDialog,
  setRestoreDialogOpen,
  setShowGeneratedPreview,
  isInitialLoad,
  submitOrder,
  handleGenerateTemplate,
  setHasUnsavedChanges,
  showSuccess,
  user,
  TOTAL_STEPS,
}: UseOrderHandlersParams) => {
  const { setValue, getValues, reset } = methods;

  /**
   * 商品削除ハンドラー（FloatingProgressSummary用）
   */
  const handleRemoveProduct = useCallback(
    (index: number) => {
      if (productFields.length <= 1) return; // 最後の1つは削除しない
      removeProduct(index);
      // アクティブなインデックスを調整
      if (activeProductIndex >= index && activeProductIndex > 0) {
        setActiveProductIndex(activeProductIndex - 1);
      }
    },
    [productFields.length, removeProduct, activeProductIndex, setActiveProductIndex]
  );

  /**
   * 商品フィールドクリアハンドラー（FloatingProgressSummary用）
   */
  const handleClearProduct = useCallback(
    (index: number) => {
      const defaultSupplier = suppliers && suppliers.length > 0 ? suppliers[0] : '';
      setValue(`products.${index}.categoryCode`, '');
      setValue(`products.${index}.supplier`, defaultSupplier);
      setValue(`products.${index}.name`, '');
      setValue(`products.${index}.origin`, '');
      setValue(`products.${index}.specification`, '');
      setValue(`products.${index}.quantityPerPackage`, null);
      setValue(`products.${index}.unit`, '');
    },
    [suppliers, setValue]
  );

  /**
   * タブ変更時の処理
   */
  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      setActiveStep(newValue);
    },
    [setActiveStep]
  );

  /**
   * 前のステップへ移動
   */
  const handlePrevStep = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  }, [activeStep, setActiveStep]);

  /**
   * 次のステップへ移動
   */
  const handleNextStep = useCallback(() => {
    if (activeStep < TOTAL_STEPS - 1) {
      setActiveStep(activeStep + 1);
    }
  }, [activeStep, TOTAL_STEPS, setActiveStep]);

  /**
   * プレビュー画面での配分数量変更ハンドラ（React#185対策: メモ化）
   */
  const handleAllocationChange = useCallback(
    (productIndex: number, storeIndex: number, newValue: number) => {
      setValue(`products.${productIndex}.storeAllocations.${storeIndex}`, newValue, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [setValue]
  );

  /**
   * ロック状態切り替えハンドラ（FloatingProgressSummary用）
   */
  const handleToggleLock = useCallback(
    (productIndex: number, storeCode: string) => {
      setLockedStores((prev) => {
        const newMap = new Map(prev);
        const productLocks = new Set(newMap.get(productIndex) || []);

        if (productLocks.has(storeCode)) {
          productLocks.delete(storeCode);
        } else {
          productLocks.add(storeCode);
        }

        newMap.set(productIndex, productLocks);
        return newMap;
      });
    },
    [setLockedStores]
  );

  /**
   * フォーム送信
   */
  const onSubmit = useCallback(
    async (data: OrderFormData) => {
      await submitOrder(data, () => setBookNameDialog({ open: true, bookName: '' }));
    },
    [submitOrder, setBookNameDialog]
  );

  /**
   * ブック名ダイアログの確認ハンドラー
   */
  const handleBookNameDialogConfirm = useCallback(async () => {
    const data = getValues();

    // ダイアログを閉じる
    setBookNameDialog({ open: false, bookName: '' });

    // テンプレート生成
    const success = await handleGenerateTemplate(data, bookNameDialog.bookName, setHasUnsavedChanges);

    // 成功時にプレビュー画面を表示
    if (success) {
      setShowGeneratedPreview(true);
    }
  }, [getValues, setBookNameDialog, bookNameDialog.bookName, handleGenerateTemplate, setHasUnsavedChanges, setShowGeneratedPreview]);

  /**
   * 下書きを復元
   */
  const handleRestoreDraft = useCallback(() => {
    if (!user) return;

    const draft = SessionStorageService.loadDraft(user.uid);
    if (draft) {
      reset(draft);
      setRestoreDialogOpen(false);
      showSuccess('下書きを復元しました');

      // 最初のステップに戻す
      setActiveStep(0);

      isInitialLoad.current = true; // 復元後は自動保存を一時的に無効化
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 1000);
    }
  }, [user, reset, setRestoreDialogOpen, showSuccess, setActiveStep, isInitialLoad]);

  /**
   * 下書きを破棄
   */
  const handleDiscardDraft = useCallback(() => {
    if (!user) return;

    SessionStorageService.clearDraft(user.uid);
    setRestoreDialogOpen(false);
  }, [user, setRestoreDialogOpen]);

  return {
    handleRemoveProduct,
    handleClearProduct,
    handleTabChange,
    handlePrevStep,
    handleNextStep,
    handleAllocationChange,
    handleToggleLock,
    onSubmit,
    handleBookNameDialogConfirm,
    handleRestoreDraft,
    handleDiscardDraft,
  };
};
