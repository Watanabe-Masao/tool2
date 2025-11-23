import React, { useState, useRef, useEffect } from 'react';
import { useForm, FormProvider, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Container, Box, Alert, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Tabs, Tab } from '@mui/material';
import { orderFormSchema } from '@/schemas/orderSchema';
import type { OrderFormData } from '@/schemas/orderSchema';
import { DeliveryDateForm } from '@/components/forms/DeliveryDateForm';
import { ProductBasicInfoForm } from '@/components/forms/ProductBasicInfoForm';
import { ProductPricingForm } from '@/components/forms/ProductPricingForm';
import { StoreAllocationForm } from '@/components/forms/StoreAllocationForm';
import { FloatingProgressSummary } from '@/components/forms/FloatingProgressSummary';
import { PDFPreviewModal } from '@/components/modals/PDFPreviewModal';
import { DownloadModal } from '@/components/modals/DownloadModal';
import { AllocationPreviewModal } from '@/components/AllocationPreviewModal';
import { AllocationPreviewContent } from '@/components/AllocationPreviewContent';
import { EmailSendModal } from '@/components/modals/EmailSendModal';
import { TemplateService } from '@/services/api/templateService';
import { FirestoreService } from '@/services/firebase/firestoreService';
import { UserSettingsService } from '@/services/firebase/userSettingsService';
import type { UserSettings } from '@/types/userSettings';
import { useNotification } from '@/context/NotificationContext';
import { useAuthContext } from '@/context/AuthContext';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { useDataSync } from '@/hooks/useDataSync';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';
import { SessionStorageService } from '@/utils/sessionStorageService';
import { format } from 'date-fns';

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
  const [activeStep, setActiveStep] = useState(0);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showGeneratedPreview, setShowGeneratedPreview] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<{
    filename: string;
    downloadUrl: string;
    pdfFilename?: string;
  } | null>(null);
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [supplierRemovalDialog, setSupplierRemovalDialog] = useState<{
    open: boolean;
    suppliersToRemove: string[];
    affectedProductsCount: number;
    newSuppliers: string[];
  }>({
    open: false,
    suppliersToRemove: [],
    affectedProductsCount: 0,
    newSuppliers: [],
  });

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

  // 自動保存用のタイマー
  const autoSaveTimer = useRef<number | null>(null);

  // 初回ロードフラグ
  const isInitialLoad = useRef(true);

  // 前回の帳合先リスト
  const previousSuppliers = useRef<string[]>([]);

  const { user } = useAuthContext();
  const { showSuccess, showError, showLoading, hideLoading } = useNotification();

  // オフライン同期
  const { isOnline, saveOrder: saveOrderWithSync } = useDataSync();

  // オートコンプリート
  const supplierAutocomplete = useAutocomplete('supplier');
  const productNameAutocomplete = useAutocomplete('productName');
  const originAutocomplete = useAutocomplete('origin');

  /**
   * React Hook Form セットアップ
   */
  const methods = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      deliveryDate: new Date(),
      customBookName: '',
      buyerName: '',
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
    watch,
    reset,
    setValue,
    formState: { errors },
  } = methods;

  // フォームデータを監視
  const formData = watch();

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
   * ページロード時に下書きを復元
   */
  useEffect(() => {
    if (!user || !isInitialLoad.current) return;

    isInitialLoad.current = false;

    const draft = SessionStorageService.loadDraft(user.uid);
    if (draft) {
      setRestoreDialogOpen(true);
    }
  }, [user]);

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
   * 帳合先変更時のハンドラー
   */
  const handleSuppliersChange = (newSuppliers: string[]) => {
    // 最新の商品データを取得
    const currentProducts = methods.getValues('products');

    // 初回ロード時や商品がない場合はそのまま適用
    if (isInitialLoad.current || !currentProducts || currentProducts.length === 0) {
      previousSuppliers.current = newSuppliers;
      return newSuppliers;
    }

    const currentSuppliers = suppliers || [];

    // 削除される帳合先を検出
    const removedSuppliers = currentSuppliers.filter(
      (supplier) => !newSuppliers.includes(supplier)
    );

    if (removedSuppliers.length > 0) {
      // 削除される帳合先を使用している商品を検出
      const affectedProducts = currentProducts.filter(
        (product) => product.supplier && removedSuppliers.includes(product.supplier)
      );

      if (affectedProducts.length > 0) {
        // 確認ダイアログを表示
        setSupplierRemovalDialog({
          open: true,
          suppliersToRemove: removedSuppliers,
          affectedProductsCount: affectedProducts.length,
          newSuppliers,
        });
        // 変更を保留
        return currentSuppliers;
      }
    }

    // 問題ない場合はそのまま適用
    previousSuppliers.current = newSuppliers;
    return newSuppliers;
  };

  /**
   * 帳合先削除の確認
   */
  const handleConfirmSupplierRemoval = () => {
    const { suppliersToRemove, newSuppliers, affectedProductsCount } = supplierRemovalDialog;

    // 最新の商品データを取得
    const currentProducts = methods.getValues('products');

    // 削除される帳合先を使用していない商品のみを残す
    const remainingProducts = currentProducts.filter(
      (product) => !product.supplier || !suppliersToRemove.includes(product.supplier)
    );

    // 残った商品がない場合は、デフォルトの空の商品を1つ追加
    const newProducts = remainingProducts.length > 0
      ? remainingProducts
      : [{
          ...DEFAULT_PRODUCT_FORM_DATA,
          totalDelivery: 0,
          storeAllocations: new Array(STORE_COUNT).fill(0),
        }];

    // 商品配列を更新
    methods.setValue('products', newProducts);

    // 帳合先を更新
    methods.setValue('suppliers', newSuppliers);
    previousSuppliers.current = newSuppliers;

    // メッセージを表示
    const removedSupplierNames = suppliersToRemove.join('、');
    showSuccess(
      `帳合先「${removedSupplierNames}」を削除し、関連する商品カード${affectedProductsCount}件を削除しました`
    );

    // ダイアログを閉じる
    setSupplierRemovalDialog({
      open: false,
      suppliersToRemove: [],
      affectedProductsCount: 0,
      newSuppliers: [],
    });
  };

  /**
   * 帳合先削除のキャンセル
   */
  const handleCancelSupplierRemoval = () => {
    setSupplierRemovalDialog({
      open: false,
      suppliersToRemove: [],
      affectedProductsCount: 0,
      newSuppliers: [],
    });
  };

  /**
   * フォームデータの自動保存（debounce付き）
   */
  useEffect(() => {
    if (!user || isInitialLoad.current) return;

    // 変更があることをマーク
    setHasUnsavedChanges(true);

    // 既存のタイマーをクリア
    if (autoSaveTimer.current) {
      window.clearTimeout(autoSaveTimer.current);
    }

    // 2秒後に自動保存
    autoSaveTimer.current = window.setTimeout(() => {
      SessionStorageService.saveDraft(user.uid, formData);
      console.log('Form auto-saved');
    }, 2000);

    return () => {
      if (autoSaveTimer.current) {
        window.clearTimeout(autoSaveTimer.current);
      }
    };
  }, [formData, user]);

  /**
   * ページ離脱時の警告
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  /**
   * タブ変更時の処理
   */
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveStep(newValue);
  };

  /**
   * ExcelファイルをBlobとして取得
   */
  const fetchExcelAsBlob = async (url: string): Promise<Blob> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Excelファイルの取得に失敗しました');
    }
    return await response.blob();
  };

  /**
   * プレビュー画面での配分数量変更ハンドラ
   */
  const handleAllocationChange = (productIndex: number, storeIndex: number, newValue: number) => {
    setValue(`products.${productIndex}.storeAllocations.${storeIndex}`, newValue, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  /**
   * フォーム送信
   */
  const onSubmit = async (data: OrderFormData) => {
    try {
      showLoading();

      console.log('Form data:', data);

      // バリデーション: すべての商品の帳合先がステップ1で選択された帳合先リストに含まれているかチェック
      const invalidProducts = data.products.filter(
        (product) => !data.suppliers.includes(product.supplier)
      );

      if (invalidProducts.length > 0) {
        hideLoading();
        showError(
          `一部の商品の帳合先がステップ1で選択されていません。` +
          `該当する商品の帳合先を修正してください。`
        );
        return;
      }

      // バイヤー名を取得（カスタム入力 > ユーザー名 > メールアドレス > '匿名'）
      const buyerName = data.buyerName?.trim() || user?.displayName || user?.email || '匿名';

      // オフライン同期を使用してデータを保存
      // オンライン時: Firestore + API呼び出し
      // オフライン時: IndexedDBのみ
      await saveOrderWithSync(data, buyerName);

      // オートコンプリート履歴に追加
      if (user) {
        // 複数の帳合先を履歴に追加
        for (const supplier of data.suppliers) {
          await supplierAutocomplete.addToHistory(supplier);
        }

        for (const product of data.products) {
          await productNameAutocomplete.addToHistory(product.name);
          await originAutocomplete.addToHistory(product.origin);

          // 商品履歴を保存（各商品の帳合先ごとに）
          await FirestoreService.saveProductHistory(
            user.uid,
            product.supplier,
            product.name,
            product.origin,
            product.specification || '',
            product.quantityPerPackage ?? null,
            product.unit || '',
            product.categoryCode
          );

          // 価格履歴を保存（商品名・規格・入数をキーとして）
          if (
            product.centerCost &&
            product.storeCost &&
            product.priceExcludingTax &&
            product.quantityPerPackage
          ) {
            await FirestoreService.savePricingHistory(
              user.uid,
              product.name,
              product.specification || '',
              product.quantityPerPackage,
              product.unit || '',
              product.centerCost,
              product.storeCost,
              product.priceExcludingTax,
              product.centerFeeRate
            );
          }
        }
      }

      // オンライン時のみテンプレート生成API呼び出し
      if (isOnline) {
        // カスタムファイル名を生成（配分表_{customName}_{YYYYMMDD}）
        const dateStr = format(data.deliveryDate, 'yyyyMMdd');
        const customName = data.customBookName?.trim() || '';
        const customFilename = customName ? `配分表_${customName}_${dateStr}` : `配分表_${dateStr}`;

        const response = await TemplateService.generateTemplate(data, buyerName, customFilename);

        console.log('Template generated:', response);

        // 生成されたファイル情報を保存
        setGeneratedFiles({
          filename: response.filename,
          downloadUrl: response.download_url,
          pdfFilename: response.pdf_filename,
        });

        // ExcelファイルをBlobとして取得（メール送信用）
        try {
          const blob = await fetchExcelAsBlob(response.download_url);
          setExcelBlob(blob);
          console.log('Excel blob fetched successfully');
        } catch (err) {
          console.error('Failed to fetch Excel blob:', err);
          // Blobの取得に失敗してもテンプレート生成は成功しているので続行
        }

        hideLoading();

        // 成功メッセージ
        showSuccess('テンプレートを生成しました');

        // SessionStorageの下書きをクリア（成功時）
        if (user) {
          SessionStorageService.clearDraft(user.uid);
          setHasUnsavedChanges(false);
        }

        // プレビュー画面を表示
        setShowGeneratedPreview(true);
      } else {
        // オフライン時
        hideLoading();
        showSuccess('データをローカルに保存しました。オンライン復帰時に自動同期されます。');

        // オフライン時もSessionStorageの下書きをクリア
        if (user) {
          SessionStorageService.clearDraft(user.uid);
          setHasUnsavedChanges(false);
        }
      }
    } catch (error) {
      hideLoading();
      console.error('Template generation error:', error);
      showError(error instanceof Error ? error.message : 'テンプレートの生成に失敗しました');
    }
  };

  /**
   * 現在のステップのコンテンツを返す
   */
  /**
   * Excelファイルをダウンロード
   */
  const handleDownloadExcel = () => {
    if (generatedFiles) {
      // TemplateService.getDownloadUrl()を使用して絶対URLを取得
      // Firebase HostingからRender.com APIへのアクセスに対応
      const fileId = generatedFiles.downloadUrl.split('/').pop()?.split('?')[0] || '';
      const downloadUrl = TemplateService.getDownloadUrl(fileId, 'xlsx');

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = generatedFiles.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  /**
   * PDFファイルをダウンロード
   */
  const handleDownloadPdf = async () => {
    if (generatedFiles && generatedFiles.pdfFilename) {
      try {
        showLoading();
        const pdfUrl = TemplateService.getPdfPreviewUrl(generatedFiles.pdfFilename);

        // PDFをfetchしてblobとして取得
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          throw new Error('PDFのダウンロードに失敗しました');
        }

        const blob = await response.blob();

        // Blobからダウンロードリンクを作成
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `配分表_${format(formData.deliveryDate || new Date(), 'yyyyMMdd')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Blob URLをクリーンアップ
        window.URL.revokeObjectURL(blobUrl);

        hideLoading();
        showSuccess('PDFをダウンロードしました');
      } catch (error) {
        hideLoading();
        console.error('PDF download error:', error);
        showError(error instanceof Error ? error.message : 'PDFのダウンロードに失敗しました');
      }
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
            <Box sx={{ width: '100%', py: 2, pb: `${progressSummaryHeight + 16}px` }}>
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

              {/* Step 1: 店着日・帳合先 */}
              {activeStep === 0 && (
                <Box sx={{ py: 2 }}>
                  <DeliveryDateForm
                    control={control}
                    errors={errors}
                    supplierOptions={supplierAutocomplete.options}
                    onSuppliersChange={handleSuppliersChange}
                  />
                </Box>
              )}

              {/* Step 2: 商品情報（基本） */}
              {activeStep === 1 && (
                <Box sx={{ py: 2 }}>
                  <ProductBasicInfoForm
                    control={control}
                    errors={errors}
                    productNameOptions={productNameAutocomplete.options}
                    originOptions={originAutocomplete.options}
                    suppliers={formData.suppliers}
                    fields={productFields}
                    append={appendProduct}
                    remove={removeProduct}
                    move={moveProduct}
                    onNavigateToStep={setActiveStep}
                    activeProductIndex={activeProductIndex}
                    onProductIndexChange={setActiveProductIndex}
                  />
                </Box>
              )}

              {/* Step 3: 商品情報2（価格・総納品数） */}
              {activeStep === 2 && (
                <Box sx={{ py: 2 }}>
                  <ProductPricingForm
                    control={control}
                    errors={errors}
                    fields={productFields}
                    activeProductIndex={activeProductIndex}
                    onProductIndexChange={setActiveProductIndex}
                  />
                </Box>
              )}

              {/* Step 4: 店舗配分 */}
              {activeStep === 3 && (
                <Box sx={{ py: 2 }}>
                  <StoreAllocationForm
                    control={control}
                    errors={errors}
                    fields={productFields}
                    lockedStores={lockedStores}
                    setLockedStores={setLockedStores}
                    selectedCategories={selectedCategories}
                    setSelectedCategories={setSelectedCategories}
                    activeProductIndex={activeProductIndex}
                    onProductIndexChange={setActiveProductIndex}
                  />
                </Box>
              )}

              {/* Step 5: プレビュー・生成 */}
              {activeStep === 4 && (
                <Box sx={{ py: 2 }}>
                  {!showGeneratedPreview ? (
                    /* 生成前のプレビュー */
                    <AllocationPreviewContent
                      formData={formData}
                      pdfFilename={undefined}
                      onGenerate={handleSubmit(onSubmit)}
                      onAllocationChange={handleAllocationChange}
                      lockedStores={lockedStores}
                      setLockedStores={setLockedStores}
                      selectedCategories={selectedCategories}
                      setSelectedCategories={setSelectedCategories}
                    />
                  ) : (
                    /* 生成後のプレビュー */
                    generatedFiles && (
                      <AllocationPreviewContent
                        formData={formData}
                        pdfFilename={generatedFiles.pdfFilename}
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadPdf={handleDownloadPdf}
                        onSendEmail={() => setShowEmailModal(true)}
                        onBack={() => {
                          setShowGeneratedPreview(false);
                          setGeneratedFiles(null);
                          setExcelBlob(null);
                        }}
                        onAllocationChange={handleAllocationChange}
                        lockedStores={lockedStores}
                        setLockedStores={setLockedStores}
                        selectedCategories={selectedCategories}
                        setSelectedCategories={setSelectedCategories}
                      />
                    )
                  )}
                </Box>
              )}
            </Box>
          </Container>
        </Box>

      {/* PDFプレビューモーダル */}
        {generatedFiles && generatedFiles.pdfFilename && (
          <PDFPreviewModal
            open={showPDFPreview}
            onClose={() => setShowPDFPreview(false)}
            pdfUrl={TemplateService.getPdfPreviewUrl(generatedFiles.pdfFilename)}
            onDownloadExcel={handleDownloadExcel}
            onSendEmail={() => setShowEmailModal(true)}
          />
        )}

        {/* ダウンロードモーダル（iPhone Safari用） */}
        {generatedFiles && (
          <DownloadModal
            open={showDownloadModal}
            onClose={() => setShowDownloadModal(false)}
            downloadUrl={generatedFiles.downloadUrl}
            filename={generatedFiles.filename}
            onSendEmail={() => setShowEmailModal(true)}
          />
        )}

        {/* 配分表プレビューモーダル */}
        <AllocationPreviewModal
          open={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          formData={formData}
          pdfFilename={generatedFiles?.pdfFilename}
          onDownloadExcel={handleDownloadExcel}
        />

        {/* メール送信モーダル */}
        {generatedFiles && (
          <EmailSendModal
            open={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            userName={userSettings?.emailSenderName || user?.displayName || user?.email || undefined}
            attachment={excelBlob || undefined}
            filename={generatedFiles.filename}
          />
        )}

        {/* フローティング進捗サマリー（フォーム入力時のみ表示） */}
        {!showGeneratedPreview && (
          <FloatingProgressSummary
            formData={formData}
            activeStep={activeStep}
            totalSteps={TOTAL_STEPS}
            activeProductIndex={activeStep >= 1 && activeStep <= 4 ? activeProductIndex : undefined}
            onProductChange={activeStep >= 1 && activeStep <= 4 ? setActiveProductIndex : undefined}
            onHeightChange={setProgressSummaryHeight}
            onRemoveProduct={handleRemoveProduct}
            onClearProduct={handleClearProduct}
          />
        )}

        {/* 下書き復元確認ダイアログ */}
        <Dialog open={restoreDialogOpen} onClose={handleDiscardDraft}>
          <DialogTitle>下書きを復元しますか？</DialogTitle>
          <DialogContent>
            <DialogContentText>
              前回の入力内容が見つかりました。続きから入力を再開できます。
            </DialogContentText>
            <DialogContentText sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
              下書きは24時間保存されます。復元しない場合、新規に入力を開始します。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDiscardDraft} color="inherit">
              新規入力
            </Button>
            <Button onClick={handleRestoreDraft} color="primary" variant="contained">
              復元する
            </Button>
          </DialogActions>
        </Dialog>

        {/* 帳合先削除確認ダイアログ */}
        <Dialog open={supplierRemovalDialog.open} onClose={handleCancelSupplierRemoval}>
          <DialogTitle>帳合先の削除確認</DialogTitle>
          <DialogContent>
            <DialogContentText>
              削除しようとしている帳合先「{supplierRemovalDialog.suppliersToRemove.join('、')}」は
              {supplierRemovalDialog.affectedProductsCount}件の商品カードで使用されています。
            </DialogContentText>
            <DialogContentText sx={{ mt: 1.5 }}>
              帳合先を削除すると、これらの商品カードも削除されます。続行しますか？
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelSupplierRemoval} color="inherit">
              キャンセル
            </Button>
            <Button onClick={handleConfirmSupplierRemoval} color="error" variant="contained">
              削除する
            </Button>
          </DialogActions>
        </Dialog>
    </FormProvider>
  );
};
