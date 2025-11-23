import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import { PictureAsPdf, ArrowBack, Description, Send, Assessment } from '@mui/icons-material';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { ColDef, GridOptions, RowClickedEvent } from 'ag-grid-community';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { OrderFormData } from '@/schemas/orderSchema';
import { STORE_DATA } from '@/utils/constants';
import { TemplateService } from '@/services/api/templateService';
import { PDFPreviewModal } from '@/components/modals/PDFPreviewModal';
import { StoreStatisticsModal } from '@/components/modals/StoreStatisticsModal';

// AG Grid モジュールを登録
ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * AllocationPreviewContentのProps
 */
interface AllocationPreviewContentProps {
  /** フォームデータ */
  formData: OrderFormData;
  /** PDFファイル名（file_id） */
  pdfFilename?: string;
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
  productIndex: number; // 商品のインデックス
  deliveryDate: string;
  origin: string;
  specification: string;
  productName: string;
  storeCost: string;
  priceExcludingTax: string;
  priceIncludingTax: string;
  totalPackages: string;
  quantityPerPackage: string;
  supplier: string;
  total: string;
  totalDelivery: string;
  difference: number;
  [key: string]: string | number; // Store allocations (store_01, store_02, etc.)
}

/**
 * 配分表プレビューコンテンツ
 *
 * AG-Gridを使用してExcel出力と同様の配分表をプレビュー表示します。
 * タブでPDFプレビューにも切り替え可能です。
 */
export const AllocationPreviewContent: React.FC<AllocationPreviewContentProps> = ({
  formData,
  pdfFilename,
  onDownloadExcel,
  onDownloadPdf,
  onSendEmail,
  onBack,
  onGenerate,
  onAllocationChange,
  lockedStores,
  setLockedStores: _setLockedStores, // 未使用（将来の拡張用）
  selectedCategories: _selectedCategories, // TODO: カテゴリフィルター UI で使用予定
  setSelectedCategories: _setSelectedCategories, // TODO: カテゴリフィルター UI で使用予定
}) => {
  // 選択された行データ
  const [selectedRow, setSelectedRow] = useState<GridRowData | null>(null);
  // PDFプレビューモーダルの開閉状態
  const [showPDFModal, setShowPDFModal] = useState(false);
  // 店舗別統計モーダルの開閉状態
  const [showStatsModal, setShowStatsModal] = useState(false);

  // PDF URL
  const pdfUrl = pdfFilename ? TemplateService.getPdfPreviewUrl(pdfFilename) : '';

  // カスタムブック名を生成（配分表_{customName}_{YYYYMMDD}）
  const bookName = useMemo(() => {
    const dateStr = format(formData.deliveryDate, 'yyyyMMdd');
    const customName = formData.customBookName?.trim() || '';
    return customName ? `配分表_${customName}_${dateStr}` : `配分表_${dateStr}`;
  }, [formData.deliveryDate, formData.customBookName]);

  /**
   * グリッド行データを生成
   */
  const rowData = useMemo<GridRowData[]>(() => {
    const rows: GridRowData[] = [];

    formData.products.forEach((product, productIndex) => {
      // 総パッケージ数を計算
      const totalPackages = product.totalDelivery || 0;

      // 各店舗への配分合計を計算
      const totalAllocated = product.storeAllocations.reduce((sum, val) => sum + val, 0);

      // 差異を計算
      const difference = totalPackages - totalAllocated;

      // 1行にまとめる
      const row: GridRowData = {
        productIndex, // 商品のインデックスを保存
        deliveryDate: formData.deliveryDate
          ? format(formData.deliveryDate, 'M/d(E)', { locale: ja })
          : '',
        origin: product.origin || '',
        specification: product.specification || '',
        productName: product.name || '',
        storeCost: product.storeCost ? `¥${product.storeCost.toLocaleString()}` : '',
        priceExcludingTax: product.priceExcludingTax
          ? `¥${product.priceExcludingTax.toLocaleString()}`
          : '',
        priceIncludingTax: product.priceExcludingTax
          ? `¥${Math.round(product.priceExcludingTax * 1.08).toLocaleString()}`
          : '',
        totalPackages: totalPackages ? totalPackages.toString() : '',
        quantityPerPackage: product.quantityPerPackage
          ? `${product.quantityPerPackage}${product.unit || ''}`
          : '',
        total: totalAllocated.toString(),
        totalDelivery: totalPackages.toString(),
        difference: difference,
        supplier: product.supplier || '',
      };

      // 各店舗の配分数を追加
      STORE_DATA.forEach((store, index) => {
        const allocation = product.storeAllocations[index] || 0;
        row[`store_${store.code}`] = allocation;
      });

      rows.push(row);
    });

    return rows;
  }, [formData]);

  /**
   * カラム定義を生成
   */
  const columnDefs = useMemo<ColDef<GridRowData>[]>(() => {
    const cols: ColDef<GridRowData>[] = [
      {
        headerName: '品名',
        field: 'productName',
        width: 150,
        cellStyle: { fontWeight: '500', fontSize: '0.85rem' },
      },
    ];

    // 36店舗のカラムを追加（生成前のみ編集可能、ロック状態を反映）
    STORE_DATA.forEach((store, storeIndex) => {
      cols.push({
        headerName: `${store.code}\n${store.name}`,
        field: `store_${store.code}`,
        width: 55,
        headerClass: 'store-header',
        // 生成前のみ編集可能（ロック状態は商品別に判定）
        editable: (params) => {
          if (!Boolean(onGenerate) || !params.data) return false;
          const productIndex = params.data.productIndex;
          const productLockedStores = lockedStores.get(productIndex) || new Set();
          return !productLockedStores.has(store.code);
        },
        cellStyle: (params) => {
          if (!params.data) return {} as any;
          const productIndex = params.data.productIndex;
          const productLockedStores = lockedStores.get(productIndex) || new Set();
          const isLocked = productLockedStores.has(store.code);
          const value = params.value as number;
          return {
            textAlign: 'center',
            backgroundColor: isLocked ? '#fff3e0' : value > 0 ? '#e3f2fd' : 'transparent',
            color: isLocked ? '#f57c00' : value > 0 ? '#1565c0' : '#bdbdbd',
            fontWeight: value > 0 ? '600' : 'normal',
            cursor: Boolean(onGenerate) && !isLocked ? 'text' : 'default',
          } as any;
        },
        valueFormatter: (params) => {
          const value = params.value as number;
          return value > 0 ? value.toString() : '-';
        },
        valueParser: (params) => {
          // 入力値を数値に変換（無効な値は0にする）
          const num = parseInt(params.newValue, 10);
          return isNaN(num) || num < 0 ? 0 : num;
        },
        valueSetter: (params) => {
          // セルの値を更新する代わりに、親コンポーネントに通知
          if (onAllocationChange && params.data) {
            const productIndex = params.data.productIndex;
            const productLockedStores = lockedStores.get(productIndex) || new Set();
            const isLocked = productLockedStores.has(store.code);
            if (!isLocked) {
              const parsedValue = parseInt(params.newValue, 10);
              const newValue = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
              onAllocationChange(productIndex, storeIndex, newValue);
            }
          }
          // AG-Gridに値を更新させない（React側で管理）
          return false;
        },
      });
    });

    // 集計カラム
    cols.push(
      {
        headerName: '合計',
        field: 'total',
        width: 60,
        cellStyle: {
          textAlign: 'center',
          backgroundColor: '#fff8e1',
          fontWeight: '700',
          color: '#f57f17',
        },
      },
      {
        headerName: '納品数',
        field: 'totalDelivery',
        width: 65,
        cellStyle: {
          textAlign: 'center',
          fontWeight: '600',
        },
      },
      {
        headerName: '差異',
        field: 'difference',
        width: 60,
        cellStyle: (params) => {
          const diff = params.value as number;
          return {
            textAlign: 'center',
            backgroundColor: diff !== 0 ? '#ffebee' : '#e8f5e9',
            color: diff !== 0 ? '#d32f2f' : '#388e3c',
            fontWeight: '700',
          };
        },
      },
      {
        headerName: '帳合先',
        field: 'supplier',
        width: 120,
      }
    );

    return cols;
  }, [onAllocationChange, lockedStores, onGenerate]);

  /**
   * 行クリック時のハンドラー
   */
  const handleRowClicked = (event: RowClickedEvent<GridRowData>) => {
    setSelectedRow(event.data || null);
  };

  /**
   * グリッドオプション
   */
  const gridOptions = useMemo<GridOptions<GridRowData>>(
    () => ({
      defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
        floatingFilter: false,
      },
      rowHeight: 40,
      headerHeight: 42,
      suppressMovableColumns: true,
      suppressCellFocus: false,
      enableCellTextSelection: true,
      animateRows: true,
      onRowClicked: handleRowClicked,
      rowSelection: 'single',
      singleClickEdit: true, // シングルクリックで編集開始
      stopEditingWhenCellsLoseFocus: true, // フォーカスを失ったら編集終了
    }),
    []
  );

  return (
    <>
      <Paper elevation={3} sx={{ width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* ヘッダー */}
        <Box sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'primary.50', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight="700" color="primary.main">
              {bookName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              配分表プレビュー
            </Typography>
          </Box>
          {/* 店舗別統計ボタン */}
          <Button
            variant="contained"
            startIcon={<Assessment />}
            onClick={() => setShowStatsModal(true)}
            color="secondary"
            aria-label="店舗別統計ダッシュボードを開く"
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 600,
              boxShadow: 3,
              '&:hover': { boxShadow: 6 }
            }}
          >
            店舗別統計
          </Button>
        </Box>

      {/* コンテンツ */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', position: 'relative', minHeight: 400, maxHeight: 'calc(85vh - 150px)' }}>
        {/* 選択行の詳細情報エリア */}
        {selectedRow && (
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
                {/* 1行目: 店着日と集計情報 */}
                <Box sx={{ display: 'flex', gap: 3, mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#1565c0' }}>
                    店着日: <Box component="span" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedRow.deliveryDate}</Box>
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#1565c0' }}>
                    納品数: <Box component="span" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedRow.totalDelivery}</Box>
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#1565c0' }}>
                    配分数: <Box component="span" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedRow.total}</Box>
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: selectedRow.difference !== 0 ? '#d32f2f' : '#388e3c' }}>
                    差異: <Box component="span" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedRow.difference}</Box>
                  </Typography>
                </Box>

                {/* 2行目: 商品基本情報 */}
                <Box sx={{ display: 'flex', gap: 2, mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary">
                    産地: <Box component="span" sx={{ fontWeight: 500 }}>{selectedRow.origin}</Box>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    品名: <Box component="span" sx={{ fontWeight: 500 }}>{selectedRow.productName}</Box>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    規格: <Box component="span" sx={{ fontWeight: 500 }}>{selectedRow.specification}</Box>
                  </Typography>
                </Box>

                {/* 3行目: 価格情報 */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary">
                    店着原価: <Box component="span" sx={{ fontWeight: 500 }}>{selectedRow.storeCost}</Box>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    税抜売価: <Box component="span" sx={{ fontWeight: 500 }}>{selectedRow.priceExcludingTax}</Box>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    入数: <Box component="span" sx={{ fontWeight: 500 }}>{selectedRow.quantityPerPackage}</Box>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    帳合先: <Box component="span" sx={{ fontWeight: 500 }}>{selectedRow.supplier}</Box>
                  </Typography>
                </Box>
              </Box>
            )}

            <Box
              className="ag-theme-alpine"
              sx={{
                width: '100%',
                height: selectedRow ? 'calc(85vh - 350px)' : 'calc(85vh - 230px)',
                minHeight: 400,
                '& .ag-header': {
                  backgroundColor: '#f8f9fa',
                  borderBottom: '2px solid #dee2e6',
                },
                '& .ag-header-cell': {
                  fontWeight: '600',
                  fontSize: '0.75rem',
                  padding: '6px 8px',
                },
                '& .store-header': {
                  backgroundColor: '#e7f1ff',
                  fontSize: '0.7rem',
                },
                '& .ag-cell': {
                  fontSize: '0.8rem',
                  lineHeight: '40px',
                  padding: '0 8px',
                },
                '& .ag-row:hover': {
                  backgroundColor: '#f8f9fa !important',
                },
                '& .ag-row-even': {
                  backgroundColor: '#ffffff',
                },
                '& .ag-row-odd': {
                  backgroundColor: '#fafafa',
                },
                '& .ag-row-selected': {
                  backgroundColor: '#e3f2fd !important',
                },
              }}
            >
              <AgGridReact<GridRowData>
                rowData={rowData}
                columnDefs={columnDefs}
                gridOptions={gridOptions}
              />
        </Box>
      </Box>

      <Divider />

      {/* アクションボタン */}
      <Box sx={{ p: 3, bgcolor: 'grey.50', display: 'flex', gap: 2, justifyContent: onGenerate ? 'center' : 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        {onGenerate ? (
          /* 生成前：生成ボタンのみ */
          <Button
            variant="contained"
            size="large"
            onClick={onGenerate}
            aria-label="配分表のExcelテンプレートを生成"
            sx={{
              px: 6,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 700,
              borderRadius: 2,
              boxShadow: 4,
              '&:hover': {
                boxShadow: 8,
              }
            }}
          >
            テンプレート生成
          </Button>
        ) : (
          <>
            {/* 生成後：左側に戻るボタン */}
            <Box>
              {onBack && (
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={onBack}
                  size="large"
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    fontWeight: 600,
                    borderWidth: 2,
                    '&:hover': { borderWidth: 2, bgcolor: 'action.hover' }
                  }}
                >
                  戻る
                </Button>
              )}
            </Box>

            {/* 生成後：右側にダウンロードと送信ボタン */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {pdfFilename && (
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdf />}
                  onClick={() => setShowPDFModal(true)}
                  color="primary"
                  size="large"
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    fontWeight: 600,
                    borderWidth: 2,
                    '&:hover': { borderWidth: 2, bgcolor: 'primary.50' }
                  }}
                >
                  PDFプレビュー
                </Button>
              )}
              {onDownloadExcel && (
                <Button
                  variant="contained"
                  startIcon={<Description />}
                  onClick={onDownloadExcel}
                  color="success"
                  size="large"
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    fontWeight: 600,
                    boxShadow: 3,
                    '&:hover': { boxShadow: 6 }
                  }}
                >
                  Excelダウンロード
                </Button>
              )}
              {onSendEmail && (
                <Button
                  variant="contained"
                  startIcon={<Send />}
                  onClick={onSendEmail}
                  color="info"
                  size="large"
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    fontWeight: 600,
                    boxShadow: 3,
                    '&:hover': { boxShadow: 6 }
                  }}
                >
                  送信
                </Button>
              )}
            </Box>
          </>
        )}
      </Box>

      {/* PDFプレビューモーダル */}
      {pdfFilename && (
        <PDFPreviewModal
          open={showPDFModal}
          onClose={() => setShowPDFModal(false)}
          pdfUrl={pdfUrl}
          onDownloadExcel={onDownloadExcel || (() => {})}
          onDownloadPdf={onDownloadPdf}
          onSendEmail={onSendEmail}
        />
      )}
    </Paper>

    {/* 店舗別統計ダッシュボードモーダル */}
    <StoreStatisticsModal
      open={showStatsModal}
      onClose={() => setShowStatsModal(false)}
      formData={formData}
    />
    </>
  );
};
