import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IonPage, IonContent } from '@ionic/react';
import { Container, Box } from '@mui/material';
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
import { FirestoreService } from '@/services/firebase/firestoreService';
import { useNotification } from '@/context/NotificationContext';
import { useAuthContext } from '@/context/AuthContext';
import { useAutocomplete } from '@/hooks/useAutocomplete';
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
    excelFilename: string;
    pdfFilename: string;
  } | null>(null);

  const { user } = useAuthContext();
  const { showSuccess, showError, showLoading, hideLoading } = useNotification();

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

      // テンプレート生成API呼び出し
      const response = await TemplateService.generateTemplate(data, buyerName);

      // Firestoreに保存
      if (user) {
        const orderData = {
          ...data,
          buyerName,
          userId: user.uid,
          timestamp: new Date(),
        };
        await FirestoreService.saveOrder(orderData, user.uid);

        // オートコンプリート履歴に追加
        await supplierAutocomplete.addToHistory(data.supplier);
        for (const product of data.products) {
          await productNameAutocomplete.addToHistory(product.name);
          await originAutocomplete.addToHistory(product.origin);
        }
      }

      hideLoading();

      // 成功メッセージ
      showSuccess('テンプレートを生成しました');

      console.log('Template generated:', response);

      // 生成されたファイル情報を保存
      setGeneratedFiles({
        excelFilename: response.filename,
        pdfFilename: response.pdf_filename,
      });

      // iPhone Safariの場合はダウンロードモーダルを表示
      if (isIPhoneSafari()) {
        setShowDownloadModal(true);
      } else {
        // それ以外はPDFプレビューを表示
        setShowPDFPreview(true);
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
      TemplateService.downloadFile(generatedFiles.excelFilename);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return <DeliveryDateForm control={control} errors={errors} />;

      case 1:
        return (
          <SupplierForm
            control={control}
            errors={errors}
            supplierOptions={supplierAutocomplete.options}
          />
        );

      case 2:
        return (
          <ProductForm
            control={control}
            errors={errors}
            productNameOptions={productNameAutocomplete.options}
            originOptions={originAutocomplete.options}
          />
        );

      case 3:
        return <TotalDeliveryForm control={control} errors={errors} />;

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
        {generatedFiles && (
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
            downloadUrl={TemplateService.getDownloadUrl(generatedFiles.excelFilename)}
            filename={generatedFiles.excelFilename}
          />
        )}
      </IonContent>
    </IonPage>
  );
};
