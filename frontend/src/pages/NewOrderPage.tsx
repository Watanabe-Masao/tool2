import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IonPage, IonContent } from '@ionic/react';
import { Container, Box, Alert, Chip } from '@mui/material';
import { orderFormSchema } from '@/schemas/orderSchema';
import type { OrderFormData } from '@/schemas/orderSchema';
import { FormStepper } from '@/components/forms/FormStepper';
import type { FormStep } from '@/components/forms/FormStepper';
import { DeliveryDateForm } from '@/components/forms/DeliveryDateForm';
import { SupplierForm } from '@/components/forms/SupplierForm';
import { ProductForm } from '@/components/forms/ProductForm';
import { TotalDeliveryForm } from '@/components/forms/TotalDeliveryForm';
import { StoreAllocationGrid } from '@/components/forms/StoreAllocationGrid';
import { PDFPreviewModal } from '@/components/modals/PDFPreviewModal';
import { DownloadModal } from '@/components/modals/DownloadModal';
import { TemplateService } from '@/services/api/templateService';
import { useNotification } from '@/context/NotificationContext';
import { useAuthContext } from '@/context/AuthContext';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { useDataSync } from '@/hooks/useDataSync';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';
import { isIPhoneSafari } from '@/utils/deviceDetection';

/**
 * フォームのステップ定義
 */
const FORM_STEPS: FormStep[] = [
  { label: '店着日' },
  { label: '帳合先' },
  { label: '商品情報' },
  { label: '総納品数' },
  { label: '店舗配分' },
];

/**
 * 新規注文作成ページ
 *
 * 5ステップのフォームで注文データを入力し、Excelテンプレートを生成します。
 *
 * ステップ:
 * 1. 店着日選択
 * 2. 帳合先入力
 * 3. 商品情報入力（複数商品対応）
 * 4. 総納品数入力
 * 5. 36店舗への配分入力
 */
export const NewOrderPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<{
    filename: string;
    downloadUrl: string;
    pdfFilename?: string;
  } | null>(null);

  const { user } = useAuthContext();
  const { showSuccess, showError, showLoading, hideLoading } = useNotification();

  // オフライン同期
  const { isOnline, isSyncing, unsyncedCount, saveOrder: saveOrderWithSync } = useDataSync();

  // オートコンプリート
  const supplierAutocomplete = useAutocomplete('supplier');
  const productNameAutocomplete = useAutocomplete('productName');
  const originAutocomplete = useAutocomplete('origin');

  /**
   * React Hook Form セットアップ
   */
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      deliveryDate: new Date(),
      supplier: '',
      totalDelivery: 0,
      products: [
        {
          ...DEFAULT_PRODUCT_FORM_DATA,
          storeAllocations: new Array(STORE_COUNT).fill(0),
        },
      ],
    },
    mode: 'onChange',
  });

  // フォームデータを監視
  const formData = watch();

  /**
   * 次のステップへ進む
   */
  const handleNext = async () => {
    let isValid = false;

    // 現在のステップのバリデーション
    switch (activeStep) {
      case 0: // 店着日
        isValid = await trigger('deliveryDate');
        break;
      case 1: // 帳合先
        isValid = await trigger('supplier');
        break;
      case 2: // 商品情報
        isValid = await trigger('products');
        break;
      case 3: // 総納品数
        isValid = await trigger('totalDelivery');
        break;
      case 4: // 店舗配分（最終ステップ）
        // すべてのフィールドをバリデーション
        isValid = await trigger();
        if (isValid) {
          // フォーム送信
          handleSubmit(onSubmit)();
        }
        return;
      default:
        isValid = true;
    }

    if (isValid) {
      setActiveStep((prev) => Math.min(prev + 1, FORM_STEPS.length - 1));
    }
  };

  /**
   * 前のステップへ戻る
   */
  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  /**
   * フォーム送信
   */
  const onSubmit = async (data: OrderFormData) => {
    try {
      showLoading();

      console.log('Form data:', data);

      // バイヤー名を取得（ユーザー名またはメールアドレス）
      const buyerName = user?.displayName || user?.email || '匿名';

      // オフライン同期を使用してデータを保存
      // オンライン時: Firestore + API呼び出し
      // オフライン時: IndexedDBのみ
      await saveOrderWithSync(data, buyerName);

      // オートコンプリート履歴に追加
      if (user) {
        await supplierAutocomplete.addToHistory(data.supplier);
        for (const product of data.products) {
          await productNameAutocomplete.addToHistory(product.name);
          await originAutocomplete.addToHistory(product.origin);
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

        hideLoading();

        // 成功メッセージ
        showSuccess('テンプレートを生成しました');

        // iPhone Safariの場合はダウンロードモーダルを表示
        if (isIPhoneSafari()) {
          setShowDownloadModal(true);
        } else {
          // それ以外はPDFプレビューを表示
          setShowPDFPreview(true);
        }
      } else {
        // オフライン時
        hideLoading();
        showSuccess('データをローカルに保存しました。オンライン復帰時に自動同期されます。');
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
      TemplateService.downloadFile(generatedFiles.filename);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return <DeliveryDateForm control={control} errors={errors} onEnterPress={handleNext} />;

      case 1:
        return (
          <SupplierForm
            control={control}
            errors={errors}
            supplierOptions={supplierAutocomplete.options}
            onEnterPress={handleNext}
          />
        );

      case 2:
        return (
          <ProductForm
            control={control}
            errors={errors}
            productNameOptions={productNameAutocomplete.options}
            originOptions={originAutocomplete.options}
            onEnterPress={handleNext}
          />
        );

      case 3:
        return <TotalDeliveryForm control={control} errors={errors} onEnterPress={handleNext} />;

      case 4:
        // 各商品の店舗配分グリッド
        return (
          <Box>
            {formData.products.map((_, index) => (
              <StoreAllocationGrid
                key={index}
                productIndex={index}
                control={control}
                errors={errors}
                totalDelivery={formData.totalDelivery}
              />
            ))}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <IonPage>
      <IonContent>
        <Container maxWidth="lg">
          <Box sx={{ py: 2 }}>
            {/* ネットワーク状態・同期状態の表示 */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* オンライン/オフライン状態 */}
              <Chip
                label={isOnline ? 'オンライン' : 'オフライン'}
                color={isOnline ? 'success' : 'warning'}
                size="small"
                variant="outlined"
              />

              {/* 同期中表示 */}
              {isSyncing && (
                <Chip label="同期中..." color="info" size="small" variant="outlined" />
              )}

              {/* 未同期データ数 */}
              {unsyncedCount > 0 && (
                <Chip
                  label={`未同期: ${unsyncedCount}件`}
                  color="warning"
                  size="small"
                  variant="filled"
                />
              )}
            </Box>

            {/* オフライン時の警告 */}
            {!isOnline && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                現在オフラインモードです。データはローカルに保存され、オンライン復帰時に自動的に同期されます。
              </Alert>
            )}

            {/* ステッパーナビゲーション */}
            <FormStepper
              activeStep={activeStep}
              steps={FORM_STEPS}
              onNext={handleNext}
              onBack={handleBack}
              isLastStep={activeStep === FORM_STEPS.length - 1}
              nextButtonText={activeStep === FORM_STEPS.length - 1 ? 'テンプレート生成' : undefined}
            />

            {/* ステップコンテンツ */}
            <Box sx={{ mt: 2 }}>{renderStepContent()}</Box>
          </Box>
        </Container>

        {/* PDFプレビューモーダル */}
        {generatedFiles && generatedFiles.pdfFilename && (
          <PDFPreviewModal
            open={showPDFPreview}
            onClose={() => setShowPDFPreview(false)}
            pdfUrl={TemplateService.getDownloadUrl(generatedFiles.pdfFilename)}
            onDownloadExcel={handleDownloadExcel}
          />
        )}

        {/* ダウンロードモーダル（iPhone Safari用） */}
        {generatedFiles && (
          <DownloadModal
            open={showDownloadModal}
            onClose={() => setShowDownloadModal(false)}
            downloadUrl={TemplateService.getDownloadUrl(generatedFiles.filename)}
            filename={generatedFiles.filename}
          />
        )}
      </IonContent>
    </IonPage>
  );
};
