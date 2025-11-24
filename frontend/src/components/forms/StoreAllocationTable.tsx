import React, { useMemo, useCallback } from 'react';
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

// AG Grid モジュールを登録 (コンポーネント定義前に実行)
ModuleRegistry.registerModules([AllCommunityModule]);

interface StoreRowData {
  storeCode: string;
  storeName: string;
  allocation: number;
  index: number;
  locked: boolean;
}

type ProductErrors = FieldErrors<OrderFormData>['products'] extends Array<infer T>
  ? T
  : FieldErrors<OrderFormData>;

interface StoreAllocationGridProps {
  allocations: number[];
  totalDelivery: number;
  lockedStores: Set<string>;
  setLockedStores: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleLock: (storeCode: string) => void;
  productErrors?: ProductErrors;
  onChange: (value: number[]) => void;
}

const DEFAULT_ALLOCATIONS = new Array(STORE_DATA.length).fill(0);

const StoreAllocationGrid: React.FC<StoreAllocationGridProps> = ({
  allocations,
  totalDelivery,
  lockedStores,
  setLockedStores,
  toggleLock,
  productErrors,
  onChange,
}) => {
  const totalAllocated = useMemo(
    () => allocations.reduce((sum: number, val: number) => sum + val, 0),
    [allocations]
  );

  const remaining = useMemo(() => totalDelivery - totalAllocated, [totalDelivery, totalAllocated]);

  const progressPercentage = useMemo(
    () => (totalDelivery > 0 ? (totalAllocated / totalDelivery) * 100 : 0),
    [totalAllocated, totalDelivery]
  );

  const handleChange = useCallback(
    (index: number, value: number) => {
      const newAllocations = [...allocations];
      newAllocations[index] = value < 0 ? 0 : value;
      onChange(newAllocations);
    },
    [allocations, onChange]
  );

  const handleEqualDistribution = useCallback(() => {
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

    onChange(newAllocations);
  }, [allocations, lockedStores, onChange, totalDelivery]);

  const handleClearUnlocked = useCallback(() => {
    const newAllocations = [...allocations];
    STORE_DATA.forEach((store, index) => {
      if (!lockedStores.has(store.code)) {
        newAllocations[index] = 0;
      }
    });
    onChange(newAllocations);
  }, [allocations, lockedStores, onChange]);

  const handleDistributeRemaining = useCallback(() => {
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
    const remainderCalc = remaining % unlockedIndices.length;

    unlockedIndices.forEach((index, i) => {
      newAllocations[index] += baseAmount + (i < remainderCalc ? 1 : 0);
    });

    onChange(newAllocations);
  }, [allocations, lockedStores, onChange, remaining]);

  const handleLockAll = useCallback(() => {
    const allCodes = STORE_DATA.map((store) => store.code);
    setLockedStores(new Set(allCodes));
  }, [setLockedStores]);

  const handleUnlockAll = useCallback(() => {
    setLockedStores(new Set());
  }, [setLockedStores]);

  const rowData = useMemo<StoreRowData[]>(() => {
    return STORE_DATA.map((store, index) => ({
      storeCode: store.code,
      storeName: store.name,
      allocation: allocations[index] || 0,
      index,
      locked: lockedStores.has(store.code),
    }));
  }, [allocations, lockedStores]);

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
        editable: (params) => (params.data ? !params.data.locked : false),
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
                sx={{
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                  boxShadow: 2,
                  fontWeight: 600,
                }}
              >
                均等配分
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<AutoFixHigh />}
                onClick={handleDistributeRemaining}
                disabled={remaining === 0}
                sx={{ fontWeight: 600 }}
              >
                残りを配分
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<DeleteSweep />}
                onClick={handleClearUnlocked}
                color="secondary"
                sx={{ fontWeight: 600 }}
              >
                ロック以外クリア
              </Button>
            </Box>

            {/* ロック操作 */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<LockOutlined />}
                onClick={handleLockAll}
                sx={{ fontWeight: 600 }}
              >
                全ロック
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<LockOpenOutlined />}
                onClick={handleUnlockAll}
                sx={{ fontWeight: 600 }}
              >
                全解除
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* AG Grid */}
      <Box
        className="ag-theme-quartz"
        sx={{ height: 900, width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}
      >
        <AgGridReact<StoreRowData>
          rowData={rowData}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          suppressExcelExport={true}
          domLayout="autoHeight"
        />
      </Box>
    </Box>
  );
};

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
  lockedStores,
  setLockedStores,
  selectedCategories: _selectedCategories, // TODO: カテゴリフィルター機能で使用予定
  setSelectedCategories: _setSelectedCategories, // TODO: カテゴリフィルター機能で使用予定
}) => {
  const productErrors = errors.products?.[productIndex] as ProductErrors | undefined;

  const normalizeAllocations = useCallback((value: unknown): number[] => {
    if (Array.isArray(value)) {
      const normalized = value
        .slice(0, STORE_DATA.length)
        .map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0));
      if (normalized.length < STORE_DATA.length) {
        normalized.push(...new Array(STORE_DATA.length - normalized.length).fill(0));
      }
      return normalized;
    }
    return [...DEFAULT_ALLOCATIONS];
  }, []);

  const toggleLock = useCallback(
    (storeCode: string) => {
      setLockedStores((prev) => {
        const next = new Set(prev);
        if (next.has(storeCode)) {
          next.delete(storeCode);
        } else {
          next.add(storeCode);
        }
        return next;
      });
    },
    [setLockedStores]
  );

  return (
    <Controller
      name={`products.${productIndex}.storeAllocations`}
      control={control}
      render={({ field }) => {
        const allocations = normalizeAllocations(field.value);

        return (
          <StoreAllocationGrid
            allocations={allocations}
            totalDelivery={totalDelivery}
            lockedStores={lockedStores}
            setLockedStores={setLockedStores}
            toggleLock={toggleLock}
            productErrors={productErrors}
            onChange={field.onChange}
          />
        );
      }}
    />
  );
};
