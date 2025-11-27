/**
 * OrderFormProvider のコアロジックフック
 *
 * OrderFormProvider で使用される全てのフックを統合し、
 * コンテキスト値を生成するためのカスタムフック
 */

import { useMemo, useRef, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderFormSchema, type OrderFormData } from '@/schemas/orderSchema';
import { useAuthContext } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useNavigationContext } from '@/context/NavigationContext';
import { useAutocompleteFields } from '@/hooks/useAutocompleteFields';
import { useDataSync } from '@/hooks/useDataSync';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useOrderSubmit } from '@/hooks/useOrderSubmit';
import { useOrderDraftManagement } from '@/hooks/useOrderDraftManagement';
import { useSupplierManagement } from '@/hooks/useSupplierManagement';
import { useOrderHandlers } from '@/hooks/useOrderHandlers';
import { useStepNavigation } from '@/hooks/useStepNavigation';
import {
  useOrderFormStore,
  useActiveStep,
  useActiveProductIndex,
  useModalStates,
  useStoreLocks,
} from '@/stores/orderFormStore';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';
import type { OrderFormContextValue } from './types';
import { TOTAL_STEPS } from './types';

/**
 * OrderFormProvider で使用するフックを統合するカスタムフック
 */
export const useOrderFormProvider = (): {
  contextValue: OrderFormContextValue;
  methods: ReturnType<typeof useForm<OrderFormData>>;
} => {
  // ===== 認証・通知・ナビゲーション =====
  const { user } = useAuthContext();
  const { showSuccess, showError, showLoading, hideLoading } = useNotification();
  const { setStepNavigation, showProgressSummary } = useNavigationContext();

  // ===== オフライン同期 =====
  const { isOnline, saveOrder: saveOrderWithSync } = useDataSync();

  // ===== オートコンプリート =====
  const autocomplete = useAutocompleteFields();

  // ===== ユーザー設定 =====
  const userSettings = useUserSettings(user);

  // ===== UI状態管理 (Zustand) =====
  const { activeStep, setActiveStep } = useActiveStep();
  const { activeProductIndex, setActiveProductIndex } = useActiveProductIndex();
  const { setLockedStores } = useStoreLocks();
  const setProgressSummaryHeight = useOrderFormStore((state) => state.setProgressSummaryHeight);

  // ===== モーダル状態管理 (Zustand) =====
  const modalStates = useModalStates();

  // ===== React Hook Form =====
  const methods = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      deliveryDate: new Date(),
      suppliers: [],
      products: [
        {
          ...DEFAULT_PRODUCT_FORM_DATA,
          totalDelivery: 0,
          storeAllocations: new Array(STORE_COUNT).fill(0),
        },
      ],
    },
    mode: 'onChange',
  });

  const { control, getValues } = methods;

  // ===== 商品フィールド配列 =====
  const {
    fields: productFields,
    append: appendProduct,
    remove: removeProduct,
    move: moveProduct,
  } = useFieldArray({
    control,
    name: 'products',
  });

  // ===== 監視データ =====
  const suppliers = useWatch({ control, name: 'suppliers' });
  const products = useWatch({ control, name: 'products' });
  const deliveryDate = useWatch({ control, name: 'deliveryDate' });

  // ===== 注文送信ロジック =====
  const {
    generatedFiles,
    setGeneratedFiles,
    excelBlob,
    setExcelBlob,
    handleSubmit: submitOrder,
    handleGenerateTemplate,
    handleDownloadExcel,
    handleDownloadPdf,
  } = useOrderSubmit({
    userId: user?.uid,
    user,
    userSettings,
    isOnline,
    saveOrderWithSync,
    supplierAutocomplete: autocomplete.supplier,
    productNameAutocomplete: autocomplete.productName,
    originAutocomplete: autocomplete.origin,
    showSuccess,
    showError,
    showLoading,
    hideLoading,
  });

  // ===== 下書き管理 =====
  const {
    restoreDialogOpen,
    setRestoreDialogOpen,
    setHasUnsavedChanges,
    isInitialLoad,
    triggerAutoSave,
  } = useOrderDraftManagement({
    user,
    methods,
  });

  // フォーム変更時に自動保存をトリガー
  // NOTE: useWatchの値を直接useEffectの依存配列に含めると無限ループ(React #185)が発生するため、
  // JSON.stringifyで文字列化して比較し、実際に変更があった場合のみtriggerAutoSaveを呼び出す
  const formDataJson = JSON.stringify({ products, suppliers, deliveryDate: deliveryDate?.toISOString() });
  const prevFormDataRef = useRef(formDataJson);

  useEffect(() => {
    if (prevFormDataRef.current !== formDataJson) {
      prevFormDataRef.current = formDataJson;
      triggerAutoSave();
    }
  }, [formDataJson, triggerAutoSave]);

  // ===== 帳合先管理 =====
  const {
    supplierRemovalDialog,
    handleSuppliersChange,
    handleConfirmSupplierRemoval,
    handleCancelSupplierRemoval,
  } = useSupplierManagement({
    methods,
    suppliers,
    isInitialLoad,
    showSuccess,
  });

  // ===== ハンドラー =====
  const {
    handleRemoveProduct,
    handleClearProduct,
    handlePrevStep,
    handleNextStep,
    handleAllocationChange,
    onSubmit,
    handleBookNameDialogConfirm,
    handleRestoreDraft,
    handleDiscardDraft,
  } = useOrderHandlers({
    methods,
    productFields,
    removeProduct,
    activeStep,
    setActiveStep,
    activeProductIndex,
    setActiveProductIndex,
    suppliers,
    setLockedStores,
    setBookNameDialog: modalStates.setBookNameDialog,
    bookNameDialog: modalStates.bookNameDialog,
    setRestoreDialogOpen,
    setShowGeneratedPreview: modalStates.setShowGeneratedPreview,
    isInitialLoad,
    submitOrder,
    handleGenerateTemplate,
    setHasUnsavedChanges,
    showSuccess,
    user,
    TOTAL_STEPS,
  });

  // ===== ステップナビゲーション =====
  useStepNavigation({
    activeStep,
    activeProductIndex,
    showGeneratedPreview: modalStates.showGeneratedPreview,
    TOTAL_STEPS,
    getValues,
    setStepNavigation,
    setActiveProductIndex,
    handlePrevStep,
    handleNextStep,
  });

  // ===== Context値をメモ化 =====
  const contextValue = useMemo<OrderFormContextValue>(
    () => ({
      // 認証・ユーザー
      user,
      userSettings,
      isOnline,

      // フォーム
      form: methods,
      productFields,
      appendProduct,
      removeProduct,
      moveProduct,

      // 監視データ
      suppliers,
      products,
      deliveryDate,

      // ナビゲーション
      activeStep,
      setActiveStep,
      activeProductIndex,
      setActiveProductIndex,
      handlePrevStep,
      handleNextStep,

      // モーダル状態
      modalStates,

      // 商品操作
      handleRemoveProduct,
      handleClearProduct,

      // 配分操作
      handleAllocationChange,

      // フォーム送信
      onSubmit,
      handleBookNameDialogConfirm,

      // 下書き管理
      draft: {
        restoreDialogOpen,
        handleRestoreDraft,
        handleDiscardDraft,
      },

      // 帳合先管理
      supplierManagement: {
        supplierRemovalDialog,
        handleSuppliersChange,
        handleConfirmSupplierRemoval,
        handleCancelSupplierRemoval,
      },

      // 送信・生成
      submission: {
        generatedFiles,
        setGeneratedFiles,
        excelBlob,
        setExcelBlob,
        handleDownloadExcel,
        handleDownloadPdf,
      },

      // オートコンプリート
      autocomplete,

      // レイアウト
      setProgressSummaryHeight,
      showProgressSummary,
    }),
    // NOTE: suppliers, products, deliveryDateはuseWatchから取得されるため、
    // 毎回新しい参照が返され、依存配列に含めると無限ループ(React #185)が発生する
    // これらの値はcontextValueに含まれるが、依存配列からは除外する
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      user,
      userSettings,
      isOnline,
      methods,
      productFields,
      appendProduct,
      removeProduct,
      moveProduct,
      // suppliers, products, deliveryDate は除外（useWatchからの不安定な参照）
      activeStep,
      setActiveStep,
      activeProductIndex,
      setActiveProductIndex,
      handlePrevStep,
      handleNextStep,
      modalStates,
      handleRemoveProduct,
      handleClearProduct,
      handleAllocationChange,
      onSubmit,
      handleBookNameDialogConfirm,
      restoreDialogOpen,
      handleRestoreDraft,
      handleDiscardDraft,
      supplierRemovalDialog,
      handleSuppliersChange,
      handleConfirmSupplierRemoval,
      handleCancelSupplierRemoval,
      generatedFiles,
      setGeneratedFiles,
      excelBlob,
      setExcelBlob,
      handleDownloadExcel,
      handleDownloadPdf,
      autocomplete,
      setProgressSummaryHeight,
      showProgressSummary,
    ]
  );

  return { contextValue, methods };
};
