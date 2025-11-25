import React, { useCallback } from 'react';
import { Container, Box, Tabs, Tab, Typography, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
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
  const isStepHeaderCollapsed = useOrderFormStore((state) => state.isStepHeaderCollapsed);
  const toggleStepHeaderCollapsed = useOrderFormStore((state) => state.toggleStepHeaderCollapsed);
  const setShowGeneratedPreview = useOrderFormStore((state) => state.setShowGeneratedPreview);
  const setShowEmailModal = useOrderFormStore((state) => state.setShowEmailModal);

  // ステップラベル
  const stepLabels = ['店着日・帳合先', '商品情報', '価格・数量', '店舗配分', 'プレビュー'];

  // タブ変更ハンドラー
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
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

  // コンテンツエリアの高さを計算（折りたたみ状態を考慮）
  const collapsedHeaderHeight = 32; // 折りたたみ時のヘッダー高さ
  const expandedTabsHeight = 48; // 展開時のタブ高さ

  return (
    <Container maxWidth="lg">
      <Box sx={{ width: '100%', py: 1 }}>
        {/* 折りたたみ可能なステップヘッダー */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
          {/* 折りたたみ時のコンパクト表示 */}
          {isStepHeaderCollapsed ? (
            <Box
              onClick={toggleStepHeaderCollapsed}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 0.5,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Typography variant="body2" fontWeight="medium" color="primary" sx={{ mr: 0.5 }}>
                Step {activeStep + 1}/5: {stepLabels[activeStep]}
              </Typography>
              <ExpandMore fontSize="small" color="action" />
            </Box>
          ) : (
            <>
              {/* 展開時のタブ表示（サイズを半分に縮小） */}
              <Tabs
                value={activeStep}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 36,
                  '& .MuiTab-root': {
                    minHeight: 36,
                    py: 0.5,
                    px: 1.5,
                    fontSize: '0.75rem',
                    minWidth: 'auto',
                  },
                }}
              >
                {stepLabels.map((label, index) => (
                  <Tab key={index} label={label} />
                ))}
              </Tabs>
              {/* 折りたたみトグル */}
              <Box
                onClick={toggleStepHeaderCollapsed}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 0.25,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ExpandLess fontSize="small" color="action" />
              </Box>
            </>
          )}
        </Box>

        {/* コンテンツエリア（スクロール可能） */}
        <Box
          sx={{
            // ヘッダー(64px/56px) + Tabs/CollapsedHeader + Margin + FloatingProgressSummary (desktop only)
            // 折りたたみ時: ヘッダー + 折りたたみバー(32px) + マージン
            // 展開時: ヘッダー + タブ(52px) + 折りたたみボタン(20px) + マージン
            height: `calc(100vh - ${isMobile ? '110px' : '118px'} - ${isStepHeaderCollapsed ? 32 : 72}px - ${isMobile ? 0 : progressSummaryHeight}px)`,
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
            onSubmit={memoizedOnSubmit}
            onAllocationChange={handleAllocationChange}
            onDownloadExcel={handleDownloadExcel}
            onDownloadPdf={handleDownloadPdf}
            onSendEmail={memoizedOnSendEmail}
            onBackToEdit={memoizedOnBackToEdit}
          />
        </Box>
      </Box>
    </Container>
  );
};
