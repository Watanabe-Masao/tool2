import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Button,
  Paper,
} from '@mui/material';
import { PictureAsPdf, TableChart, Download, ArrowBack, Description, Send } from '@mui/icons-material';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { ColDef, GridOptions, RowClickedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { OrderFormData } from '@/schemas/orderSchema';
import { STORE_DATA } from '@/utils/constants';
import { TemplateService } from '@/services/api/templateService';
import { isIPhoneSafari } from '@/utils/deviceDetection';

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
}

/**
 * グリッド行データの型
 */
interface GridRowData {
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
}) => {
  // タブの選択状態（0: 配分表、1: PDFプレビュー）
  const [tabValue, setTabValue] = useState(0);
  // 選択された行データ
  const [selectedRow, setSelectedRow] = useState<GridRowData | null>(null);
  // PDF読み込み状態
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // iPhone Safari判定
  const isIPhone = isIPhoneSafari();

  // PDF URL
  const pdfUrl = pdfFilename ? TemplateService.getPdfPreviewUrl(pdfFilename) : '';

  /**
   * タブ変更ハンドラ
   */
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 1) {
      // PDFタブに切り替えた時、読み込み状態をリセット
      setPdfLoading(true);
      setPdfError(null);
    }
  };

  /**
   * PDF iframeの読み込み完了
   */
  const handlePdfLoad = () => {
    setPdfLoading(false);
  };

  /**
   * PDF iframeのエラー
   */
  const handlePdfError = () => {
    setPdfLoading(false);
    setPdfError('PDFの読み込みに失敗しました');
  };

  /**
   * グリッド行データを生成
   */
  const rowData = useMemo<GridRowData[]>(() => {
    const rows: GridRowData[] = [];

    formData.products.forEach((product) => {
      // 総パッケージ数を計算
      const totalPackages = product.totalDelivery || 0;

      // 各店舗への配分合計を計算
      const totalAllocated = product.storeAllocations.reduce((sum, val) => sum + val, 0);

      // 差異を計算
      const difference = totalPackages - totalAllocated;

      // 1行にまとめる
      const row: GridRowData = {
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

    // 36店舗のカラムを追加
    STORE_DATA.forEach((store) => {
      cols.push({
        headerName: `${store.code}\n${store.name}`,
        field: `store_${store.code}`,
        width: 55,
        headerClass: 'store-header',
        cellStyle: (params) => {
          const value = params.value as number;
          return {
            textAlign: 'center',
            backgroundColor: value > 0 ? '#e3f2fd' : 'transparent',
            color: value > 0 ? '#1565c0' : '#bdbdbd',
            fontWeight: value > 0 ? '600' : 'normal',
          };
        },
        valueFormatter: (params) => {
          const value = params.value as number;
          return value > 0 ? value.toString() : '-';
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
  }, []);

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
    }),
    []
  );

  return (
    <Paper elevation={3} sx={{ width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダーとタブを同じ行に配置 */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ mr: 3 }}>配分表プレビュー</Typography>
        {/* タブ */}
        {pdfFilename && (
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab icon={<TableChart />} iconPosition="start" label="配分表" />
            <Tab icon={<PictureAsPdf />} iconPosition="start" label="PDFプレビュー" />
          </Tabs>
        )}
      </Box>

      {/* コンテンツ */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', position: 'relative', minHeight: 400, maxHeight: 'calc(85vh - 150px)' }}>
        {/* 配分表タブ */}
        {tabValue === 0 && (
          <>
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
          </>
        )}

        {/* PDFプレビュータブ */}
        {tabValue === 1 && pdfFilename && (
          <Box sx={{ width: '100%', height: 'calc(85vh - 230px)', minHeight: 500, position: 'relative' }}>
            {isIPhone ? (
              /* iPhone Safari: PDFを開くボタン */
              <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  iPhone Safariでは、iframe内でのPDFプレビューはサポートされていません。
                  <br />
                  下のボタンからPDFを新しいタブで開いて表示できます。
                </Alert>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PictureAsPdf />}
                    onClick={() => window.open(pdfUrl, '_blank')}
                    size="large"
                    fullWidth
                    sx={{ maxWidth: 300 }}
                  >
                    PDFを開く
                  </Button>
                  {onDownloadPdf && (
                    <Button
                      variant="outlined"
                      startIcon={<Download />}
                      onClick={onDownloadPdf}
                      size="large"
                      fullWidth
                      sx={{ maxWidth: 300 }}
                    >
                      PDFをダウンロード
                    </Button>
                  )}
                </Box>
              </Box>
            ) : (
              /* PC: iframeでPDFプレビュー */
              <>
                {pdfLoading && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 1,
                    }}
                  >
                    <CircularProgress />
                  </Box>
                )}
                {pdfError && (
                  <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
                    <Alert severity="error" sx={{ mb: 3 }}>
                      {pdfError}
                    </Alert>
                    {onDownloadPdf && (
                      <Button
                        variant="contained"
                        startIcon={<Download />}
                        onClick={onDownloadPdf}
                      >
                        PDFをダウンロード
                      </Button>
                    )}
                  </Box>
                )}
                {!pdfError && (
                  <iframe
                    src={pdfUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      display: pdfLoading ? 'none' : 'block',
                    }}
                    title="PDFプレビュー"
                    onLoad={handlePdfLoad}
                    onError={handlePdfError}
                  />
                )}
              </>
            )}
          </Box>
        )}
      </Box>

      {/* アクションボタン */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        {/* 左側：戻るボタン */}
        <Box>
          {onBack && (
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={onBack}
            >
              戻る
            </Button>
          )}
        </Box>

        {/* 右側：ダウンロードと送信ボタン */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          {onDownloadExcel && (
            <Button
              variant="contained"
              startIcon={<Description />}
              onClick={onDownloadExcel}
            >
              ダウンロード
            </Button>
          )}
          {onSendEmail && (
            <Button
              variant="outlined"
              startIcon={<Send />}
              onClick={onSendEmail}
            >
              送信
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};
