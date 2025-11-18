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
import type { ColDef, GridOptions } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { OrderFormData } from '@/schemas/orderSchema';
import { STORE_DATA } from '@/utils/constants';

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
  rowType: 'data' | 'detail' | 'blank';
  deliveryDate?: string;
  origin?: string;
  specification?: string;
  productName?: string;
  storeCost?: string;
  priceExcludingTax?: string;
  priceIncludingTax?: string;
  totalPackages?: string;
  quantityPerPackage?: string;
  supplier?: string;
  total?: string;
  totalDelivery?: string;
  difference?: string;
  [key: string]: string | undefined; // Store allocations (store_01, store_02, etc.)
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

      // Row 1: データ行
      const dataRow: GridRowData = {
        rowType: 'data',
        deliveryDate: formData.deliveryDate
          ? format(formData.deliveryDate, 'M/d(E)', { locale: ja })
          : '',
        origin: product.origin || '',
        specification: product.specification || '',
        storeCost: product.storeCost ? `¥${product.storeCost.toLocaleString()}` : '',
        priceExcludingTax: product.priceExcludingTax
          ? `¥${product.priceExcludingTax.toLocaleString()}`
          : '',
        totalPackages: totalPackages ? totalPackages.toString() : '',
        total: totalAllocated ? totalAllocated.toString() : '0',
        totalDelivery: totalPackages ? totalPackages.toString() : '',
        difference: difference.toString(),
        supplier: formData.supplier || '',
      };

      // Row 2: 詳細行（商品名、税込価格、入数、店舗配分）
      const detailRow: GridRowData = {
        rowType: 'detail',
        productName: product.name || '',
        priceIncludingTax: product.priceExcludingTax
          ? `¥${Math.round(product.priceExcludingTax * 1.08).toLocaleString()}`
          : '',
        quantityPerPackage: product.quantityPerPackage
          ? `${product.quantityPerPackage}${product.unit || ''}`
          : '',
      };

      // 各店舗の配分数を追加
      STORE_DATA.forEach((store, index) => {
        const allocation = product.storeAllocations[index] || 0;
        detailRow[`store_${store.code}`] = allocation > 0 ? allocation.toString() : '';
      });

      // Row 3: 空白行（Excelではマージされる）
      const blankRow: GridRowData = {
        rowType: 'blank',
      };

      rows.push(dataRow, detailRow, blankRow);
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
        width: 100,
        cellStyle: { textAlign: 'center' },
        valueGetter: (params) =>
          params.data?.rowType === 'data' ? params.data.deliveryDate : '',
      },
      {
        headerName: '産地',
        field: 'origin',
        width: 120,
        valueGetter: (params) =>
          params.data?.rowType === 'data' ? params.data.origin : '',
      },
      {
        headerName: '規格',
        field: 'specification',
        width: 100,
        valueGetter: (params) =>
          params.data?.rowType === 'data' ? params.data.specification : '',
      },
      {
        headerName: '品名',
        field: 'productName',
        width: 150,
        valueGetter: (params) =>
          params.data?.rowType === 'detail' ? params.data.productName : '',
      },
      {
        headerName: '店着原価',
        field: 'storeCost',
        width: 100,
        cellStyle: { textAlign: 'right' },
        valueGetter: (params) =>
          params.data?.rowType === 'data' ? params.data.storeCost : '',
      },
      {
        headerName: '税抜',
        field: 'priceExcludingTax',
        width: 100,
        cellStyle: { textAlign: 'right' },
        valueGetter: (params) =>
          params.data?.rowType === 'data' ? params.data.priceExcludingTax : '',
      },
      {
        headerName: '税込',
        field: 'priceIncludingTax',
        width: 100,
        cellStyle: { textAlign: 'right' },
        valueGetter: (params) =>
          params.data?.rowType === 'detail' ? params.data.priceIncludingTax : '',
      },
      {
        headerName: 'ケース',
        field: 'totalPackages',
        width: 80,
        cellStyle: { textAlign: 'center' },
        valueGetter: (params) =>
          params.data?.rowType === 'data' ? params.data.totalPackages : '',
      },
      {
        headerName: '入数',
        field: 'quantityPerPackage',
        width: 80,
        cellStyle: { textAlign: 'center' },
        valueGetter: (params) =>
          params.data?.rowType === 'detail' ? params.data.quantityPerPackage : '',
      },
    ];

    // 36店舗のカラムを追加
    STORE_DATA.forEach((store) => {
      cols.push({
        headerName: `${store.code}\n${store.name}`,
        field: `store_${store.code}`,
        width: 60,
        cellStyle: (params) => {
          const hasValue = params.data?.rowType === 'detail' && params.value;
          return {
            textAlign: 'center',
            backgroundColor: hasValue ? '#e3f2fd' : 'transparent',
          };
        },
        valueGetter: (params) =>
          params.data?.rowType === 'detail' ? params.data[`store_${store.code}`] : '',
      });
    });

    // 集計カラム
    cols.push(
      {
        headerName: '合計',
        field: 'total',
        width: 80,
        cellStyle: { textAlign: 'center', backgroundColor: '#fff3e0', fontWeight: 'bold' },
        valueGetter: (params) =>
          params.data?.rowType === 'data' ? params.data.total : '',
      },
      {
        headerName: '納品数',
        field: 'totalDelivery',
        width: 80,
        cellStyle: { textAlign: 'center', fontWeight: 'bold' },
        valueGetter: (params) =>
          params.data?.rowType === 'data' ? params.data.totalDelivery : '',
      },
      {
        headerName: '差異',
        field: 'difference',
        width: 80,
        cellStyle: (params) => {
          const diff = params.data?.rowType === 'data' ? parseInt(params.data.difference || '0', 10) : 0;
          return {
            textAlign: 'center',
            backgroundColor: diff !== 0 ? '#ffebee' : '#e8f5e9',
            color: diff !== 0 ? '#c62828' : '#2e7d32',
            fontWeight: 'bold',
          };
        },
        valueGetter: (params) =>
          params.data?.rowType === 'data' ? params.data.difference : '',
      },
      {
        headerName: '帳合先',
        field: 'supplier',
        width: 150,
        valueGetter: (params) =>
          params.data?.rowType === 'data' ? params.data.supplier : '',
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
        sortable: false,
        filter: false,
      },
      rowHeight: 35,
      headerHeight: 50,
      suppressMovableColumns: true,
      suppressCellFocus: true,
      enableCellTextSelection: true,
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

      <DialogContent dividers sx={{ p: 0, overflow: 'hidden' }}>
        <Box
          className="ag-theme-alpine"
          sx={{
            width: '100%',
            height: '100%',
          }}
        >
          <AgGridReact<GridRowData>
            rowData={rowData}
            columnDefs={columnDefs}
            gridOptions={gridOptions}
            domLayout="normal"
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
