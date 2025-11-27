import { useMemo } from 'react';
import type { UseFormReturn, FieldArrayWithId, UseFieldArrayRemove } from 'react-hook-form';
import type { OrderFormData } from '@/schemas/orderSchema';
import type { BookNameDialog } from '@/stores/orderFormStore';
import { useProductActions } from './useProductActions';
import { useStepActions } from './useStepActions';
import { useAllocationActions } from './useAllocationActions';
import { useDraftActions } from './useDraftActions';
import { useFormSubmitHandler } from './useFormSubmitHandler';

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
 * 注文フォームの各種ハンドラー関数を提供するカスタムフック（統合版）
 *
 * このhookは、以下の5つの小さなhooksを組み合わせて構成されています:
 * - useProductActions: 商品の削除・クリア
 * - useStepActions: ステップナビゲーション
 * - useAllocationActions: 配分数量変更・店舗ロック
 * - useDraftActions: 下書き復元・破棄
 * - useFormSubmitHandler: フォーム送信・ブック名確認
 *
 * 各小hookは単一責任の原則に従い、テストしやすく保守しやすい設計になっています。
 * この統合hookは既存のインターフェースを維持し、後方互換性を保証します。
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
 *   handleAllocationChange,
 *   handleToggleLock,
 *   onSubmit,
 *   handleBookNameDialogConfirm,
 *   handleRestoreDraft,
 *   handleDiscardDraft,
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

  // 1. 商品管理機能
  const { handleRemoveProduct, handleClearProduct } = useProductActions({
    setValue,
    productFields,
    removeProduct,
    activeProductIndex,
    setActiveProductIndex,
    suppliers,
  });

  // 2. ステップナビゲーション機能
  const { handleTabChange, handlePrevStep, handleNextStep } = useStepActions({
    activeStep,
    setActiveStep,
    TOTAL_STEPS,
  });

  // 3. 配分・ロック管理機能
  const { handleAllocationChange, handleToggleLock } = useAllocationActions({
    setValue,
    setLockedStores,
  });

  // 4. 下書き管理機能
  const { handleRestoreDraft, handleDiscardDraft } = useDraftActions({
    user,
    reset,
    setRestoreDialogOpen,
    showSuccess,
    setActiveStep,
    isInitialLoad,
  });

  // 5. フォーム送信機能
  const { onSubmit, handleBookNameDialogConfirm } = useFormSubmitHandler({
    getValues,
    submitOrder,
    setBookNameDialog,
    bookNameDialog,
    handleGenerateTemplate,
    setHasUnsavedChanges,
    setShowGeneratedPreview,
  });

  // 戻り値をメモ化して安定した参照を維持（無限ループ防止）
  return useMemo(
    () => ({
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
    }),
    [
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
    ]
  );
};
