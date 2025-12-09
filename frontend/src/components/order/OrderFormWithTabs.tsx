import React, { useCallback } from 'react';
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
import type { OrderFormData, ProductFormData } from '@/schemas/orderSchema';
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
  productNameOptions: string[];
  originOptions: string[];

  // Form data
  suppliers: string[];
  products: ProductFormData[];
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

  // 配分履歴保存
  onSaveHistory?: () => void;
  isSavingHistory?: boolean;
  isHistorySaved?: boolean;
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
  onSaveHistory,
  isSavingHistory,
  isHistorySaved,
}) => {
  // Zustand Store（UI状態）
  const activeStep = useOrderFormStore((state) => state.activeStep);
  const setActiveStep = useOrderFormStore((state) => state.setActiveStep);
  const progressSummaryHeight = useOrderFormStore((state) => state.progressSummaryHeight);
  const showGeneratedPreview = useOrderFormStore((state) => state.showGeneratedPreview);
  const setShowGeneratedPreview = useOrderFormStore((state) => state.setShowGeneratedPreview);
  const setShowEmailModal = useOrderFormStore((state) => state.setShowEmailModal);

  // タブ変更ハンドラー（生成後は無効化）
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    // 配分表生成後はタブ切り替えを無効化
    if (showGeneratedPreview) {
      return;
    }
    setActiveStep(newValue);
  };

  // React#185対策: onSubmitハンドラをメモ化して不要な再レンダリングを防止
  const memoizedOnSubmit = useCallback(() => {
    handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  // React#185対策: onBackToEditハンドラをメモ化
  const memoizedOnBackToEdit = useCallback(() => {
    setShowGeneratedPreview(false);
    setGeneratedFiles(null);
    setExcelBlob(null);
  }, [setShowGeneratedPreview, setGeneratedFiles, setExcelBlob]);

  // React#185対策: onSendEmailハンドラをメモ化
  const memoizedOnSendEmail = useCallback(() => {
    setShowEmailModal(true);
  }, [setShowEmailModal]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ width: '100%', py: 2 }}>
        {/* 配分表生成後はタブを非表示 */}
        {!showGeneratedPreview && (
          <Tabs
            value={activeStep}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="店着日" />
            <Tab label="商品情報" />
            <Tab label="価格・数量" />
            <Tab label="店舗配分" />
            <Tab label="プレビュー" />
          </Tabs>
        )}

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
            onSuppliersChange={handleSuppliersChange}
            productNameOptions={productNameOptions}
            originOptions={originOptions}
            suppliers={suppliers}
            deliveryDate={deliveryDate}
            products={products}
            generatedFiles={generatedFiles}
            onSubmit={memoizedOnSubmit}
            onAllocationChange={handleAllocationChange}
            onDownloadExcel={handleDownloadExcel}
            onDownloadPdf={handleDownloadPdf}
            onSendEmail={memoizedOnSendEmail}
            onBackToEdit={memoizedOnBackToEdit}
            onSaveHistory={onSaveHistory}
            isSavingHistory={isSavingHistory}
            isHistorySaved={isHistorySaved}
          />
        </Box>
      </Box>
    </Container>
  );
};
