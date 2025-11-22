import React, { useMemo, useState, useCallback } from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  IconButton,
  Tooltip,
  Button,
  Divider,
  LinearProgress,
  Stack,
} from '@mui/material';
import {
  Lock,
  LockOpen,
  LockOpenOutlined,
  LockOutlined,
  DeleteSweep,
  Functions,
  AutoFixHigh,
  CheckCircle,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
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
         * 配分進捗率を計算
         */
        const progressPercentage = totalDelivery > 0 ? (totalAllocated / totalDelivery) * 100 : 0;

        /**
         * 配分数変更ハンドラー
         */
        const handleChange = (index: number, value: number) => {
          const newAllocations = [...allocations];
          newAllocations[index] = value < 0 ? 0 : value;
          field.onChange(newAllocations);
        };

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
            {/* ヘッダーセクション */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ mb: 1, fontWeight: 700, color: 'primary.main' }}>
                店舗配分入力
              </Typography>
              <Typography variant="body2" color="text.secondary">
                36店舗への配分数を入力してください。合計が総納品数と一致する必要があります。
              </Typography>
            </Box>

            {/* エラー表示 */}
            {productErrors?.storeAllocations && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {productErrors.storeAllocations.message}
              </Alert>
            )}

            {/* クイックアクションボタン */}
            <Card
              variant="outlined"
              sx={{
                mb: 3,
                borderColor: 'primary.200',
                bgcolor: 'primary.50',
              }}
            >
              <CardContent sx={{ py: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'primary.dark' }}>
                  クイック操作
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  <Tooltip title="全店舗に均等配分" arrow>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Functions />}
                      onClick={handleEqualDistribution}
                      disabled={totalDelivery === 0}
                      sx={{
                        borderRadius: 1.5,
                        px: 2,
                        fontWeight: 600,
                        boxShadow: 1,
                        '&:hover': { boxShadow: 3 },
                      }}
                    >
                      均等配分
                    </Button>
                  </Tooltip>
                  <Tooltip title="残りの数量を未ロック店舗に均等配分" arrow>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AutoFixHigh />}
                      onClick={handleDistributeRemaining}
                      disabled={remaining <= 0}
                      color="success"
                      sx={{
                        borderRadius: 1.5,
                        px: 2,
                        fontWeight: 600,
                        boxShadow: 1,
                        '&:hover': { boxShadow: 3 },
                      }}
                    >
                      残りを配分
                    </Button>
                  </Tooltip>
                  <Tooltip title="未ロック店舗の配分をクリア" arrow>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DeleteSweep />}
                      onClick={handleClearUnlocked}
                      sx={{
                        borderRadius: 1.5,
                        px: 2,
                        fontWeight: 600,
                      }}
                    >
                      未ロックをクリア
                    </Button>
                  </Tooltip>
                  <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                  <Tooltip title="全店舗をロック" arrow>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LockOutlined />}
                      onClick={handleLockAll}
                      color="warning"
                      sx={{
                        borderRadius: 1.5,
                        px: 2,
                        fontWeight: 600,
                      }}
                    >
                      全ロック
                    </Button>
                  </Tooltip>
                  <Tooltip title="全店舗のロックを解除" arrow>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LockOpenOutlined />}
                      onClick={handleUnlockAll}
                      color="info"
                      sx={{
                        borderRadius: 1.5,
                        px: 2,
                        fontWeight: 600,
                      }}
                    >
                      全解除
                    </Button>
                  </Tooltip>
                </Stack>
              </CardContent>
            </Card>

            {/* 統計情報カード */}
            <Card
              variant="outlined"
              sx={{
                mb: 3,
                borderWidth: 2,
                borderColor: remaining === 0 ? 'success.main' : remaining < 0 ? 'error.main' : 'warning.main',
                bgcolor: remaining === 0 ? 'success.50' : remaining < 0 ? 'error.50' : 'warning.50',
              }}
            >
              <CardContent>
                {/* 進捗バー */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      配分進捗
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {progressPercentage.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(progressPercentage, 100)}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 5,
                        bgcolor: remaining === 0 ? 'success.main' : remaining < 0 ? 'error.main' : 'warning.main',
                      },
                    }}
                  />
                </Box>

                {/* 統計数値 */}
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                      総納品数
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {totalDelivery}
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                      配分済み
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 700 }}
                      color={remaining === 0 ? 'success.main' : 'text.primary'}
                    >
                      {totalAllocated}
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                      残り
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 700 }}
                      color={remaining === 0 ? 'success.main' : remaining < 0 ? 'error.main' : 'warning.main'}
                    >
                      {remaining}
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                      ロック中
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }} color="warning.main">
                      {lockedStores.size} 店舗
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                    {remaining === 0 ? (
                      <>
                        <CheckCircle sx={{ fontSize: 32, color: 'success.main' }} />
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                            配分完了
                          </Typography>
                          <Typography variant="caption" color="success.dark">
                            すべて配分されました
                          </Typography>
                        </Box>
                      </>
                    ) : remaining > 0 ? (
                      <>
                        <WarningIcon sx={{ fontSize: 32, color: 'warning.main' }} />
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main' }}>
                            残り {remaining} 個
                          </Typography>
                          <Typography variant="caption" color="warning.dark">
                            配分が不足しています
                          </Typography>
                        </Box>
                      </>
                    ) : (
                      <>
                        <ErrorIcon sx={{ fontSize: 32, color: 'error.main' }} />
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>
                            {Math.abs(remaining)} 個超過
                          </Typography>
                          <Typography variant="caption" color="error.dark">
                            配分が超過しています
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* 店舗配分テーブル */}
            <Card variant="outlined" sx={{ borderColor: 'grey.300', overflow: 'hidden' }}>
              <Box
                className="ag-theme-alpine"
                sx={{
                  width: '100%',
                  height: 600,
                  '& .ag-root-wrapper': {
                    border: 'none',
                  },
                  '& .ag-header': {
                    backgroundColor: 'primary.main',
                    borderBottom: '3px solid',
                    borderBottomColor: 'primary.dark',
                  },
                  '& .ag-header-cell': {
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    padding: '8px',
                    color: 'white',
                    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                  },
                  '& .ag-header-cell:last-child': {
                    borderRight: 'none',
                  },
                  '& .ag-cell': {
                    fontSize: '0.9rem',
                    lineHeight: '45px',
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRight: '1px solid #e0e0e0',
                  },
                  '& .ag-cell:last-child': {
                    borderRight: 'none',
                  },
                  '& .ag-row': {
                    borderBottom: '1px solid #e0e0e0',
                  },
                  '& .ag-row:hover': {
                    backgroundColor: '#f5f5f5 !important',
                    boxShadow: 'inset 0 0 0 1px rgba(25, 118, 210, 0.2)',
                  },
                  '& .ag-row-even': {
                    backgroundColor: '#ffffff',
                  },
                  '& .ag-row-odd': {
                    backgroundColor: '#fafafa',
                  },
                  '& .allocation-cell': {
                    transition: 'all 0.2s ease-in-out',
                  },
                  '& .locked-cell': {
                    cursor: 'not-allowed',
                    boxShadow: 'inset 0 0 0 1px rgba(245, 124, 0, 0.3)',
                  },
                  '& .allocated-cell': {
                    boxShadow: 'inset 0 0 0 1px rgba(21, 101, 192, 0.2)',
                  },
                  '& .allocated-cell:hover': {
                    backgroundColor: '#bbdefb !important',
                    boxShadow: 'inset 0 0 0 2px rgba(21, 101, 192, 0.4)',
                    transform: 'scale(1.02)',
                  },
                }}
              >
                <AgGridReact<StoreRowData>
                  rowData={rowData}
                  columnDefs={columnDefs}
                  gridOptions={gridOptions}
                />
              </Box>
            </Card>

            {/* 操作ガイド */}
            <Card variant="outlined" sx={{ mt: 3, bgcolor: 'grey.50', borderColor: 'grey.300' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: 'text.primary' }}>
                  💡 操作ガイド
                </Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box
                      sx={{
                        minWidth: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                      }}
                    >
                      1
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        配分数セルをクリックして数値を入力
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        各店舗の配分数欄をクリックすると編集できます。負の値は入力できません。
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box
                      sx={{
                        minWidth: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: 'warning.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                      }}
                    >
                      2
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        <Lock fontSize="inherit" sx={{ mr: 0.5 }} /> ロック機能で配分を固定
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ロックアイコンをクリックすると、その店舗の配分数を固定できます。ロックされた店舗は編集不可（オレンジ色で表示）。
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box
                      sx={{
                        minWidth: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                      }}
                    >
                      3
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        クイック操作で効率的に配分
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        均等配分・残りを配分などのボタンを使用すると、ロックされていない店舗に自動で配分されます。
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        );
      }}
    />
  );
};
