import React, { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Container, Box, Alert, Tabs, Tab, useTheme, useMediaQuery } from '@mui/material';
import { OrderDialogs } from '@/components/order/OrderDialogs';
import { OrderFormSteps } from '@/components/order/OrderFormSteps';
import { OrderModals } from '@/components/order/OrderModals';
import { orderFormSchema } from '@/schemas/orderSchema';
import type { OrderFormData } from '@/schemas/orderSchema';
import { FloatingProgressSummary } from '@/components/forms/FloatingProgressSummary';
import { UserSettingsService } from '@/services/firebase/userSettingsService';
import type { UserSettings } from '@/types/userSettings';
import { useNotification } from '@/context/NotificationContext';
import { useAuthContext } from '@/context/AuthContext';
import { useNavigationContext } from '@/context/NavigationContext';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { useDataSync } from '@/hooks/useDataSync';
import { useOrderSubmit } from '@/hooks/useOrderSubmit';
import { useSupplierManagement } from '@/hooks/useSupplierManagement';
import { useOrderDraftManagement } from '@/hooks/useOrderDraftManagement';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';
import { SessionStorageService } from '@/utils/sessionStorageService';

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
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showGeneratedPreview, setShowGeneratedPreview] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [bookNameDialog, setBookNameDialog] = useState<{
    open: boolean;
    bookName: string;
  }>({ open: false, bookName: '' });

  // 店舗のロック状態（商品別、ステップ4とステップ5で共有）
  // Map<商品インデックス, Set<店舗コード>>
  const [lockedStores, setLockedStores] = useState<Map<number, Set<string>>>(new Map());

  // カテゴリフィルター（商品別、ステップ4とステップ5で共有）
  // Map<商品インデックス, Set<カテゴリコード>>
  const [selectedCategories, setSelectedCategories] = useState<Map<number, Set<string>>>(new Map());

  // 現在編集中の商品インデックス（ステップ2-4で使用）
  const [activeProductIndex, setActiveProductIndex] = useState(0);

  // FloatingProgressSummaryの高さ
  const [progressSummaryHeight, setProgressSummaryHeight] = useState(0);

  const { user } = useAuthContext();
  const { showSuccess, showError, showLoading, hideLoading } = useNotification();
  const { setStepNavigation, showProgressSummary } = useNavigationContext();

  // オフライン同期
  const { isOnline, saveOrder: saveOrderWithSync } = useDataSync();

  // オートコンプリート
  const supplierAutocomplete = useAutocomplete('supplier');
  const productNameAutocomplete = useAutocomplete('productName');
  const originAutocomplete = useAutocomplete('origin');

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
    reset,
    setValue,
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

  /**
   * 商品削除ハンドラー（FloatingProgressSummary用）
   */
  const handleRemoveProduct = (index: number) => {
    if (productFields.length <= 1) return; // 最後の1つは削除しない
    removeProduct(index);
    // アクティブなインデックスを調整
    if (activeProductIndex >= index && activeProductIndex > 0) {
      setActiveProductIndex(activeProductIndex - 1);
    }
  };

  /**
   * 商品フィールドクリアハンドラー（FloatingProgressSummary用）
   */
  const handleClearProduct = (index: number) => {
    const defaultSupplier = suppliers && suppliers.length > 0 ? suppliers[0] : '';
    setValue(`products.${index}.categoryCode`, '');
    setValue(`products.${index}.supplier`, defaultSupplier);
    setValue(`products.${index}.name`, '');
    setValue(`products.${index}.origin`, '');
    setValue(`products.${index}.specification`, '');
    setValue(`products.${index}.quantityPerPackage`, null);
    setValue(`products.${index}.unit`, '');
  };

  /**
   * ユーザー設定を読み込み
   */
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user) return;

      try {
        const settings = await UserSettingsService.getOrCreate(user.uid);
        setUserSettings(settings);
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };

    loadUserSettings();
  }, [user]);

  /**
   * タブ変更時の処理
   */
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveStep(newValue);
  };

  /**
   * 前のステップへ移動
   */
  const handlePrevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  /**
   * 次のステップへ移動
   */
  const handleNextStep = () => {
    if (activeStep < TOTAL_STEPS - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  /**
   * NavigationContextを更新（ステップナビゲーション表示状態）
   * React#185対策: formDataを直接監視せず、getValues()を使用
   */
  useEffect(() => {
    // 生成後のプレビュー表示中はステップナビゲーションを非アクティブに
    if (showGeneratedPreview) {
      setStepNavigation(false);
    } else {
      // フォーム入力中はステップナビゲーションをアクティブに
      // ステップ2-4では商品インデックスと商品切り替えハンドラーも渡す
      const isProductMode = activeStep >= 1 && activeStep <= 3;
      const currentFormData = getValues();
      setStepNavigation(
        true,
        activeStep,
        TOTAL_STEPS,
        currentFormData,
        isProductMode ? activeProductIndex : undefined,
        activeStep > 0 ? handlePrevStep : undefined,
        activeStep < TOTAL_STEPS - 1 ? handleNextStep : undefined,
        isProductMode ? setActiveProductIndex : undefined
      );
    }

    // コンポーネントがアンマウントされる時にステップナビゲーションを非アクティブに
    return () => {
      setStepNavigation(false);
    };
  }, [activeStep, activeProductIndex, showGeneratedPreview, products, suppliers, deliveryDate]);

  /**
   * プレビュー画面での配分数量変更ハンドラ（React#185対策: メモ化）
   */
  const handleAllocationChange = useCallback((productIndex: number, storeIndex: number, newValue: number) => {
    setValue(`products.${productIndex}.storeAllocations.${storeIndex}`, newValue, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [setValue]);

  /**
   * ロック状態切り替えハンドラ（FloatingProgressSummary用）
   */
  const handleToggleLock = useCallback((productIndex: number, storeCode: string) => {
    setLockedStores(prev => {
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
  }, []);

  /**
   * フォーム送信
   */
  const onSubmit = async (data: OrderFormData) => {
    await submitOrder(
      data,
      () => setBookNameDialog({ open: true, bookName: '' })
    );
  };

  /**
   * ブック名ダイアログの確認ハンドラー
   */
  const handleBookNameDialogConfirm = async () => {
    const data = getValues();

    // ダイアログを閉じる
    setBookNameDialog({ open: false, bookName: '' });

    // テンプレート生成
    const success = await handleGenerateTemplate(data, bookNameDialog.bookName, setHasUnsavedChanges);

    // 成功時にプレビュー画面を表示
    if (success) {
      setShowGeneratedPreview(true);
    }
  };

  /**
   * 下書きを復元
   */
  const handleRestoreDraft = () => {
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
  };

  /**
   * 下書きを破棄
   */
  const handleDiscardDraft = () => {
    if (!user) return;

    SessionStorageService.clearDraft(user.uid);
    setRestoreDialogOpen(false);
  };

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
          <Container maxWidth="lg">
            <Box sx={{ width: '100%', py: 2 }}>
              <Tabs
                value={activeStep}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
              >
                <Tab label="店着日・帳合先" />
                <Tab label="商品情報" />
                <Tab label="価格・数量" />
                <Tab label="店舗配分" />
                <Tab label="プレビュー" />
              </Tabs>

              {/* コンテンツエリア（スクロール可能） */}
              <Box sx={{
                // ヘッダー(64px/56px) + Tabs(48px) + Margin(16px) + FloatingProgressSummary (desktop only)
                height: `calc(100vh - ${isMobile ? '120px' : '128px'} - ${isMobile ? 0 : progressSummaryHeight}px)`,
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#888',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: '#555',
                },
              }}>
                <OrderFormSteps
                  activeStep={activeStep}
                  control={control}
                  errors={errors}
                  productFields={productFields}
                  appendProduct={appendProduct}
                  removeProduct={removeProduct}
                  moveProduct={moveProduct}
                  supplierOptions={supplierAutocomplete.options}
                  onSuppliersChange={handleSuppliersChange}
                  productNameOptions={productNameAutocomplete.options}
                  originOptions={originAutocomplete.options}
                  suppliers={suppliers || []}
                  activeProductIndex={activeProductIndex}
                  onProductIndexChange={setActiveProductIndex}
                  onNavigateToStep={setActiveStep}
                  lockedStores={lockedStores}
                  setLockedStores={setLockedStores}
                  selectedCategories={selectedCategories}
                  setSelectedCategories={setSelectedCategories}
                  showGeneratedPreview={showGeneratedPreview}
                  deliveryDate={deliveryDate}
                  products={products || []}
                  generatedFiles={generatedFiles}
                  onSubmit={handleSubmit(onSubmit)}
                  onAllocationChange={handleAllocationChange}
                  onDownloadExcel={handleDownloadExcel}
                  onDownloadPdf={handleDownloadPdf}
                  onSendEmail={() => setShowEmailModal(true)}
                  onBackToEdit={() => {
                    setShowGeneratedPreview(false);
                    setGeneratedFiles(null);
                    setExcelBlob(null);
                  }}
                />
              </Box>
            </Box>
          </Container>
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
