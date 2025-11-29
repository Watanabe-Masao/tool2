import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import type {
  Control,
  FieldErrors,
  FieldArrayWithId,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFieldArrayMove,
} from 'react-hook-form';
import type { OrderFormData } from '@/schemas/orderSchema';
import { DeliveryDateForm } from '@/components/forms/DeliveryDateForm';
import { ProductBasicInfoForm } from '@/components/forms/ProductBasicInfoForm';
import { ProductPricingForm } from '@/components/forms/ProductPricingForm';
import { StoreAllocationForm } from '@/components/forms/StoreAllocationForm';
import { AllocationPreviewContent } from '@/components/AllocationPreviewContent';
import { useOrderFormStore } from '@/stores/orderFormStore';
import { useStoreSettings } from '@/hooks/useStoreSettings';

/**
 * OrderFormSteps
 *
 * 注文フォームの5つのステップを管理するコンポーネント
 *
 * Step 0: 店着日入力
 * Step 1: 商品基本情報入力
 * Step 2: 商品価格・総納品数入力
 * Step 3: 店舗配分入力
 * Step 4: プレビュー・生成
 *
 * @example
 * ```typescript
 * <OrderFormSteps
 *   activeStep={0}
 *   control={control}
 *   errors={errors}
 *   // ... その他のprops
 * />
 * ```
 */

interface GeneratedFiles {
  downloadUrl: string;
  filename: string;
  pdfDownloadUrl?: string;
  pdfFilename?: string;
}

interface OrderFormStepsProps {
  // React Hook Form
  control: Control<OrderFormData>;
  errors: FieldErrors<OrderFormData>;
  productFields: FieldArrayWithId<OrderFormData, 'products', 'id'>[];
  appendProduct: UseFieldArrayAppend<OrderFormData, 'products'>;
  removeProduct: UseFieldArrayRemove;
  moveProduct: UseFieldArrayMove;

  // Step 1: 帳合先変更
  onSuppliersChange: (newValue: string[]) => string[];

  // Step 1: 商品基本情報
  productNameOptions: string[];
  originOptions: string[];
  suppliers: string[];

  // Step 4: プレビュー
  deliveryDate: Date | null;
  products: any[];
  generatedFiles: GeneratedFiles | null;
  onSubmit: () => void;
  onAllocationChange: (productIndex: number, storeIndex: number, newValue: number) => void;
  onDownloadExcel: () => void;
  onDownloadPdf: () => void;
  onSendEmail: () => void;
  onBackToEdit: () => void;

  // 配分履歴保存
  onSaveHistory?: () => void;
  isSavingHistory?: boolean;
  isHistorySaved?: boolean;
}

export const OrderFormSteps: React.FC<OrderFormStepsProps> = ({
  control,
  errors,
  productFields,
  appendProduct,
  removeProduct,
  moveProduct,
  onSuppliersChange,
  productNameOptions,
  originOptions,
  suppliers,
  deliveryDate,
  products,
  generatedFiles,
  onSubmit,
  onAllocationChange,
  onDownloadExcel,
  onDownloadPdf,
  onSendEmail,
  onBackToEdit,
  onSaveHistory,
  isSavingHistory,
  isHistorySaved,
}) => {
  // Zustand Store（UI状態）
  const activeStep = useOrderFormStore((state) => state.activeStep);
  const setActiveStep = useOrderFormStore((state) => state.setActiveStep);
  const activeProductIndex = useOrderFormStore((state) => state.activeProductIndex);
  const setActiveProductIndex = useOrderFormStore((state) => state.setActiveProductIndex);
  const lockedStores = useOrderFormStore((state) => state.lockedStores);
  const setLockedStores = useOrderFormStore((state) => state.setLockedStores);
  const selectedCategories = useOrderFormStore((state) => state.selectedCategories);
  const setSelectedCategories = useOrderFormStore((state) => state.setSelectedCategories);
  const showGeneratedPreview = useOrderFormStore((state) => state.showGeneratedPreview);

  // 店舗設定（自動配分用）
  const { storeSettings } = useStoreSettings();

  // React#185対策: formDataオブジェクトをメモ化して不要な再レンダリングを防止
  const formData = useMemo(() => ({
    deliveryDate: deliveryDate || new Date(),
    suppliers: suppliers || [],
    products: products || [],
  }), [deliveryDate, suppliers, products]);

  return (
    <>
      {/* Step 0: 店着日 */}
      {activeStep === 0 && (
        <Box sx={{ py: 2 }}>
          <DeliveryDateForm
            control={control}
            errors={errors}
          />
        </Box>
      )}

      {/* Step 1: 帳合先・商品情報（基本） */}
      {activeStep === 1 && (
        <Box sx={{ py: 2 }}>
          <ProductBasicInfoForm
            control={control}
            errors={errors}
            productNameOptions={productNameOptions}
            originOptions={originOptions}
            suppliers={suppliers}
            fields={productFields}
            append={appendProduct}
            remove={removeProduct}
            move={moveProduct}
            onNavigateToStep={setActiveStep}
            activeProductIndex={activeProductIndex}
            onProductIndexChange={setActiveProductIndex}
            onSuppliersChange={onSuppliersChange}
          />
        </Box>
      )}

      {/* Step 2: 商品情報2（価格・総納品数） */}
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

      {/* Step 3: 店舗配分 */}
      {activeStep === 3 && (
        <Box sx={{ py: 2 }}>
          <StoreAllocationForm
            control={control}
            errors={errors}
            fields={productFields}
          />
        </Box>
      )}

      {/* Step 4: プレビュー・生成 */}
      {activeStep === 4 && (
        <Box sx={{ py: 2 }}>
          {!showGeneratedPreview ? (
            /* 生成前のプレビュー */
            <AllocationPreviewContent
              formData={formData}
              pdfFilename={undefined}
              onGenerate={onSubmit}
              onAllocationChange={onAllocationChange}
              lockedStores={lockedStores}
              setLockedStores={setLockedStores}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              activeProductIndex={activeProductIndex}
              onProductChange={setActiveProductIndex}
              storeSettings={storeSettings}
            />
          ) : (
            /* 生成後のプレビュー */
            generatedFiles && (
              <AllocationPreviewContent
                formData={formData}
                pdfFilename={generatedFiles.pdfFilename}
                pdfDownloadUrl={generatedFiles.pdfDownloadUrl}
                onDownloadExcel={onDownloadExcel}
                onDownloadPdf={onDownloadPdf}
                onSendEmail={onSendEmail}
                onBack={onBackToEdit}
                onAllocationChange={onAllocationChange}
                lockedStores={lockedStores}
                setLockedStores={setLockedStores}
                selectedCategories={selectedCategories}
                setSelectedCategories={setSelectedCategories}
                activeProductIndex={activeProductIndex}
                onProductChange={setActiveProductIndex}
                storeSettings={storeSettings}
                onSaveHistory={onSaveHistory}
                isSavingHistory={isSavingHistory}
                isHistorySaved={isHistorySaved}
              />
            )
          )}
        </Box>
      )}
    </>
  );
};
