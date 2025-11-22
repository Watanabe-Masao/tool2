import React, { useMemo, useState, useCallback } from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Lock, LockOpen } from '@mui/icons-material';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { ColDef, GridOptions, ValueSetterParams, CellClassParams } from 'ag-grid-community';
import type { OrderFormData } from '@/schemas/orderSchema';
import { STORE_DATA } from '@/utils/constants';

// AG Grid モジュールを登録
ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * StoreAllocationTableのProps
 */
interface StoreAllocationTableProps {
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
 * グリッド行データの型
 */
interface StoreRowData {
  storeCode: string;
  storeName: string;
  allocation: number;
  index: number;
  locked: boolean;
}

/**
 * Step 4: 36店舗配分テーブル
 *
 * AG Gridを使用した表形式で36店舗への配分数を入力します。
 * - 編集可能なテーブル
 * - ロック機能（店舗ごとに配分を固定）
 * - リアルタイムバリデーション
 * - 合計・差分の自動計算
 */
export const StoreAllocationTable: React.FC<StoreAllocationTableProps> = ({
  productIndex,
  control,
  errors,
  totalDelivery,
}) => {
  const productErrors = errors.products?.[productIndex];
  const [lockedStores, setLockedStores] = useState<Set<string>>(new Set());

  /**
   * ロック状態をトグル
   */
  const toggleLock = useCallback((storeCode: string) => {
    setLockedStores((prev) => {
      const next = new Set(prev);
      if (next.has(storeCode)) {
        next.delete(storeCode);
      } else {
        next.add(storeCode);
      }
      return next;
    });
  }, []);

  return (
    <Controller
      name={`products.${productIndex}.storeAllocations`}
      control={control}
      render={({ field }) => {
        const allocations = field.value || new Array(36).fill(0);

        /**
         * 合計配分数を計算
         */
        const totalAllocated = allocations.reduce((sum: number, val: number) => sum + val, 0);

        /**
         * 残りの配分数を計算
         */
        const remaining = totalDelivery - totalAllocated;

        /**
         * 配分数変更ハンドラー
         */
        const handleChange = (index: number, value: number) => {
          const newAllocations = [...allocations];
          newAllocations[index] = value < 0 ? 0 : value;
          field.onChange(newAllocations);
        };

        /**
         * 行データを生成
         */
        const rowData = useMemo<StoreRowData[]>(() => {
          return STORE_DATA.map((store, index) => ({
            storeCode: store.code,
            storeName: store.name,
            allocation: allocations[index] || 0,
            index,
            locked: lockedStores.has(store.code),
          }));
        }, [allocations, lockedStores]);

        /**
         * カラム定義
         */
        const columnDefs = useMemo<ColDef<StoreRowData>[]>(
          () => [
            {
              headerName: 'ロック',
              field: 'locked',
              width: 80,
              cellRenderer: (params: any) => {
                if (!params.data) return null;
                const locked = params.data.locked;
                return (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Tooltip title={locked ? 'ロック解除' : 'ロック'}>
                      <IconButton
                        size="small"
                        onClick={() => toggleLock(params.data.storeCode)}
                        sx={{
                          color: locked ? 'warning.main' : 'action.disabled',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        {locked ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              },
              cellStyle: { textAlign: 'center' } as any,
            },
            {
              headerName: '店番',
              field: 'storeCode',
              width: 90,
              cellStyle: { fontWeight: 600, fontSize: '0.9rem', textAlign: 'center' } as any,
            },
            {
              headerName: '店舗名',
              field: 'storeName',
              width: 200,
              cellStyle: { fontWeight: 500, fontSize: '0.9rem' } as any,
            },
            {
              headerName: '配分数',
              field: 'allocation',
              width: 120,
              editable: (params) => params.data ? !params.data.locked : false,
              valueSetter: (params: ValueSetterParams<StoreRowData>) => {
                if (!params.data) return false;
                const value = parseInt(params.newValue, 10);
                if (!isNaN(value) && value >= 0) {
                  handleChange(params.data.index, value);
                  return true;
                }
                return false;
              },
              cellClass: (params: CellClassParams<StoreRowData>) => {
                if (!params.data) return [];
                const classes = ['allocation-cell'];
                if (params.data.locked) {
                  classes.push('locked-cell');
                } else if (params.value && params.value > 0) {
                  classes.push('allocated-cell');
                }
                return classes;
              },
              cellStyle: (params) => {
                if (!params.data) return {};
                return {
                  textAlign: 'center',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  backgroundColor: params.data.locked
                    ? '#fff3e0'
                    : params.value && params.value > 0
                    ? '#e3f2fd'
                    : 'transparent',
                  color: params.data.locked
                    ? '#f57c00'
                    : params.value && params.value > 0
                    ? '#1565c0'
                    : '#bdbdbd',
                  cursor: params.data.locked ? 'not-allowed' : 'pointer',
                } as any;
              },
              valueFormatter: (params) => {
                return params.value && params.value > 0 ? params.value.toString() : '-';
              },
            },
          ],
          [lockedStores, toggleLock, handleChange]
        );

        /**
         * グリッドオプション
         */
        const gridOptions = useMemo<GridOptions<StoreRowData>>(
          () => ({
            defaultColDef: {
              resizable: true,
              sortable: true,
              filter: false,
            },
            rowHeight: 45,
            headerHeight: 45,
            suppressMovableColumns: true,
            suppressCellFocus: false,
            enableCellTextSelection: false,
            animateRows: true,
            singleClickEdit: true,
            stopEditingWhenCellsLoseFocus: true,
          }),
          []
        );

        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
              店舗への配分数を入力してください
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              36店舗への配分数を入力してください。合計が総納品数と一致する必要があります。
              <br />
              <strong>ロックアイコン</strong>をクリックすると、その店舗の配分数を固定できます。
            </Typography>

            {/* エラー表示 */}
            {productErrors?.storeAllocations && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {productErrors.storeAllocations.message}
              </Alert>
            )}

            {/* 統計情報 */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      総納品数
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {totalDelivery}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      配分済み
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 700 }}
                      color={remaining === 0 ? 'success.main' : 'text.primary'}
                    >
                      {totalAllocated}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      残り
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 700 }}
                      color={
                        remaining === 0 ? 'success.main' : remaining < 0 ? 'error.main' : 'warning.main'
                      }
                    >
                      {remaining}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 'auto' }}>
                    {remaining === 0 ? (
                      <Chip label="✓ 配分完了" color="success" size="medium" sx={{ fontWeight: 600 }} />
                    ) : remaining > 0 ? (
                      <Chip
                        label={`残り ${remaining} 個`}
                        color="warning"
                        size="medium"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Chip
                        label={`${Math.abs(remaining)} 個超過`}
                        color="error"
                        size="medium"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      ロック中
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }} color="warning.main">
                      {lockedStores.size} 店舗
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* 店舗配分テーブル */}
            <Box
              className="ag-theme-alpine"
              sx={{
                width: '100%',
                height: 600,
                '& .ag-header': {
                  backgroundColor: '#f8f9fa',
                  borderBottom: '2px solid #dee2e6',
                  fontWeight: 700,
                },
                '& .ag-header-cell': {
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  padding: '8px',
                },
                '& .ag-cell': {
                  fontSize: '0.9rem',
                  lineHeight: '45px',
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                },
                '& .ag-row:hover': {
                  backgroundColor: '#f5f5f5 !important',
                },
                '& .ag-row-even': {
                  backgroundColor: '#ffffff',
                },
                '& .ag-row-odd': {
                  backgroundColor: '#fafafa',
                },
                '& .allocation-cell': {
                  transition: 'all 0.2s',
                },
                '& .locked-cell': {
                  cursor: 'not-allowed',
                },
                '& .allocated-cell:hover': {
                  backgroundColor: '#bbdefb !important',
                },
              }}
            >
              <AgGridReact<StoreRowData>
                rowData={rowData}
                columnDefs={columnDefs}
                gridOptions={gridOptions}
              />
            </Box>

            {/* 操作ガイド */}
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
                <strong>操作方法：</strong>
              </Typography>
              <Typography variant="caption" component="div">
                • 配分数セルをクリックして数値を入力
              </Typography>
              <Typography variant="caption" component="div">
                • <Lock fontSize="inherit" /> アイコンをクリックして配分を固定・解除
              </Typography>
              <Typography variant="caption" component="div">
                • ロックされた店舗は編集不可（オレンジ色で表示）
              </Typography>
            </Alert>
          </Box>
        );
      }}
    />
  );
};
