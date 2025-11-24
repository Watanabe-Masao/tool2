import React from 'react';
import { Container, Box, Tabs, Tab } from '@mui/material';
import type {
  Control,
  FieldErrors,
  FieldArrayWithId,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFieldArrayMove,
  UseFormHandleSubmit,
} from 'react-hook-form';
import type { OrderFormData } from '@/schemas/orderSchema';
import { OrderFormSteps } from '@/components/order/OrderFormSteps';
import { useOrderFormStore } from '@/stores/orderFormStore';

/**
 * GeneratedFiles型定義
 */
interface GeneratedFiles {
  downloadUrl: string;
  filename: string;
  pdfDownloadUrl?: string;
  pdfFilename?: string;
}

/**
 * OrderFormWithTabsのProps
 */
interface OrderFormWithTabsProps {
  // Layout
  isMobile: boolean;

  // React Hook Form
  control: Control<OrderFormData>;
  errors: FieldErrors<OrderFormData>;
  productFields: FieldArrayWithId<OrderFormData, 'products', 'id'>[];
  appendProduct: UseFieldArrayAppend<OrderFormData, 'products'>;
  removeProduct: UseFieldArrayRemove;
  moveProduct: UseFieldArrayMove;
  handleSubmit: UseFormHandleSubmit<OrderFormData>;

  // Autocomplete options
  supplierOptions: string[];
  productNameOptions: string[];
  originOptions: string[];

  // Form data
  suppliers: string[];
  products: any[];
  deliveryDate: Date | null;
  generatedFiles: GeneratedFiles | null;

  // Actions
  setGeneratedFiles: (files: GeneratedFiles | null) => void;
  setExcelBlob: (blob: Blob | null) => void;

  // Handlers
  handleSuppliersChange: (newValue: string[]) => string[];
  onSubmit: (data: OrderFormData) => void;
  handleAllocationChange: (productIndex: number, storeIndex: number, newValue: number) => void;
  handleDownloadExcel: () => void;
  handleDownloadPdf: () => void;
}

/**
 * OrderFormWithTabs
 *
 * タブナビゲーションとOrderFormStepsを含むコンテナコンポーネント
 *
 * 責務:
 * - タブナビゲーションの表示
 * - コンテンツエリアのスクロール管理
 * - OrderFormStepsへのprops受け渡し
 *
 * @example
 * ```typescript
 * <OrderFormWithTabs
 *   activeStep={activeStep}
 *   handleTabChange={handleTabChange}
 *   isMobile={isMobile}
 *   // ... その他のprops
 * />
 * ```
 */
export const OrderFormWithTabs: React.FC<OrderFormWithTabsProps> = ({
  isMobile,
  control,
  errors,
  productFields,
  appendProduct,
  removeProduct,
  moveProduct,
  handleSubmit,
  supplierOptions,
  productNameOptions,
  originOptions,
  suppliers,
  products,
  deliveryDate,
  generatedFiles,
  setGeneratedFiles,
  setExcelBlob,
  handleSuppliersChange,
  onSubmit,
  handleAllocationChange,
  handleDownloadExcel,
  handleDownloadPdf,
}) => {
  // Zustand Store（UI状態）
  const activeStep = useOrderFormStore((state) => state.activeStep);
  const setActiveStep = useOrderFormStore((state) => state.setActiveStep);
  const progressSummaryHeight = useOrderFormStore((state) => state.progressSummaryHeight);
  const setShowGeneratedPreview = useOrderFormStore((state) => state.setShowGeneratedPreview);
  const setShowEmailModal = useOrderFormStore((state) => state.setShowEmailModal);

  // タブ変更ハンドラー
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveStep(newValue);
  };

  return (
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
        <Box
          sx={{
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
          }}
        >
          <OrderFormSteps
            control={control}
            errors={errors}
            productFields={productFields}
            appendProduct={appendProduct}
            removeProduct={removeProduct}
            moveProduct={moveProduct}
            supplierOptions={supplierOptions}
            onSuppliersChange={handleSuppliersChange}
            productNameOptions={productNameOptions}
            originOptions={originOptions}
            suppliers={suppliers}
            deliveryDate={deliveryDate}
            products={products}
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
  );
};
