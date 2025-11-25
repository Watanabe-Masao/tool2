import React, { createContext, useContext, useMemo } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { useForm, useFieldArray, useWatch, FormProvider } from 'react-hook-form';
import type { UseFormReturn, FieldArrayWithId, UseFieldArrayReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderFormSchema, type OrderFormData } from '@/schemas/orderSchema';
import { useAuthContext } from './AuthContext';
import { useNotification } from './NotificationContext';
import { useNavigationContext } from './NavigationContext';
import { useAutocompleteFields, type UseAutocompleteFieldsReturn } from '@/hooks/useAutocompleteFields';
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
import type { BookNameDialog } from '@/stores/orderFormStore';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';
import type { UserSettings } from '@/types/userSettings';
import type { GeneratedFiles } from '@/types/hooks';

/**
 * フォームのステップ数
 */
export const TOTAL_STEPS = 5;

/**
 * 帳合先削除ダイアログの状態
 */
interface SupplierRemovalDialogState {
  open: boolean;
  suppliersToRemove: string[];
  affectedProductsCount: number;
  newSuppliers: string[];
}

/**
 * OrderFormContext で提供される値の型
 */
export interface OrderFormContextValue {
  // ===== 認証・ユーザー =====
  user: { uid: string; displayName?: string | null; email?: string | null } | null;
  userSettings: UserSettings | null;
  isOnline: boolean;

  // ===== フォーム (React Hook Form) =====
  form: UseFormReturn<OrderFormData>;
  productFields: FieldArrayWithId<OrderFormData, 'products', 'id'>[];
  appendProduct: UseFieldArrayReturn<OrderFormData, 'products'>['append'];
  removeProduct: UseFieldArrayReturn<OrderFormData, 'products'>['remove'];
  moveProduct: UseFieldArrayReturn<OrderFormData, 'products'>['move'];

  // ===== 監視データ =====
  suppliers: string[] | undefined;
  products: OrderFormData['products'] | undefined;
  deliveryDate: Date | null | undefined;

  // ===== ナビゲーション =====
  activeStep: number;
  setActiveStep: (step: number) => void;
  activeProductIndex: number;
  setActiveProductIndex: (index: number) => void;
  handlePrevStep: () => void;
  handleNextStep: () => void;

  // ===== モーダル状態 =====
  modalStates: {
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
    setBookNameDialog: (state: BookNameDialog) => void;
  };

  // ===== 商品操作 =====
  handleRemoveProduct: (index: number) => void;
  handleClearProduct: (index: number) => void;

  // ===== 配分操作 =====
  handleAllocationChange: (productIndex: number, storeIndex: number, value: number) => void;

  // ===== フォーム送信 =====
  onSubmit: (data: OrderFormData) => Promise<void>;
  handleBookNameDialogConfirm: () => Promise<void>;

  // ===== 下書き管理 =====
  draft: {
    restoreDialogOpen: boolean;
    handleRestoreDraft: () => void;
    handleDiscardDraft: () => void;
  };

  // ===== 帳合先管理 =====
  supplierManagement: {
    supplierRemovalDialog: SupplierRemovalDialogState;
    handleSuppliersChange: (newSuppliers: string[]) => string[];
    handleConfirmSupplierRemoval: () => void;
    handleCancelSupplierRemoval: () => void;
  };

  // ===== 送信・生成 =====
  submission: {
    generatedFiles: GeneratedFiles | null;
    setGeneratedFiles: Dispatch<SetStateAction<GeneratedFiles | null>>;
    excelBlob: Blob | null;
    setExcelBlob: Dispatch<SetStateAction<Blob | null>>;
    handleDownloadExcel: () => Promise<void>;
    handleDownloadPdf: () => Promise<void>;
  };

  // ===== オートコンプリート =====
  autocomplete: UseAutocompleteFieldsReturn;

  // ===== レイアウト =====
  setProgressSummaryHeight: (height: number) => void;
  showProgressSummary: boolean;
}

/**
 * OrderFormContext
 */
const OrderFormContext = createContext<OrderFormContextValue | null>(null);

/**
 * OrderFormProvider Props
 */
interface OrderFormProviderProps {
  children: ReactNode;
}

/**
 * OrderFormProvider
 *
 * 注文フォームに必要なすべての状態とハンドラーを提供するProvider
 *
 * 統合されるフック:
 * - useAuthContext
 * - useNotification
 * - useNavigationContext
 * - useAutocompleteFields
 * - useDataSync
 * - useUserSettings
 * - useOrderSubmit
 * - useOrderDraftManagement
 * - useSupplierManagement
 * - useOrderHandlers
 * - useStepNavigation
 * - Zustand Store hooks
 *
 * @example
 * ```tsx
 * <OrderFormProvider>
 *   <OrderFormContent />
 * </OrderFormProvider>
 * ```
 */
export const OrderFormProvider: React.FC<OrderFormProviderProps> = ({ children }) => {
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
  } = useOrderDraftManagement({
    user,
    methods,
    products,
    suppliers,
    deliveryDate,
  });

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
    products,
    suppliers,
    deliveryDate,
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
    [
      user,
      userSettings,
      isOnline,
      methods,
      productFields,
      appendProduct,
      removeProduct,
      moveProduct,
      suppliers,
      products,
      deliveryDate,
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

  return (
    <OrderFormContext.Provider value={contextValue}>
      <FormProvider {...methods}>{children}</FormProvider>
    </OrderFormContext.Provider>
  );
};

/**
 * useOrderFormContext
 *
 * OrderFormContextの値を取得するフック
 *
 * @throws OrderFormProvider外で使用された場合にエラー
 *
 * @example
 * ```tsx
 * const { form, activeStep, onSubmit } = useOrderFormContext();
 * ```
 */
export const useOrderFormContext = (): OrderFormContextValue => {
  const context = useContext(OrderFormContext);
  if (!context) {
    throw new Error('useOrderFormContext must be used within OrderFormProvider');
  }
  return context;
};

// ===== 便利なセレクターフック =====

/**
 * フォーム関連のみを取得
 */
export const useOrderForm = () => {
  const { form, productFields, appendProduct, removeProduct, moveProduct, suppliers, products, deliveryDate } =
    useOrderFormContext();
  return { form, productFields, appendProduct, removeProduct, moveProduct, suppliers, products, deliveryDate };
};

/**
 * ナビゲーション関連のみを取得
 */
export const useOrderNavigation = () => {
  const { activeStep, setActiveStep, activeProductIndex, setActiveProductIndex, handlePrevStep, handleNextStep } =
    useOrderFormContext();
  return { activeStep, setActiveStep, activeProductIndex, setActiveProductIndex, handlePrevStep, handleNextStep };
};

/**
 * 送信関連のみを取得
 */
export const useOrderSubmission = () => {
  const { onSubmit, handleBookNameDialogConfirm, submission } = useOrderFormContext();
  return { onSubmit, handleBookNameDialogConfirm, ...submission };
};

/**
 * オートコンプリート関連のみを取得
 */
export const useOrderAutocomplete = () => {
  const { autocomplete } = useOrderFormContext();
  return autocomplete;
};
