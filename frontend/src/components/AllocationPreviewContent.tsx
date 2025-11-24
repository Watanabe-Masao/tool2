import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import { PictureAsPdf, ArrowBack, Description, Send, Assessment } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { OrderFormData } from '@/schemas/orderSchema';
import { STORE_DATA } from '@/utils/constants';
import { PDFPreviewModal } from '@/components/modals/PDFPreviewModal';
import { StoreStatisticsModal } from '@/components/modals/StoreStatisticsModal';

/**
 * AllocationPreviewContentのProps
 */
interface AllocationPreviewContentProps {
  /** フォームデータ */
  formData: OrderFormData;
  /** PDFファイル名（file_id） */
  pdfFilename?: string;
  /** PDFダウンロードURL */
  pdfDownloadUrl?: string;
  /** Excelダウンロードハンドラ */
  onDownloadExcel?: () => void;
  /** PDFダウンロードハンドラ */
  onDownloadPdf?: () => void;
  /** メール送信ハンドラ */
  onSendEmail?: () => void;
  /** 戻るボタンハンドラ */
  onBack?: () => void;
  /** 生成ボタンハンドラ（生成前のみ） */
  onGenerate?: () => void;
  /** 配分数量変更ハンドラ */
  onAllocationChange?: (productIndex: number, storeIndex: number, newValue: number) => void;
  /** ロックされた店舗のMap（商品別） */
  lockedStores: Map<number, Set<string>>;
  /** ロック状態更新関数 */
  setLockedStores: React.Dispatch<React.SetStateAction<Map<number, Set<string>>>>;
  /** 選択されたカテゴリのMap（商品別） */
  selectedCategories: Map<number, Set<string>>;
  /** カテゴリ選択更新関数 */
  setSelectedCategories: React.Dispatch<React.SetStateAction<Map<number, Set<string>>>>;
}

/**
 * グリッド行データの型
 */
interface GridRowData {
  id: string;
  productIndex: number;
  deliveryDate: string;
  origin: string;
  specification: string;
  productName: string;
  storeCost: number;
  priceExcludingTax: number;
  priceIncludingTax: number;
  totalPackages: number;
  quantityPerPackage: number;
  supplier: string;
  total: number;
  totalDelivery: number;
  difference: number;
  [key: string]: string | number;
}

/**
 * 配分表プレビューコンテンツ
 *
 * MUI DataGridを使用してExcel出力と同様の配分表をプレビュー表示します。
 */
export const AllocationPreviewContent: React.FC<AllocationPreviewContentProps> = ({
  formData,
  pdfFilename,
  pdfDownloadUrl,
  onDownloadExcel,
  onDownloadPdf,
  onSendEmail,
  onBack,
  onGenerate,
  onAllocationChange,
  lockedStores,
  setLockedStores: _setLockedStores,
  selectedCategories: _selectedCategories,
  setSelectedCategories: _setSelectedCategories,
}) => {
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);

  const isGenerationComplete = Boolean(pdfFilename);

  /**
   * 行データを生成
   */
  const rows = useMemo<GridRowData[]>(() => {
    return formData.products.map((product, productIndex) => {
      const storeAllocations = product.storeAllocations || new Array(36).fill(0);
      const total = storeAllocations.reduce((sum: number, val: number) => sum + val, 0);
      const difference = total - (product.totalDelivery || 0);

      const row: GridRowData = {
        id: `product-${productIndex}`,
        productIndex,
        deliveryDate: format(formData.deliveryDate, 'M/d(E)', { locale: ja }),
        origin: product.origin || '',
        specification: product.specification || '',
        productName: product.name || '',
        storeCost: product.storeCost || 0,
        priceExcludingTax: product.priceExcludingTax || 0,
        priceIncludingTax: product.priceExcludingTax ? Math.floor((product.priceExcludingTax || 0) * 1.1) : 0,
        totalPackages: product.totalDelivery || 0,
        quantityPerPackage: product.quantityPerPackage || 0,
        supplier: product.supplier || '',
        total,
        totalDelivery: product.totalDelivery || 0,
        difference,
      };

      // 各店舗の配分数を追加
      STORE_DATA.forEach((store, index) => {
        row[`store_${store.code}`] = storeAllocations[index] || 0;
      });

      return row;
    });
  }, [formData]);

  /**
   * カラム定義
   */
  const columns = useMemo<GridColDef<GridRowData>[]>(() => {
    const cols: GridColDef<GridRowData>[] = [
      {
        field: 'deliveryDate',
        headerName: '店着日',
        width: 80,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      },
      {
        field: 'origin',
        headerName: '産地',
        width: 100,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      },
      {
        field: 'specification',
        headerName: '規格',
        width: 100,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      },
      {
        field: 'productName',
        headerName: '品名',
        width: 150,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      },
      {
        field: 'storeCost',
        headerName: '店原',
        width: 80,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
      },
      {
        field: 'priceExcludingTax',
        headerName: '店売税抜',
        width: 90,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
      },
      {
        field: 'priceIncludingTax',
        headerName: '店売税込',
        width: 90,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
      },
      {
        field: 'totalPackages',
        headerName: '総件数',
        width: 80,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
      },
      {
        field: 'quantityPerPackage',
        headerName: '入数',
        width: 70,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
      },
    ];

    // 36店舗のカラムを追加
    STORE_DATA.forEach((store) => {
      cols.push({
        field: `store_${store.code}`,
        headerName: `${store.code}\n${store.name}`,
        width: 55,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        editable: Boolean(onGenerate), // 生成前のみ編集可能
        type: 'number',
        renderCell: (params: GridRenderCellParams<GridRowData>) => {
          if (!params.row) return null;
          const value = params.value as number;
          const productIndex = params.row.productIndex;
          const productLockedStores = lockedStores.get(productIndex) || new Set();
          const isLocked = productLockedStores.has(store.code);

          return (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: value > 0 ? '600' : 'normal',
                color: isLocked ? '#f57c00' : value > 0 ? '#1565c0' : '#bdbdbd',
                backgroundColor: isLocked ? '#fff3e0' : value > 0 ? '#e3f2fd' : 'transparent',
              }}
            >
              {value > 0 ? value : '-'}
            </Box>
          );
        },
      });
    });

    // 集計カラム
    cols.push(
      {
        field: 'total',
        headerName: '合計',
        width: 60,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
        renderCell: (params: GridRenderCellParams<GridRowData>) => (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              color: '#f57f17',
              backgroundColor: '#fff8e1',
            }}
          >
            {params.value}
          </Box>
        ),
      },
      {
        field: 'totalDelivery',
        headerName: '納品数',
        width: 65,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
        renderCell: (params: GridRenderCellParams<GridRowData>) => (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
            }}
          >
            {params.value}
          </Box>
        ),
      },
      {
        field: 'difference',
        headerName: '差異',
        width: 60,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        type: 'number',
        renderCell: (params: GridRenderCellParams<GridRowData>) => {
          const diff = params.value as number;
          return (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                color: diff !== 0 ? '#d32f2f' : '#388e3c',
                backgroundColor: diff !== 0 ? '#ffebee' : '#e8f5e9',
              }}
            >
              {diff}
            </Box>
          );
        },
      },
      {
        field: 'supplier',
        headerName: '帳合先',
        width: 120,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      }
    );

    return cols;
  }, [onGenerate, lockedStores]);

  /**
   * セル更新処理
   */
  const processRowUpdate = useCallback((newRow: GridRowData, oldRow: GridRowData) => {
    if (!onAllocationChange) return oldRow;

    // 変更された店舗カラムを検出
    const changedField = Object.keys(newRow).find(
      key => key.startsWith('store_') && newRow[key] !== oldRow[key]
    );

    if (!changedField) return oldRow;

    // 店舗コードとインデックスを取得
    const storeCode = changedField.replace('store_', '');
    const storeIndex = STORE_DATA.findIndex(store => store.code === storeCode);
    if (storeIndex === -1) return oldRow;

    // ロックチェック
    const productIndex = newRow.productIndex;
    const productLockedStores = lockedStores.get(productIndex) || new Set();
    if (productLockedStores.has(storeCode)) {
      return oldRow; // ロックされている場合は更新しない
    }

    // 値を検証して更新
    const value = Math.max(0, Math.floor((newRow[changedField] as number) || 0));
    onAllocationChange(productIndex, storeIndex, value);

    return { ...newRow, [changedField]: value };
  }, [onAllocationChange, lockedStores]);

  /**
   * セルが編集可能かどうか
   */
  const isCellEditable = useCallback((params: any) => {
    if (!params.field.startsWith('store_')) return false;
    if (!onGenerate) return false; // 生成後は編集不可

    const storeCode = params.field.replace('store_', '');
    const productIndex = params.row.productIndex;
    const productLockedStores = lockedStores.get(productIndex) || new Set();

    return !productLockedStores.has(storeCode);
  }, [onGenerate, lockedStores]);

  /**
   * PDFプレビューを開く
   */
  const handlePDFPreview = () => {
    setShowPDFPreview(true);
  };


  return (
    <Box sx={{ py: 2 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {isGenerationComplete ? '配分表（生成完了）' : '配分表プレビュー'}
        </Typography>

        {/* 統計モーダルボタン */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<Assessment />}
          onClick={() => setShowStatistics(true)}
          sx={{ mr: 1 }}
        >
          店舗別統計
        </Button>
      </Box>

      {/* アクションボタン */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {/* 生成前 */}
          {!isGenerationComplete && onGenerate && (
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<Description />}
              onClick={onGenerate}
              sx={{ flex: 1, minWidth: '200px' }}
            >
              配分表を生成
            </Button>
          )}

          {/* 生成後 */}
          {isGenerationComplete && (
            <>
              {onDownloadExcel && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Description />}
                  onClick={onDownloadExcel}
                  sx={{ flex: 1 }}
                >
                  Excelダウンロード
                </Button>
              )}

              {pdfDownloadUrl && onDownloadPdf && (
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<PictureAsPdf />}
                  onClick={onDownloadPdf}
                  sx={{ flex: 1 }}
                >
                  PDFダウンロード
                </Button>
              )}

              {pdfFilename && (
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdf />}
                  onClick={handlePDFPreview}
                  sx={{ flex: 1 }}
                >
                  PDFプレビュー
                </Button>
              )}

              {onSendEmail && (
                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<Send />}
                  onClick={onSendEmail}
                  sx={{ flex: 1 }}
                >
                  メール送信
                </Button>
              )}

              {onBack && (
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={onBack}
                  sx={{ flex: 1 }}
                >
                  編集に戻る
                </Button>
              )}
            </>
          )}
        </Box>
      </Paper>

      <Divider sx={{ my: 2 }} />

      {/* データグリッド */}
      <Paper elevation={1} sx={{ overflow: 'hidden' }}>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            processRowUpdate={processRowUpdate}
            isCellEditable={isCellEditable}
            disableRowSelectionOnClick
            hideFooter
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                borderRight: '1px solid #e0e0e0',
                fontSize: '0.85rem',
              },
              '& .MuiDataGrid-cell:last-child': {
                borderRight: 'none',
              },
              '& .MuiDataGrid-columnHeader': {
                backgroundColor: 'primary.main',
                color: 'white',
                fontWeight: '700',
                fontSize: '0.75rem',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.2',
              },
              '& .MuiDataGrid-columnHeader:last-child': {
                borderRight: 'none',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: '#f5f5f5',
              },
            }}
          />
        </Box>
      </Paper>

      {/* PDFプレビューモーダル */}
      {pdfDownloadUrl && onDownloadExcel && onSendEmail && (
        <PDFPreviewModal
          open={showPDFPreview}
          onClose={() => setShowPDFPreview(false)}
          pdfUrl={pdfDownloadUrl}
          onDownloadExcel={onDownloadExcel}
          onSendEmail={onSendEmail}
        />
      )}

      {/* 店舗別統計モーダル */}
      <StoreStatisticsModal
        open={showStatistics}
        onClose={() => setShowStatistics(false)}
        formData={formData}
      />
    </Box>
  );
};
