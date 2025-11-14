import React, { useMemo, useCallback } from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellValueChangedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';
import { Box, Typography, Card, CardContent, Alert, Chip } from '@mui/material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { STORE_NAMES } from '@/utils/constants';

/**
 * StoreAllocationGridのProps
 */
interface StoreAllocationGridProps {
  /** 商品のインデックス */
  productIndex: number;
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** 総納品数 */
  totalDelivery: number;
}

/**
 * 店舗行データの型
 */
interface StoreRowData {
  /** 店舗ID (0-35) */
  id: number;
  /** 店舗名 */
  storeName: string;
  /** 配分数 */
  quantity: number;
}

/**
 * Step 5: 36店舗配分グリッド
 *
 * ag-Gridを使用して36店舗への配分数を入力します。
 * - 編集可能なグリッド
 * - リアルタイムバリデーション
 * - 合計・差分の自動計算
 */
export const StoreAllocationGrid: React.FC<StoreAllocationGridProps> = ({
  productIndex,
  control,
  errors,
  totalDelivery,
}) => {
  const productErrors = errors.products?.[productIndex];

  /**
   * 列定義
   */
  const columnDefs = useMemo<ColDef<StoreRowData>[]>(
    () => [
      {
        field: 'storeName',
        headerName: '店舗',
        editable: false,
        flex: 1,
        minWidth: 150,
        cellStyle: { fontWeight: 500 },
      },
      {
        field: 'quantity',
        headerName: '配分数',
        editable: true,
        flex: 1,
        minWidth: 120,
        type: 'numericColumn',
        valueParser: (params) => {
          const value = params.newValue;
          const num = Number(value);
          return isNaN(num) || num < 0 ? 0 : Math.floor(num);
        },
        cellStyle: (params) => {
          if (params.value > 0) {
            return { backgroundColor: '#e8f5e9', fontWeight: 600 };
          }
          return undefined;
        },
      },
    ],
    []
  );

  /**
   * デフォルト列定義
   */
  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  return (
    <Controller
      name={`products.${productIndex}.storeAllocations`}
      control={control}
      render={({ field }) => {
        const allocations = field.value || new Array(36).fill(0);

        /**
         * 行データを作成
         */
        const rowData: StoreRowData[] = STORE_NAMES.map((storeName, index) => ({
          id: index,
          storeName,
          quantity: allocations[index] || 0,
        }));

        /**
         * 合計配分数を計算
         */
        const totalAllocated = allocations.reduce((sum: number, val: number) => sum + val, 0);

        /**
         * 残りの配分数を計算
         */
        const remaining = totalDelivery - totalAllocated;

        /**
         * セル値変更時のハンドラ
         */
        const handleCellValueChanged = useCallback(
          (event: CellValueChangedEvent<StoreRowData>) => {
            const newAllocations = [...allocations];
            newAllocations[event.data!.id] = event.data!.quantity;
            field.onChange(newAllocations);
          },
          [allocations, field]
        );

        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              店舗への配分数を入力してください
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              36店舗への配分数を入力してください。合計が総納品数と一致する必要があります。
            </Typography>

            {/* エラー表示 */}
            {productErrors?.storeAllocations && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {productErrors.storeAllocations.message}
              </Alert>
            )}

            {/* 統計情報 */}
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      総納品数
                    </Typography>
                    <Typography variant="h6">{totalDelivery}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      配分済み
                    </Typography>
                    <Typography variant="h6" color={remaining === 0 ? 'success.main' : 'text.primary'}>
                      {totalAllocated}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      残り
                    </Typography>
                    <Typography
                      variant="h6"
                      color={remaining === 0 ? 'success.main' : remaining < 0 ? 'error.main' : 'warning.main'}
                    >
                      {remaining}
                    </Typography>
                  </Box>
                </Box>

                {/* ステータスチップ */}
                <Box sx={{ mt: 2 }}>
                  {remaining === 0 ? (
                    <Chip label="配分完了" color="success" size="small" />
                  ) : remaining > 0 ? (
                    <Chip label={`残り ${remaining} 個を配分してください`} color="warning" size="small" />
                  ) : (
                    <Chip label={`${Math.abs(remaining)} 個超過しています`} color="error" size="small" />
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* ag-Gridテーブル */}
            <div className="ag-theme-material" style={{ height: 600, width: '100%' }}>
              <AgGridReact<StoreRowData>
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                onCellValueChanged={handleCellValueChanged}
                suppressMovableColumns
                animateRows
                rowSelection="single"
              />
            </div>
          </Box>
        );
      }}
    />
  );
};
