import React, { useMemo } from 'react';
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
import type { ColDef, GridOptions } from 'ag-grid-community';
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
        supplier: formData.supplier || '',
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
        headerName: '店着日',
        field: 'deliveryDate',
        width: 90,
        pinned: 'left',
        cellStyle: { textAlign: 'center', fontWeight: '500' },
      },
      {
        headerName: '品名',
        field: 'productName',
        width: 140,
        pinned: 'left',
        cellStyle: { fontWeight: '500' },
      },
      {
        headerName: '産地',
        field: 'origin',
        width: 90,
      },
      {
        headerName: '規格',
        field: 'specification',
        width: 70,
      },
      {
        headerName: '入数',
        field: 'quantityPerPackage',
        width: 70,
        cellStyle: { textAlign: 'center' },
      },
      {
        headerName: '店着原価',
        field: 'storeCost',
        width: 90,
        cellStyle: { textAlign: 'right', fontWeight: '500' },
      },
      {
        headerName: '税抜',
        field: 'priceExcludingTax',
        width: 90,
        cellStyle: { textAlign: 'right' },
      },
      {
        headerName: '税込',
        field: 'priceIncludingTax',
        width: 90,
        cellStyle: { textAlign: 'right', color: '#1976d2' },
      },
      {
        headerName: 'ケース',
        field: 'totalPackages',
        width: 60,
        cellStyle: { textAlign: 'center', fontWeight: '500' },
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
      rowHeight: 36,
      headerHeight: 40,
      suppressMovableColumns: true,
      suppressCellFocus: false,
      enableCellTextSelection: true,
      rowSelection: 'single',
      animateRows: true,
      enableRangeSelection: true,
      // ストライプ行
      getRowStyle: (params) => {
        if (params.node.rowIndex! % 2 === 0) {
          return { background: '#fafafa' };
        }
        return { background: '#ffffff' };
      },
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
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" component="span">
            配分表プレビュー
          </Typography>
          {formData.deliveryDate && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              店着日: {format(formData.deliveryDate, 'yyyy年M月d日(E)', { locale: ja })}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Box
          className="ag-theme-alpine"
          sx={{
            width: '100%',
            height: 'calc(90vh - 150px)',
            '& .ag-header': {
              backgroundColor: '#f5f5f5',
              borderBottom: '2px solid #e0e0e0',
            },
            '& .ag-header-cell': {
              fontWeight: '600',
              fontSize: '0.75rem',
              padding: '4px 8px',
            },
            '& .store-header': {
              backgroundColor: '#e8eaf6',
              fontSize: '0.7rem',
            },
            '& .ag-cell': {
              fontSize: '0.8rem',
              lineHeight: '36px',
              padding: '0 8px',
            },
            '& .ag-row:hover': {
              backgroundColor: '#f5f5f5 !important',
            },
            '& .ag-pinned-left-header, & .ag-pinned-left-cols-container': {
              boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
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

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
          商品数: {formData.products.length}件
        </Typography>
        <Button onClick={onClose} variant="contained">
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
};
