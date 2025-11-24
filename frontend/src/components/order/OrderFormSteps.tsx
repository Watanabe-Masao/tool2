import React from 'react';
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

/**
 * OrderFormSteps
 *
 * 注文フォームの5つのステップを管理するコンポーネント
 *
 * Step 0: 店着日・帳合先入力
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
  // Step管理
  activeStep: number;

  // React Hook Form
  control: Control<OrderFormData>;
  errors: FieldErrors<OrderFormData>;
  productFields: FieldArrayWithId<OrderFormData, 'products', 'id'>[];
  appendProduct: UseFieldArrayAppend<OrderFormData, 'products'>;
  removeProduct: UseFieldArrayRemove;
  moveProduct: UseFieldArrayMove;

  // Step 0: 店着日・帳合先
  supplierOptions: string[];
  onSuppliersChange: (newValue: string[]) => string[];

  // Step 1: 商品基本情報
  productNameOptions: string[];
  originOptions: string[];
  suppliers: string[];
  activeProductIndex: number;
  onProductIndexChange: (index: number) => void;
  onNavigateToStep: (step: number) => void;

  // Step 3: 店舗配分
  lockedStores: Map<number, Set<string>>;
  setLockedStores: React.Dispatch<React.SetStateAction<Map<number, Set<string>>>>;
  selectedCategories: Map<number, Set<string>>;
  setSelectedCategories: React.Dispatch<React.SetStateAction<Map<number, Set<string>>>>;

  // Step 4: プレビュー
  showGeneratedPreview: boolean;
  deliveryDate: Date | null;
  products: any[];
  generatedFiles: GeneratedFiles | null;
  onSubmit: () => void;
  onAllocationChange: (productIndex: number, storeIndex: number, newValue: number) => void;
  onDownloadExcel: () => void;
  onDownloadPdf: () => void;
  onSendEmail: () => void;
  onBackToEdit: () => void;
}

export const OrderFormSteps: React.FC<OrderFormStepsProps> = ({
  activeStep,
  control,
  errors,
  productFields,
  appendProduct,
  removeProduct,
  moveProduct,
  supplierOptions,
  onSuppliersChange,
  productNameOptions,
  originOptions,
  suppliers,
  activeProductIndex,
  onProductIndexChange,
  onNavigateToStep,
  lockedStores,
  setLockedStores,
  selectedCategories,
  setSelectedCategories,
  showGeneratedPreview,
  deliveryDate,
  products,
  generatedFiles,
  onSubmit,
  onAllocationChange,
  onDownloadExcel,
  onDownloadPdf,
  onSendEmail,
  onBackToEdit,
}) => {
  return (
    <>
      {/* Step 0: 店着日・帳合先 */}
      {activeStep === 0 && (
        <Box sx={{ py: 2 }}>
          <DeliveryDateForm
            control={control}
            errors={errors}
            supplierOptions={supplierOptions}
            onSuppliersChange={onSuppliersChange}
          />
        </Box>
      )}

      {/* Step 1: 商品情報（基本） */}
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
            onNavigateToStep={onNavigateToStep}
            activeProductIndex={activeProductIndex}
            onProductIndexChange={onProductIndexChange}
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
            onProductIndexChange={onProductIndexChange}
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
            lockedStores={lockedStores}
            setLockedStores={setLockedStores}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            activeProductIndex={activeProductIndex}
            onProductIndexChange={onProductIndexChange}
          />
        </Box>
      )}

      {/* Step 4: プレビュー・生成 */}
      {activeStep === 4 && (
        <Box sx={{ py: 2 }}>
          {!showGeneratedPreview ? (
            /* 生成前のプレビュー */
            <AllocationPreviewContent
              formData={{
                deliveryDate: deliveryDate || new Date(),
                suppliers: suppliers || [],
                products: products || [],
              }}
              pdfFilename={undefined}
              onGenerate={onSubmit}
              onAllocationChange={onAllocationChange}
              lockedStores={lockedStores}
              setLockedStores={setLockedStores}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              activeProductIndex={activeProductIndex}
              onProductChange={onProductIndexChange}
            />
          ) : (
            /* 生成後のプレビュー */
            generatedFiles && (
              <AllocationPreviewContent
                formData={{
                  deliveryDate: deliveryDate || new Date(),
                  suppliers: suppliers || [],
                  products: products || [],
                }}
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
                onProductChange={onProductIndexChange}
              />
            )
          )}
        </Box>
      )}
    </>
  );
};
