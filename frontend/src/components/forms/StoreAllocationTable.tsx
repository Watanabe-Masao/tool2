import React, { useMemo, useCallback } from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Button,
  Divider,
  LinearProgress,
  IconButton,
} from '@mui/material';
import {
  LockOpenOutlined,
  LockOutlined,
  DeleteSweep,
  Functions,
  AutoFixHigh,
  CheckCircle,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Lock,
  LockOpen,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import type { OrderFormData } from '@/schemas/orderSchema';
import { STORE_DATA } from '@/utils/constants';

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
  /** ロックされた店舗のSet */
  lockedStores: Set<string>;
  /** ロック状態更新関数 */
  setLockedStores: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** 選択されたカテゴリのSet */
  selectedCategories: Set<string>;
  /** カテゴリ選択更新関数 */
  setSelectedCategories: React.Dispatch<React.SetStateAction<Set<string>>>;
}

/**
 * グリッド行データの型
 */
interface StoreRowData {
  id: string;
  storeCode: string;
  storeName: string;
  allocation: number;
  locked: boolean;
}

/**
 * Step 4: 36店舗配分テーブル
 *
 * MUI DataGridを使用した表形式で36店舗への配分数を入力します。
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
  lockedStores,
  setLockedStores,
  selectedCategories: _selectedCategories,
  setSelectedCategories: _setSelectedCategories,
}) => {
  const productErrors = errors.products?.[productIndex];

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
  }, [setLockedStores]);

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
         * 配分進捗率を計算
         */
        const progressPercentage = totalDelivery > 0 ? (totalAllocated / totalDelivery) * 100 : 0;

        /**
         * 均等配分（ロックされていない店舗に）
         */
        const handleEqualDistribution = () => {
          if (totalDelivery === 0) return;

          const unlockedIndices: number[] = [];
          STORE_DATA.forEach((store, index) => {
            if (!lockedStores.has(store.code)) {
              unlockedIndices.push(index);
            }
          });

          if (unlockedIndices.length === 0) return;

          const newAllocations = [...allocations];
          const baseAmount = Math.floor(totalDelivery / unlockedIndices.length);
          const remainder = totalDelivery % unlockedIndices.length;

          unlockedIndices.forEach((index, i) => {
            newAllocations[index] = baseAmount + (i < remainder ? 1 : 0);
          });

          field.onChange(newAllocations);
        };

        /**
         * クリア（ロックされていない店舗のみ）
         */
        const handleClearUnlocked = () => {
          const newAllocations = [...allocations];
          STORE_DATA.forEach((store, index) => {
            if (!lockedStores.has(store.code)) {
              newAllocations[index] = 0;
            }
          });
          field.onChange(newAllocations);
        };

        /**
         * 残りを均等配分（ロックされていない店舗に）
         */
        const handleDistributeRemaining = () => {
          if (remaining <= 0) return;

          const unlockedIndices: number[] = [];
          STORE_DATA.forEach((store, index) => {
            if (!lockedStores.has(store.code)) {
              unlockedIndices.push(index);
            }
          });

          if (unlockedIndices.length === 0) return;

          const newAllocations = [...allocations];
          const baseAmount = Math.floor(remaining / unlockedIndices.length);
          const remainder_calc = remaining % unlockedIndices.length;

          unlockedIndices.forEach((index, i) => {
            newAllocations[index] += baseAmount + (i < remainder_calc ? 1 : 0);
          });

          field.onChange(newAllocations);
        };

        /**
         * すべてロック
         */
        const handleLockAll = () => {
          const allCodes = STORE_DATA.map((store) => store.code);
          setLockedStores(new Set(allCodes));
        };

        /**
         * すべてロック解除
         */
        const handleUnlockAll = () => {
          setLockedStores(new Set());
        };

        /**
         * 行データを生成
         */
        const rows = useMemo<StoreRowData[]>(() => {
          return STORE_DATA.map((store, index) => ({
            id: store.code,
            storeCode: store.code,
            storeName: store.name,
            allocation: allocations[index] || 0,
            locked: lockedStores.has(store.code),
          }));
        }, [allocations, lockedStores]);

        /**
         * カラム定義
         */
        const columns = useMemo<GridColDef<StoreRowData>[]>(() => [
          {
            field: 'locked',
            headerName: 'ロック',
            width: 80,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<StoreRowData>) => (
              <IconButton
                size="small"
                onClick={() => toggleLock(params.row.storeCode)}
                sx={{
                  color: params.row.locked ? '#f57c00' : '#9e9e9e',
                }}
              >
                {params.row.locked ? <Lock /> : <LockOpen />}
              </IconButton>
            ),
          },
          {
            field: 'storeCode',
            headerName: '店番',
            width: 90,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
          },
          {
            field: 'storeName',
            headerName: '店舗名',
            width: 200,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
          },
          {
            field: 'allocation',
            headerName: '配分数',
            width: 120,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            editable: true,
            type: 'number',
            renderCell: (params: GridRenderCellParams<StoreRowData>) => {
              const value = params.value as number;
              return (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '1.1rem',
                    color: params.row.locked
                      ? '#f57c00'
                      : value > 0
                      ? '#1565c0'
                      : '#bdbdbd',
                  }}
                >
                  {value > 0 ? value : '-'}
                </Box>
              );
            },
          },
        ], [toggleLock, lockedStores]);

        /**
         * セル更新処理（React#185対策: 非同期更新）
         */
        const processRowUpdate = useCallback((newRow: StoreRowData, oldRow: StoreRowData) => {
          // ロックされている場合は更新しない
          if (newRow.locked) {
            return oldRow;
          }

          // 値を検証
          const value = Math.max(0, Math.floor(newRow.allocation || 0));

          // 配列のインデックスを取得
          const storeIndex = STORE_DATA.findIndex((store) => store.code === newRow.storeCode);
          if (storeIndex === -1) return oldRow;

          // React#185対策: DataGridの更新サイクル完了後にフォーム更新
          queueMicrotask(() => {
            const newAllocations = [...allocations];
            newAllocations[storeIndex] = value;
            field.onChange(newAllocations);
          });

          return { ...newRow, allocation: value };
        }, [allocations, field]);

        /**
         * セルが編集可能かどうか
         */
        const isCellEditable = useCallback((params: any) => {
          return params.field === 'allocation' && !params.row.locked;
        }, []);

        return (
          <Box sx={{ py: 2 }}>
            {/* ヘッダー */}
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>
              店舗配分入力
            </Typography>

            {/* エラー表示 */}
            {productErrors?.storeAllocations && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {productErrors.storeAllocations.message}
              </Alert>
            )}

            {/* 統計 + 操作カード */}
            <Card
              variant="outlined"
              sx={{
                mb: 2,
                borderWidth: 2,
                borderColor: remaining === 0 ? 'success.main' : remaining < 0 ? 'error.main' : 'warning.main',
                borderRadius: 2,
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                {/* 統計エリア */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  {/* 左側：主要統計 */}
                  <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', display: 'block', mb: 0.25 }}>
                        総納品数
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', lineHeight: 1 }}>
                        {totalDelivery}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', display: 'block', mb: 0.25 }}>
                        配分済み
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1, color: remaining === 0 ? 'success.main' : 'text.primary' }}>
                        {totalAllocated}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', display: 'block', mb: 0.25 }}>
                        残り
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          lineHeight: 1,
                          color: remaining === 0 ? 'success.main' : remaining < 0 ? 'error.main' : 'warning.main'
                        }}
                      >
                        {remaining}
                      </Typography>
                    </Box>
                  </Box>

                  {/* 右側：ステータス */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', display: 'block' }}>
                        ロック中
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main' }}>
                        {lockedStores.size}店舗
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 100 }}>
                      {remaining === 0 ? (
                        <>
                          <CheckCircle sx={{ fontSize: 24, color: 'success.main' }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main', lineHeight: 1.2 }}>
                              完了
                            </Typography>
                          </Box>
                        </>
                      ) : remaining > 0 ? (
                        <>
                          <WarningIcon sx={{ fontSize: 24, color: 'warning.main' }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main', lineHeight: 1.2 }}>
                              残り{remaining}
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <>
                          <ErrorIcon sx={{ fontSize: 24, color: 'error.main' }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main', lineHeight: 1.2 }}>
                              {Math.abs(remaining)}超過
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* 進捗バー */}
                <Box sx={{ mb: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(progressPercentage, 100)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: remaining === 0 ? 'success.main' : remaining < 0 ? 'error.main' : 'warning.main',
                      },
                    }}
                  />
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', mt: 0.5, display: 'block', textAlign: 'right' }}>
                    {progressPercentage.toFixed(1)}%
                  </Typography>
                </Box>

                {/* 操作ボタングループ */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {/* 配分操作 */}
                  <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Functions />}
                      onClick={handleEqualDistribution}
                      disabled={totalDelivery === 0}
                      sx={{ fontSize: '0.75rem', flex: 1 }}
                    >
                      均等配分
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AutoFixHigh />}
                      onClick={handleDistributeRemaining}
                      disabled={remaining <= 0}
                      color="success"
                      sx={{ fontSize: '0.75rem', flex: 1 }}
                    >
                      残りを配分
                    </Button>
                  </Box>

                  <Divider orientation="vertical" flexItem />

                  {/* クリア・ロック操作 */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DeleteSweep />}
                      onClick={handleClearUnlocked}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      クリア
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LockOutlined />}
                      onClick={handleLockAll}
                      color="warning"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      全ロック
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LockOpenOutlined />}
                      onClick={handleUnlockAll}
                      color="info"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      全解除
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* 店舗配分テーブル */}
            <Card variant="outlined" sx={{ borderColor: 'grey.300', overflow: 'hidden' }}>
              <Box sx={{ height: 500, width: '100%' }}>
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
                    },
                    '& .MuiDataGrid-cell:last-child': {
                      borderRight: 'none',
                    },
                    '& .MuiDataGrid-columnHeader': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                    },
                    '& .MuiDataGrid-columnHeader:last-child': {
                      borderRight: 'none',
                    },
                    '& .MuiDataGrid-row:hover': {
                      backgroundColor: '#f5f5f5',
                    },
                    '& .MuiDataGrid-row:nth-of-type(even)': {
                      backgroundColor: '#ffffff',
                    },
                    '& .MuiDataGrid-row:nth-of-type(odd)': {
                      backgroundColor: '#fafafa',
                    },
                    '& .MuiDataGrid-cell[data-field="allocation"]': {
                      backgroundColor: (theme) => {
                        const row = rows.find(r => r.id === (theme as any).id);
                        if (!row) return 'transparent';
                        return row.locked ? '#fff3e0' : row.allocation > 0 ? '#e3f2fd' : 'transparent';
                      },
                    },
                  }}
                />
              </Box>
            </Card>
          </Box>
        );
      }}
    />
  );
};
