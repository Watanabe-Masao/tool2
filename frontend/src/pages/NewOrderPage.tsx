import React, { useMemo, useCallback, useState } from 'react';
import { Box, Alert, useTheme, useMediaQuery, Dialog, DialogContent, DialogActions, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { OrderDialogs } from '@/components/order/OrderDialogs';
import { OrderFormWithTabs } from '@/components/order/OrderFormWithTabs';
import { OrderModals } from '@/components/order/OrderModals';
import { FloatingProgressSummary } from '@/components/forms/FloatingProgressSummary';
import {
  OrderFormProvider,
  useOrderFormContext,
  TOTAL_STEPS,
} from '@/context/OrderFormContext';
import { useAllocationHistorySave } from '@/hooks/useAllocationHistorySave';
import { useOrderFormStore } from '@/stores/orderFormStore';
import { AllocationHistoryPage } from '@/pages/AllocationHistoryPage';
import { UserProfilePage } from '@/pages/UserProfilePage';
import { StoreCategoryManagementPage } from '@/pages/StoreCategoryManagementPage';
import { MODAL_Z_INDEX } from '@/constants/zIndex';

/**
 * 新規注文フォームのコンテンツ
 *
 * OrderFormContextからすべての状態とハンドラーを取得
 */
const OrderFormContent: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // モーダル状態（Zustand）
  const showAllocationHistoryModal = useOrderFormStore((state) => state.showAllocationHistoryModal);
  const setShowAllocationHistoryModal = useOrderFormStore((state) => state.setShowAllocationHistoryModal);
  const showUserProfileModal = useOrderFormStore((state) => state.showUserProfileModal);
  const setShowUserProfileModal = useOrderFormStore((state) => state.setShowUserProfileModal);
  const showStoreManagementModal = useOrderFormStore((state) => state.showStoreManagementModal);
  const setShowStoreManagementModal = useOrderFormStore((state) => state.setShowStoreManagementModal);

  // 配分履歴保存フック
  const { saveHistory, isSaving } = useAllocationHistorySave();
  const [isHistorySaved, setIsHistorySaved] = useState(false);

  const {
    // 認証・ユーザー
    user,
    userSettings,
    isOnline,

    // フォーム
    form,
    productFields,
    appendProduct,
    removeProduct: removeProductFromArray,
    moveProduct,

    // 監視データ
    suppliers,
    products,
    deliveryDate,

    // ナビゲーション
    activeStep,
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
    draft,

    // 帳合先管理
    supplierManagement,

    // 送信・生成
    submission,

    // オートコンプリート
    autocomplete,

    // レイアウト
    setProgressSummaryHeight,
    showProgressSummary,
  } = useOrderFormContext();

  const { control, handleSubmit, formState: { errors } } = form;

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

  // 配分履歴保存ハンドラ
  const handleSaveHistory = useCallback(async () => {
    if (!deliveryDate || !suppliers || !products || !submission.generatedFiles) return;

    const formData = {
      deliveryDate,
      suppliers,
      products,
    };

    // バイヤー名を取得（UserSettings > ユーザー名 > メールアドレス > '匿名'）
    const buyerName = userSettings?.buyerName?.trim() || user?.displayName || user?.email || '匿名';

    // ブック名を取得（生成されたファイル名）
    const bookName = submission.generatedFiles.filename;

    const batchId = await saveHistory(formData, buyerName, bookName);
    if (batchId) {
      setIsHistorySaved(true);
    }
  }, [deliveryDate, suppliers, products, submission.generatedFiles, userSettings, user, saveHistory]);

  return (
    <>
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
          removeProduct={removeProductFromArray}
          moveProduct={moveProduct}
          handleSubmit={handleSubmit}
          supplierOptions={autocomplete.supplierOptions}
          productNameOptions={autocomplete.productNameOptions}
          originOptions={autocomplete.originOptions}
          suppliers={suppliers || []}
          products={products || []}
          deliveryDate={deliveryDate ?? null}
          generatedFiles={submission.generatedFiles}
          setGeneratedFiles={submission.setGeneratedFiles}
          setExcelBlob={submission.setExcelBlob}
          handleSuppliersChange={supplierManagement.handleSuppliersChange}
          onSubmit={onSubmit}
          handleAllocationChange={handleAllocationChange}
          handleDownloadExcel={submission.handleDownloadExcel}
          handleDownloadPdf={submission.handleDownloadPdf}
          onSaveHistory={handleSaveHistory}
          isSavingHistory={isSaving}
          isHistorySaved={isHistorySaved}
        />
      </Box>

      <OrderDialogs
        bookNameDialog={modalStates.bookNameDialog}
        onBookNameDialogChange={modalStates.setBookNameDialog}
        onBookNameDialogConfirm={handleBookNameDialogConfirm}
        restoreDialogOpen={draft.restoreDialogOpen}
        onRestoreDraft={draft.handleRestoreDraft}
        onDiscardDraft={draft.handleDiscardDraft}
        supplierRemovalDialog={supplierManagement.supplierRemovalDialog}
        onConfirmSupplierRemoval={supplierManagement.handleConfirmSupplierRemoval}
        onCancelSupplierRemoval={supplierManagement.handleCancelSupplierRemoval}
      />

      <OrderModals
        generatedFiles={submission.generatedFiles}
        excelBlob={submission.excelBlob}
        userSettings={userSettings}
        user={user}
        deliveryDate={deliveryDate ?? null}
        suppliers={suppliers || []}
        products={products || []}
        showPDFPreview={modalStates.showPDFPreview}
        onClosePDFPreview={() => modalStates.setShowPDFPreview(false)}
        showDownloadModal={modalStates.showDownloadModal}
        onCloseDownloadModal={() => modalStates.setShowDownloadModal(false)}
        showPreviewModal={modalStates.showPreviewModal}
        onClosePreviewModal={() => modalStates.setShowPreviewModal(false)}
        showEmailModal={modalStates.showEmailModal}
        onCloseEmailModal={() => modalStates.setShowEmailModal(false)}
        onDownloadExcel={submission.handleDownloadExcel}
        onSendEmail={() => modalStates.setShowEmailModal(true)}
      />

      {!modalStates.showGeneratedPreview && (isMobile ? showProgressSummary : true) && (
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

      {/* 配分履歴モーダル */}
      <Dialog
        open={showAllocationHistoryModal}
        onClose={() => setShowAllocationHistoryModal(false)}
        maxWidth="xl"
        fullWidth
        fullScreen={isMobile}
        sx={{ zIndex: MODAL_Z_INDEX.PAGE_MODAL }}
        PaperProps={{
          sx: {
            display: 'flex',
            flexDirection: 'column',
            height: isMobile ? '100%' : 'auto',
          },
        }}
      >
        <DialogContent sx={{ flex: 1, overflow: 'auto' }}>
          <AllocationHistoryPage />
        </DialogContent>
        <DialogActions sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          position: 'sticky',
          bottom: 0,
        }}>
          <Button
            onClick={() => setShowAllocationHistoryModal(false)}
            variant="contained"
            color="primary"
            startIcon={<ArrowBack />}
          >
            戻る
          </Button>
        </DialogActions>
      </Dialog>

      {/* ユーザープロフィールモーダル */}
      <Dialog
        open={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        sx={{ zIndex: MODAL_Z_INDEX.PAGE_MODAL }}
        PaperProps={{
          sx: {
            display: 'flex',
            flexDirection: 'column',
            height: isMobile ? '100%' : 'auto',
          },
        }}
      >
        <DialogContent sx={{ flex: 1, overflow: 'auto' }}>
          <UserProfilePage />
        </DialogContent>
        <DialogActions sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          position: 'sticky',
          bottom: 0,
        }}>
          <Button
            onClick={() => setShowUserProfileModal(false)}
            variant="contained"
            color="primary"
            startIcon={<ArrowBack />}
          >
            戻る
          </Button>
        </DialogActions>
      </Dialog>

      {/* 各種管理モーダル */}
      <Dialog
        open={showStoreManagementModal}
        onClose={() => setShowStoreManagementModal(false)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        sx={{ zIndex: MODAL_Z_INDEX.PAGE_MODAL }}
        PaperProps={{
          sx: {
            display: 'flex',
            flexDirection: 'column',
            height: isMobile ? '100%' : 'auto',
          },
        }}
      >
        <DialogContent sx={{ flex: 1, overflow: 'auto' }}>
          <StoreCategoryManagementPage />
        </DialogContent>
        <DialogActions sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          position: 'sticky',
          bottom: 0,
        }}>
          <Button
            onClick={() => setShowStoreManagementModal(false)}
            variant="contained"
            color="primary"
            startIcon={<ArrowBack />}
          >
            戻る
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

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
 *
 * アーキテクチャ:
 * - OrderFormProviderがすべてのフォーム状態とハンドラーを提供
 * - OrderFormContentがUIをレンダリング
 * - 関心の分離により、テスト・保守が容易
 */
export const NewOrderPage: React.FC = () => {
  return (
    <OrderFormProvider>
      <OrderFormContent />
    </OrderFormProvider>
  );
};
