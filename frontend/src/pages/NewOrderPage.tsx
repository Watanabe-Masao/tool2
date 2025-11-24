import React, { useState } from 'react';
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
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { useDataSync } from '@/hooks/useDataSync';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useFormUIState } from '@/hooks/useFormUIState';
import { useOrderModals } from '@/hooks/useOrderModals';
import { useOrderSubmit } from '@/hooks/useOrderSubmit';
import { useOrderDraftManagement } from '@/hooks/useOrderDraftManagement';
import { useSupplierManagement } from '@/hooks/useSupplierManagement';
import { useOrderHandlers } from '@/hooks/useOrderHandlers';
import { useStepNavigation } from '@/hooks/useStepNavigation';
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

  const [activeStep, setActiveStep] = useState(0);

  const { user } = useAuthContext();
  const { showSuccess, showError, showLoading, hideLoading } = useNotification();
  const { setStepNavigation, showProgressSummary } = useNavigationContext();

  // オフライン同期
  const { isOnline, saveOrder: saveOrderWithSync } = useDataSync();

  // オートコンプリート
  const supplierAutocomplete = useAutocomplete('supplier');
  const productNameAutocomplete = useAutocomplete('productName');
  const originAutocomplete = useAutocomplete('origin');

  // ユーザー設定
  const userSettings = useUserSettings(user);

  // フォームUI状態管理
  const {
    activeProductIndex,
    setActiveProductIndex,
    lockedStores,
    setLockedStores,
    selectedCategories,
    setSelectedCategories,
    progressSummaryHeight,
    setProgressSummaryHeight,
  } = useFormUIState();

  // モーダル・ダイアログ状態管理
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
  } = useOrderModals();

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
    supplierAutocomplete,
    productNameAutocomplete,
    originAutocomplete,
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
    handleTabChange,
    handlePrevStep,
    handleNextStep,
    handleAllocationChange,
    handleToggleLock,
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

  return (
    <FormProvider {...methods}>
      {/* フォーム入力画面（Step 5がプレビューを含む） */}
      <Box sx={{ width: '100%', minHeight: '100vh', overflow: 'auto' }}>
          {/* オフライン時の警告 */}
          {!isOnline && (
            <Box sx={{ px: 2, pt: 2 }}>
              <Alert severity="warning">
                現在オフラインモードです。データはローカルに保存され、オンライン復帰時に自動的に同期されます。
              </Alert>
            </Box>
          )}

          {/* タブナビゲーション */}
          <OrderFormWithTabs
            activeStep={activeStep}
            handleTabChange={handleTabChange}
            setActiveStep={setActiveStep}
            isMobile={isMobile}
            progressSummaryHeight={progressSummaryHeight}
            control={control}
            errors={errors}
            productFields={productFields}
            appendProduct={appendProduct}
            removeProduct={removeProduct}
            moveProduct={moveProduct}
            handleSubmit={handleSubmit}
            supplierOptions={supplierAutocomplete.options}
            productNameOptions={productNameAutocomplete.options}
            originOptions={originAutocomplete.options}
            suppliers={suppliers || []}
            products={products || []}
            deliveryDate={deliveryDate}
            generatedFiles={generatedFiles}
            activeProductIndex={activeProductIndex}
            setActiveProductIndex={setActiveProductIndex}
            lockedStores={lockedStores}
            setLockedStores={setLockedStores}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            showGeneratedPreview={showGeneratedPreview}
            setShowGeneratedPreview={setShowGeneratedPreview}
            setGeneratedFiles={setGeneratedFiles}
            setExcelBlob={setExcelBlob}
            setShowEmailModal={setShowEmailModal}
            handleSuppliersChange={handleSuppliersChange}
            onSubmit={onSubmit}
            handleAllocationChange={handleAllocationChange}
            handleDownloadExcel={handleDownloadExcel}
            handleDownloadPdf={handleDownloadPdf}
          />
        </Box>

      {/* 注文関連ダイアログ */}
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

        {/* 注文関連モーダル */}
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

        {/* フローティング進捗サマリー */}
        {!showGeneratedPreview && (isMobile ? showProgressSummary : true) && (
          <FloatingProgressSummary
            formData={{
              deliveryDate: deliveryDate || new Date(),
              suppliers: suppliers || [],
              products: products || [],
            }}
            activeStep={activeStep}
            totalSteps={TOTAL_STEPS}
            activeProductIndex={activeStep >= 1 && activeStep <= 4 ? activeProductIndex : undefined}
            onProductChange={activeStep >= 1 && activeStep <= 4 ? setActiveProductIndex : undefined}
            onHeightChange={setProgressSummaryHeight}
            onRemoveProduct={handleRemoveProduct}
            onClearProduct={handleClearProduct}
            onPrevStep={activeStep > 0 ? handlePrevStep : undefined}
            onNextStep={activeStep < TOTAL_STEPS - 1 ? handleNextStep : undefined}
            onAllocationChange={activeStep === 4 ? handleAllocationChange : undefined}
            lockedStores={lockedStores}
            onToggleLock={activeStep === 4 ? handleToggleLock : undefined}
          />
        )}

    </FormProvider>
  );
};
