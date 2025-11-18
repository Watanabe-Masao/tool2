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
  Chip,
  Stack,
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
  // 選択された行のデータ
  const [selectedRow, setSelectedRow] = useState<GridRowData | null>(null);

  // モーダルを閉じる時に選択をリセット
  const handleClose = () => {
    setSelectedRow(null);
    onClose();
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
      rowSelection: 'single',
      onRowClicked: (event) => {
        setSelectedRow(event.data as GridRowData);
      },
    }),
    [setSelectedRow]
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* グローバル情報エリア */}
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#fafafa', borderBottom: '1px solid #e0e0e0' }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip
              label={`店着日: ${formData.deliveryDate ? format(formData.deliveryDate, 'M/d(E)', { locale: ja }) : '-'}`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`帳合先: ${formData.supplier || '-'}`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`商品数: ${formData.products.length}件`}
              size="small"
              color="default"
            />
          </Stack>
        </Box>

        {/* 選択行の詳細情報エリア */}
        {selectedRow && (
          <Box sx={{ px: 2, py: 1.5, bgcolor: '#e3f2fd', borderBottom: '1px solid #90caf9' }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600, color: '#1565c0' }}>
              選択中の商品
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                label={`品名: ${selectedRow.productName}`}
                size="small"
                color="primary"
              />
              <Chip
                label={`店着日: ${selectedRow.deliveryDate}`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`店着原価: ${selectedRow.storeCost}`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`税抜売価: ${selectedRow.priceExcludingTax}`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`帳合先: ${selectedRow.supplier}`}
                size="small"
                variant="outlined"
              />
            </Stack>
          </Box>
        )}
        <Box
          className="ag-theme-alpine"
          sx={{
            width: '100%',
            height: selectedRow ? 'calc(90vh - 270px)' : 'calc(90vh - 200px)',
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
        <Button onClick={handleClose} variant="contained" fullWidth sx={{ maxWidth: 200 }}>
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
};
