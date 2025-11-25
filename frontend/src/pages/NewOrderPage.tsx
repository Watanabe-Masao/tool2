import React, { useMemo } from 'react';
import { useForm, FormProvider, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Alert, useTheme, useMediaQuery } from '@mui/material';
import { orderFormSchema, type OrderFormData } from '@/schemas/orderSchema';
import { OrderDialogs } from '@/components/order/OrderDialogs';
import { OrderFormWithTabs } from '@/components/order/OrderFormWithTabs';
import { OrderModals } from '@/components/order/OrderModals';
import { FloatingProgressSummary } from '@/components/forms/FloatingProgressSummary';
import { useNotification } from '@/context/NotificationContext';
import { useAuthContext } from '@/context/AuthContext';
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

/**
 * フォームのステップ数
 */
const TOTAL_STEPS = 5;

/**
 * 新規注文作成ページ
 *
 * 5ステップのフォームで注文データを入力し、Excelテンプレートを生成します。
 *
 * ステップ:
 * 1. 店着日選択・帳合先入力
 * 2. 商品情報入力（品名、産地、規格、入数）
 * 3. 商品情報2入力（原価、売価、総納品数）
 * 4. 36店舗への配分入力
 * 5. 配分プレビュー・生成
 */
export const NewOrderPage: React.FC = () => {
  // テーマとメディアクエリ
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { user } = useAuthContext();
  const { showSuccess, showError, showLoading, hideLoading } = useNotification();
  const { setStepNavigation, showProgressSummary } = useNavigationContext();

  // オフライン同期
  const { isOnline, saveOrder: saveOrderWithSync } = useDataSync();

  // オートコンプリート（統合フック）
  const autocomplete = useAutocompleteFields();

  // ユーザー設定
  const userSettings = useUserSettings(user);

  // UI状態管理（Zustand Selector Hooks）
  const { activeStep, setActiveStep } = useActiveStep();
  const { activeProductIndex, setActiveProductIndex } = useActiveProductIndex();
  const { setLockedStores } = useStoreLocks();
  const setProgressSummaryHeight = useOrderFormStore((state) => state.setProgressSummaryHeight);

  // モーダル状態管理（Zustand Selector Hook）
  const {
    showPDFPreview,
    setShowPDFPreview,
    showDownloadModal,
    setShowDownloadModal,
    showPreviewModal,
    setShowPreviewModal,
    showEmailModal,
    setShowEmailModal,
    showGeneratedPreview,
    setShowGeneratedPreview,
    bookNameDialog,
    setBookNameDialog,
  } = useModalStates();

  // 注文送信ロジック
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

  /**
   * React Hook Form セットアップ
   */
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

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = methods;

  // フォームデータを監視（React#185対策: watch()を削除し、必要に応じてgetValues()を使用）
  // const formData = watch(); // ← これが全フォーム変更で再レンダリングを引き起こす原因！

  // 商品フィールド配列
  const { fields: productFields, append: appendProduct, remove: removeProduct, move: moveProduct } = useFieldArray({
    control,
    name: 'products',
  });

  // 帳合先を監視
  const suppliers = useWatch({
    control,
    name: 'suppliers',
  });

  // 商品データを監視（AllocationPreviewContent用）
  const products = useWatch({
    control,
    name: 'products',
  });

  // 店着日を監視
  const deliveryDate = useWatch({
    control,
    name: 'deliveryDate',
  });

  // 下書き管理ロジック
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

  // 帳合先管理ロジック
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

  // ハンドラー関数
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
  });

  // ステップナビゲーション管理
  useStepNavigation({
    activeStep,
    activeProductIndex,
    showGeneratedPreview,
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

  // React#185対策: FloatingProgressSummary用のformDataをメモ化
  const progressFormData = useMemo(() => ({
    deliveryDate: deliveryDate || new Date(),
    suppliers: suppliers || [],
    products: products || [],
  }), [deliveryDate, suppliers, products]);

  // React#185対策: 条件付きハンドラをメモ化
  const progressPrevStep = useMemo(
    () => (activeStep > 0 ? handlePrevStep : undefined),
    [activeStep, handlePrevStep]
  );
  const progressNextStep = useMemo(
    () => (activeStep < TOTAL_STEPS - 1 ? handleNextStep : undefined),
    [activeStep, handleNextStep]
  );
  const progressAllocationChange = useMemo(
    () => (activeStep === 4 ? handleAllocationChange : undefined),
    [activeStep, handleAllocationChange]
  );

  return (
    <FormProvider {...methods}>
      <Box sx={{ width: '100%', minHeight: '100vh', overflow: 'auto' }}>
          {!isOnline && (
            <Box sx={{ px: 2, pt: 2 }}>
              <Alert severity="warning">
                現在オフラインモードです。データはローカルに保存され、オンライン復帰時に自動的に同期されます。
              </Alert>
            </Box>
          )}
          <OrderFormWithTabs
            isMobile={isMobile}
            control={control}
            errors={errors}
            productFields={productFields}
            appendProduct={appendProduct}
            removeProduct={removeProduct}
            moveProduct={moveProduct}
            handleSubmit={handleSubmit}
            supplierOptions={autocomplete.supplierOptions}
            productNameOptions={autocomplete.productNameOptions}
            originOptions={autocomplete.originOptions}
            suppliers={suppliers || []}
            products={products || []}
            deliveryDate={deliveryDate}
            generatedFiles={generatedFiles}
            setGeneratedFiles={setGeneratedFiles}
            setExcelBlob={setExcelBlob}
            handleSuppliersChange={handleSuppliersChange}
            onSubmit={onSubmit}
            handleAllocationChange={handleAllocationChange}
            handleDownloadExcel={handleDownloadExcel}
            handleDownloadPdf={handleDownloadPdf}
          />
        </Box>
        <OrderDialogs
          bookNameDialog={bookNameDialog}
          onBookNameDialogChange={setBookNameDialog}
          onBookNameDialogConfirm={handleBookNameDialogConfirm}
          restoreDialogOpen={restoreDialogOpen}
          onRestoreDraft={handleRestoreDraft}
          onDiscardDraft={handleDiscardDraft}
          supplierRemovalDialog={supplierRemovalDialog}
          onConfirmSupplierRemoval={handleConfirmSupplierRemoval}
          onCancelSupplierRemoval={handleCancelSupplierRemoval}
        />
        <OrderModals
          generatedFiles={generatedFiles}
          excelBlob={excelBlob}
          userSettings={userSettings}
          user={user}
          deliveryDate={deliveryDate}
          suppliers={suppliers || []}
          products={products || []}
          showPDFPreview={showPDFPreview}
          onClosePDFPreview={() => setShowPDFPreview(false)}
          showDownloadModal={showDownloadModal}
          onCloseDownloadModal={() => setShowDownloadModal(false)}
          showPreviewModal={showPreviewModal}
          onClosePreviewModal={() => setShowPreviewModal(false)}
          showEmailModal={showEmailModal}
          onCloseEmailModal={() => setShowEmailModal(false)}
          onDownloadExcel={handleDownloadExcel}
          onSendEmail={() => setShowEmailModal(true)}
        />
        {!showGeneratedPreview && (isMobile ? showProgressSummary : true) && (
          <FloatingProgressSummary
            formData={progressFormData}
            totalSteps={TOTAL_STEPS}
            onHeightChange={setProgressSummaryHeight}
            onRemoveProduct={handleRemoveProduct}
            onClearProduct={handleClearProduct}
            onPrevStep={progressPrevStep}
            onNextStep={progressNextStep}
            onAllocationChange={progressAllocationChange}
          />
        )}

    </FormProvider>
  );
};
