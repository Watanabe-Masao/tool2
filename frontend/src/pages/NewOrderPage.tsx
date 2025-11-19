import React, { useState, useRef, useEffect } from 'react';
import { useForm, FormProvider, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Container, Box, Alert, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { orderFormSchema } from '@/schemas/orderSchema';
import type { OrderFormData } from '@/schemas/orderSchema';
import { DeliveryDateForm } from '@/components/forms/DeliveryDateForm';
import { ProductBasicInfoForm } from '@/components/forms/ProductBasicInfoForm';
import { ProductPricingForm } from '@/components/forms/ProductPricingForm';
import { StoreAllocationGrid } from '@/components/forms/StoreAllocationGrid';
import { StoreAllocationMobile } from '@/components/forms/StoreAllocationMobile';
import { FloatingProgressSummary } from '@/components/forms/FloatingProgressSummary';
import { PDFPreviewModal } from '@/components/modals/PDFPreviewModal';
import { DownloadModal } from '@/components/modals/DownloadModal';
import { AllocationPreviewModal } from '@/components/AllocationPreviewModal';
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
import { isIPhoneSafari, isMobileDevice } from '@/utils/deviceDetection';
import { SessionStorageService } from '@/utils/sessionStorageService';

/**
 * フォームのステップ数
 */
const TOTAL_STEPS = 4;

/**
 * 新規注文作成ページ
 *
 * 4ステップのフォームで注文データを入力し、Excelテンプレートを生成します。
 *
 * ステップ:
 * 1. 店着日選択・帳合先入力
 * 2. 商品情報入力（品名、産地、規格、入数）
 * 3. 商品情報2入力（原価、売価、総納品数）
 * 4. 36店舗への配分入力
 */
export const NewOrderPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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

  // Swiper instance reference
  const swiperRef = useRef<SwiperType | null>(null);

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
    formState: { errors },
  } = methods;

  // フォームデータを監視
  const formData = watch();

  // 商品フィールド配列の操作
  const { remove } = useFieldArray({
    control,
    name: 'products',
  });

  // 帳合先を監視
  const suppliers = useWatch({
    control,
    name: 'suppliers',
  });

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

    // 削除される帳合先を使用している商品のインデックスを取得
    const productsToRemove: number[] = [];
    currentProducts.forEach((product, index) => {
      if (product.supplier && suppliersToRemove.includes(product.supplier)) {
        productsToRemove.push(index);
      }
    });

    // 後ろから削除（インデックスがずれないように）
    productsToRemove.reverse().forEach((index) => {
      remove(index);
    });

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
   * フォームデータ変更時にSwiperの高さを更新
   */
  useEffect(() => {
    if (swiperRef.current) {
      // Swiperを更新して高さを再計算
      setTimeout(() => {
        swiperRef.current?.update();
        swiperRef.current?.updateAutoHeight(300);
      }, 100);
    }
  }, [formData.products?.length]); // 商品数が変更されたときに更新

  /**
   * コンテンツサイズ変更を監視してSwiperを更新
   */
  useEffect(() => {
    if (!swiperRef.current) return;

    const swiperEl = swiperRef.current.el;
    if (!swiperEl) return;

    // ResizeObserverでコンテンツのサイズ変更を検出
    const resizeObserver = new ResizeObserver(() => {
      if (swiperRef.current) {
        swiperRef.current.update();
        swiperRef.current.updateAutoHeight(300);
      }
    });

    // すべてのスライドを監視
    const slides = swiperEl.querySelectorAll('.swiper-slide');
    slides.forEach((slide) => {
      resizeObserver.observe(slide);
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [activeStep]); // アクティブステップが変わったときに再設定

  /**
   * スライド変更時の処理
   */
  const handleSlideChange = (swiper: SwiperType) => {
    setActiveStep(swiper.activeIndex);
    // スライド変更時に高さを更新
    setTimeout(() => {
      swiper.update();
      swiper.updateAutoHeight(300);
    }, 50);
  };

  /**
   * スライド遷移完了時の処理
   */
  const handleSlideChangeTransitionEnd = (swiper: SwiperType) => {
    // 遷移完了後に高さを再計算
    setTimeout(() => {
      swiper.update();
      swiper.updateAutoHeight(300);
    }, 50);
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

      // バイヤー名を取得（ユーザー名またはメールアドレス）
      const buyerName = user?.displayName || user?.email || '匿名';

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
        }
      }

      // オンライン時のみテンプレート生成API呼び出し
      if (isOnline) {
        const response = await TemplateService.generateTemplate(data, buyerName);

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

        // PDFが生成されている場合とそうでない場合で分岐
        if (response.pdf_filename) {
          // PDFがある場合
          if (isIPhoneSafari()) {
            setShowDownloadModal(true);
          } else {
            setShowPDFPreview(true);
          }
        } else {
          // PDFがない場合は直接ダウンロードモーダルを表示
          setShowDownloadModal(true);
        }
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
      // レスポンスの download_url を直接使用
      const link = document.createElement('a');
      link.href = generatedFiles.downloadUrl;
      link.download = generatedFiles.filename;
      link.click();
    }
  };

  /**
   * 最終ステップで送信ボタンを表示
   */
  const renderSubmitButton = () => {
    if (activeStep === TOTAL_STEPS - 1) {
      return (
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          <Button
            variant="outlined"
            size="large"
            onClick={() => setShowPreviewModal(true)}
            fullWidth
            sx={{ maxWidth: 400 }}
          >
            プレビュー
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit(onSubmit)}
            fullWidth
            sx={{ maxWidth: 400 }}
          >
            配分表を作成
          </Button>
        </Box>
      );
    }
    return null;
  };

  const isMobile = isMobileDevice();

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
      <Container maxWidth="lg">
          <Box sx={{ py: 2 }}>
            {/* オフライン時の警告 */}
            {!isOnline && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                現在オフラインモードです。データはローカルに保存され、オンライン復帰時に自動的に同期されます。
              </Alert>
            )}

            {/* スワイプ可能なステップコンテンツ */}
            <Box sx={{ mt: 2 }}>
              <Swiper
                onSwiper={(swiper) => (swiperRef.current = swiper)}
                onSlideChange={handleSlideChange}
                onSlideChangeTransitionEnd={handleSlideChangeTransitionEnd}
                spaceBetween={16}
                slidesPerView={1}
                allowTouchMove={true}
                noSwiping={true}
                noSwipingClass="swiper-no-swiping"
                watchSlidesProgress={true}
                observer={true}
                observeParents={true}
                watchOverflow={true}
                autoHeight={true}
                style={{ width: '100%' }}
              >
                {/* Step 1: 店着日・帳合先 */}
                <SwiperSlide>
                  <Box sx={{ px: 1, pb: 4 }}>
                    <DeliveryDateForm
                      control={control}
                      errors={errors}
                      supplierOptions={supplierAutocomplete.options}
                      onSuppliersChange={handleSuppliersChange}
                    />
                  </Box>
                </SwiperSlide>

                {/* Step 2: 商品情報（基本） */}
                <SwiperSlide>
                  <Box sx={{ px: 1, pb: 4 }}>
                    <ProductBasicInfoForm
                      control={control}
                      errors={errors}
                      productNameOptions={productNameAutocomplete.options}
                      originOptions={originAutocomplete.options}
                      suppliers={formData.suppliers}
                    />
                  </Box>
                </SwiperSlide>

                {/* Step 3: 商品情報2（価格・総納品数） */}
                <SwiperSlide>
                  <Box sx={{ px: 1, pb: 4 }}>
                    <ProductPricingForm
                      control={control}
                      errors={errors}
                      productCount={formData.products.length}
                    />
                  </Box>
                </SwiperSlide>

                {/* Step 4: 店舗配分 */}
                <SwiperSlide>
                  <Box sx={{ px: 1, pb: 4 }}>
                    {formData.products.map((product, index) =>
                      isMobile ? (
                        <StoreAllocationMobile
                          key={index}
                          productIndex={index}
                          control={control}
                          errors={errors}
                          totalDelivery={product.totalDelivery || 0}
                        />
                      ) : (
                        <StoreAllocationGrid
                          key={index}
                          productIndex={index}
                          control={control}
                          errors={errors}
                          totalDelivery={product.totalDelivery || 0}
                        />
                      )
                    )}
                    {renderSubmitButton()}
                  </Box>
                </SwiperSlide>
              </Swiper>
            </Box>
          </Box>

        {/* PDFプレビューモーダル */}
        {generatedFiles && generatedFiles.pdfFilename && (
          <PDFPreviewModal
            open={showPDFPreview}
            onClose={() => setShowPDFPreview(false)}
            pdfUrl={TemplateService.getDownloadUrl(generatedFiles.pdfFilename)}
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

        {/* フローティング進捗サマリー */}
        <FloatingProgressSummary
          formData={formData}
          activeStep={activeStep}
          totalSteps={TOTAL_STEPS}
        />

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
      </Container>
    </FormProvider>
  );
};
