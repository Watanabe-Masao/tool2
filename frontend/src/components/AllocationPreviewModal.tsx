import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { ColDef, GridOptions, RowClickedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { OrderFormData } from '@/schemas/orderSchema';
import { STORE_DATA } from '@/utils/constants';

// AG Grid モジュールを登録
ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * AllocationPreviewModalのProps
 */
interface AllocationPreviewModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** モーダルを閉じる */
  onClose: () => void;
  /** フォームデータ */
  formData: OrderFormData;
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
 * 配分表プレビューモーダル
 *
 * AG-Gridを使用してExcel出力と同様の配分表をプレビュー表示します。
 */
export const AllocationPreviewModal: React.FC<AllocationPreviewModalProps> = ({
  open,
  onClose,
  formData,
}) => {
  // 選択された行データ
  const [selectedRow, setSelectedRow] = useState<GridRowData | null>(null);

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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6">配分表プレビュー</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
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
            height: selectedRow ? 'calc(90vh - 260px)' : 'calc(90vh - 140px)',
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
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="contained" fullWidth sx={{ maxWidth: 200 }}>
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
};
