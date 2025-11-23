import React, { useState, useMemo, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Stack,
  Card,
  CardContent,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  LinearProgress,
} from '@mui/material';
import {
  Lock,
  Functions,
  AutoFixHigh,
  DeleteSweep,
  CheckCircle,
  Warning as WarningIcon,
  Error as ErrorIcon,
  LockOutlined,
  LockOpenOutlined,
} from '@mui/icons-material';
import { STORE_DATA, STORE_COUNT } from '@/utils/constants';
import type { OrderFormData } from '@/schemas/orderSchema';
import { StoreSettingsService } from '@/services/firebase/storeSettingsService';
import { StoreCategoryService } from '@/services/firebase/storeCategoryService';
import { useAuthContext } from '@/context/AuthContext';
import type { StoreSettings } from '@/types/storeSettings';
import type { StoreCategory } from '@/types/storeCategory';

/**
 * カテゴリの色を取得（落ち着いた色合い）
 */
const getCategoryColor = (index: number): { main: string; light: string } => {
  const colors = [
    { main: '#5c6bc0', light: '#e8eaf6' }, // Indigo
    { main: '#66bb6a', light: '#e8f5e9' }, // Green
    { main: '#ff9800', light: '#fff3e0' }, // Orange
    { main: '#ec407a', light: '#fce4ec' }, // Pink
    { main: '#26a69a', light: '#e0f2f1' }, // Teal
    { main: '#ab47bc', light: '#f3e5f5' }, // Purple
    { main: '#42a5f5', light: '#e3f2fd' }, // Blue
    { main: '#8d6e63', light: '#efebe9' }, // Brown
  ];
  return colors[index % colors.length];
};

/**
 * StoreAllocationMobileのProps
 */
interface StoreAllocationMobileProps {
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
 * 店舗配分入力（モバイル最適化版）
 *
 * 機能:
 * - 1-6項目: 縦並び
 * - 7項目: 配分数量入力を横スクロール可能なカード形式
 */
export const StoreAllocationMobile: React.FC<StoreAllocationMobileProps> = ({
  productIndex,
  control,
  errors,
  totalDelivery,
  lockedStores,
  setLockedStores,
  selectedCategories,
  setSelectedCategories,
}) => {
  const { user } = useAuthContext();
  const [storeSettings, setStoreSettings] = useState<Record<string, StoreSettings>>({});
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // 店舗設定とカテゴリを読み込み
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // 店舗設定を読み込み
        const settingsData = await StoreSettingsService.getAll(user.uid);
        const settingsMap: Record<string, StoreSettings> = {};
        settingsData.forEach((setting) => {
          settingsMap[setting.storeCode] = setting;
        });
        setStoreSettings(settingsMap);

        // カテゴリを読み込み
        const categoriesData = await StoreCategoryService.getAll(user.uid);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // 有効な店舗のみフィルタ
  const enabledStores = useMemo(() => {
    return STORE_DATA.filter((store) => {
      const setting = storeSettings[store.code];
      return setting?.enabled ?? true;
    });
  }, [storeSettings]);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">店舗設定を読み込んでいます...</Alert>
      </Box>
    );
  }

  return (
    <Controller
      name={`products.${productIndex}.storeAllocations`}
      control={control}
      render={({ field }) => {
        const allocations = field.value || new Array(STORE_COUNT).fill(0);
        const onChange = field.onChange;

        return (
          <StoreAllocationMobileContent
            allocations={allocations}
            onChange={onChange}
            totalDelivery={totalDelivery}
            errors={errors}
            productIndex={productIndex}
            enabledStores={enabledStores}
            categories={categories}
            storeSettings={storeSettings}
            lockedStores={lockedStores}
            setLockedStores={setLockedStores}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
          />
        );
      }}
    />
  );
};

/**
 * StoreAllocationMobileContentのProps
 */
interface StoreAllocationMobileContentProps {
  allocations: number[];
  onChange: (allocations: number[]) => void;
  totalDelivery: number;
  errors: FieldErrors<OrderFormData>;
  productIndex: number;
  enabledStores: Array<typeof STORE_DATA[number]>;
  categories: StoreCategory[];
  storeSettings: Record<string, StoreSettings>;
  /** ロックされた店舗のSet（親から渡される） */
  lockedStores: Set<string>;
  /** ロック状態更新関数 */
  setLockedStores: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** 選択されたカテゴリのSet（親から渡される） */
  selectedCategories: Set<string>;
  /** カテゴリ選択更新関数 */
  setSelectedCategories: React.Dispatch<React.SetStateAction<Set<string>>>;
}

/**
 * 配分モード
 */
type DistributionMode = 'equal' | 'ratio';

/**
 * StoreAllocationMobileの内部コンテンツ
 */
const StoreAllocationMobileContent: React.FC<StoreAllocationMobileContentProps> = ({
  allocations,
  onChange,
  totalDelivery,
  productIndex,
  enabledStores,
  categories,
  storeSettings,
  lockedStores,
  setLockedStores,
  selectedCategories,
  setSelectedCategories,
}) => {
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('ratio');

  // 長押し検出用のタイマー（固定機能用）
  const longPressTimer = React.useRef<number | null>(null);

  // 初期選択状態を設定（配分数が0より大きい店舗）
  useEffect(() => {
    const initialSelected = new Set<string>();
    STORE_DATA.forEach((store, index) => {
      if (allocations[index] > 0) {
        initialSelected.add(store.code);
      }
    });
    setSelectedStores(initialSelected);
  }, []);

  /**
   * 合計配分数を計算
   */
  const totalAllocated = useMemo(
    () => allocations.reduce((sum, val) => sum + val, 0),
    [allocations]
  );

  /**
   * 残りの配分数を計算
   */
  const remaining = totalDelivery - totalAllocated;

  /**
   * 選択した店舗のリスト（店番でソート）
   */
  const selectedStoresList = useMemo(() => {
    return enabledStores
      .filter((store) => selectedStores.has(store.code))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [enabledStores, selectedStores]);

  /**
   * 配分数変更ハンドラー
   */
  const handleChangeAllocation = (storeCode: string, value: number) => {
    const storeIndex = STORE_DATA.findIndex((s) => s.code === storeCode);
    if (storeIndex === -1) return;

    const newAllocations = [...allocations];
    newAllocations[storeIndex] = Math.max(0, value);
    onChange(newAllocations);
  };

  /**
   * 店舗選択トグル
   */
  const handleToggleStore = (storeCode: string) => {
    const newSelected = new Set(selectedStores);
    if (newSelected.has(storeCode)) {
      newSelected.delete(storeCode);
      handleChangeAllocation(storeCode, 0);
    } else {
      newSelected.add(storeCode);
    }
    setSelectedStores(newSelected);
  };

  /**
   * 均等配分（固定店舗を除外）
   */
  const handleEqualDistribution = () => {
    if (selectedStores.size === 0) return;

    const newAllocations = [...allocations];

    // 固定店舗の合計配分数を計算
    let lockedTotal = 0;
    STORE_DATA.forEach((store, index) => {
      if (lockedStores.has(store.code)) {
        lockedTotal += allocations[index] || 0;
      }
    });

    // 固定されていない選択店舗
    const unlockedSelectedStores = Array.from(selectedStores).filter(
      (code) => !lockedStores.has(code)
    );

    if (unlockedSelectedStores.length === 0) {
      // 全て固定されている場合は何もしない
      return;
    }

    // 残りの配分数
    const remainingDelivery = totalDelivery - lockedTotal;

    if (remainingDelivery < 0) {
      alert('固定された配分数が総納品数を超えています');
      return;
    }

    const perStore = Math.floor(remainingDelivery / unlockedSelectedStores.length);
    const remainder = remainingDelivery % unlockedSelectedStores.length;
    let remainderDistributed = 0;

    STORE_DATA.forEach((store, index) => {
      if (lockedStores.has(store.code)) {
        // 固定店舗はそのまま
        return;
      } else if (selectedStores.has(store.code)) {
        newAllocations[index] = perStore;
        if (remainderDistributed < remainder) {
          newAllocations[index] += 1;
          remainderDistributed++;
        }
      } else {
        newAllocations[index] = 0;
      }
    });

    onChange(newAllocations);
  };

  /**
   * 構成比による配分（固定店舗を除外）
   */
  const handleRatioDistribution = () => {
    if (selectedStores.size === 0) return;

    const newAllocations = [...allocations];

    // 固定店舗の合計配分数を計算
    let lockedTotal = 0;
    STORE_DATA.forEach((store, index) => {
      if (lockedStores.has(store.code)) {
        lockedTotal += allocations[index] || 0;
      }
    });

    // 固定されていない選択店舗
    const unlockedSelectedStores = Array.from(selectedStores).filter(
      (code) => !lockedStores.has(code)
    );

    if (unlockedSelectedStores.length === 0) {
      // 全て固定されている場合は何もしない
      return;
    }

    // 残りの配分数
    const remainingDelivery = totalDelivery - lockedTotal;

    if (remainingDelivery < 0) {
      alert('固定された配分数が総納品数を超えています');
      return;
    }

    const selectedStoresWithRatio: Array<{ code: string; ratio: number }> = [];
    let totalRatio = 0;

    unlockedSelectedStores.forEach((code) => {
      const setting = storeSettings[code];
      const ratio = setting?.salesRatio || 0;
      selectedStoresWithRatio.push({ code, ratio });
      totalRatio += ratio;
    });

    if (totalRatio === 0) {
      handleEqualDistribution();
      return;
    }

    let allocated = 0;

    const distributionPlan: Array<{ code: string; quantity: number }> = [];
    selectedStoresWithRatio.forEach(({ code, ratio }) => {
      const normalizedRatio = ratio / totalRatio;
      const quantity = Math.floor(remainingDelivery * normalizedRatio);
      distributionPlan.push({ code, quantity });
      allocated += quantity;
    });

    const remainingQty = remainingDelivery - allocated;
    if (remainingQty > 0) {
      const sortedByRatio = [...selectedStoresWithRatio].sort((a, b) => b.ratio - a.ratio);
      for (let i = 0; i < remainingQty && i < sortedByRatio.length; i++) {
        const planItem = distributionPlan.find((p) => p.code === sortedByRatio[i].code);
        if (planItem) {
          planItem.quantity += 1;
        }
      }
    }

    STORE_DATA.forEach((store, index) => {
      if (lockedStores.has(store.code)) {
        // 固定店舗はそのまま
        return;
      }
      const planItem = distributionPlan.find((p) => p.code === store.code);
      newAllocations[index] = planItem ? planItem.quantity : 0;
    });

    onChange(newAllocations);
  };

  /**
   * 配分実行
   */
  const handleDistribute = () => {
    if (distributionMode === 'equal') {
      handleEqualDistribution();
    } else {
      handleRatioDistribution();
    }
  };

  /**
   * 全クリア
   */
  const handleClearAll = () => {
    onChange(new Array(STORE_COUNT).fill(0));
    setSelectedStores(new Set());
    setLockedStores(new Set());
  };

  /**
   * 未ロック店舗のみクリア（デスクトップ版互換）
   */
  const handleClearUnlocked = () => {
    const newAllocations = [...allocations];
    STORE_DATA.forEach((store, index) => {
      if (!lockedStores.has(store.code)) {
        newAllocations[index] = 0;
      }
    });
    onChange(newAllocations);
  };

  /**
   * すべてロック
   */
  const handleLockAll = () => {
    const allCodes = STORE_DATA.filter((_, index) => allocations[index] > 0).map((s) => s.code);
    setLockedStores(new Set(allCodes));
  };

  /**
   * すべてロック解除
   */
  const handleUnlockAll = () => {
    setLockedStores(new Set());
  };

  /**
   * 配分進捗率を計算
   */
  const progressPercentage = totalDelivery > 0 ? (totalAllocated / totalDelivery) * 100 : 0;

  /**
   * 店舗の固定/解除をトグル
   */
  const handleToggleLock = (storeCode: string) => {
    const newLockedStores = new Set(lockedStores);
    if (newLockedStores.has(storeCode)) {
      newLockedStores.delete(storeCode);
    } else {
      newLockedStores.add(storeCode);
    }
    setLockedStores(newLockedStores);
  };

  /**
   * 長押し開始（固定機能）
   */
  const handleLongPressStart = (storeCode: string) => {
    longPressTimer.current = window.setTimeout(() => {
      handleToggleLock(storeCode);
    }, 800); // 800ms長押しで固定/解除（以前は500ms）
  };

  /**
   * 長押し終了
   */
  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  /**
   * カテゴリ内の店舗を取得
   */
  const getCategoryStores = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return [];
    return enabledStores.filter((store) => category.storeIds.includes(store.code));
  };

  /**
   * 未分類の店舗を取得
   */
  const getUncategorizedStores = () => {
    const categorizedStoreIds = new Set<string>();
    categories.forEach((cat) => {
      cat.storeIds.forEach((id) => categorizedStoreIds.add(id));
    });
    return enabledStores.filter((store) => !categorizedStoreIds.has(store.code));
  };

  /**
   * 表示する店舗リスト（店番でソート）
   */
  const availableStores = useMemo(() => {
    let stores: Array<typeof STORE_DATA[number]>;

    if (selectedCategories.size === 0) {
      stores = enabledStores;
    } else {
      const storesSet = new Set<typeof STORE_DATA[number]>();
      selectedCategories.forEach((categoryId) => {
        if (categoryId === 'uncategorized') {
          getUncategorizedStores().forEach((store) => storesSet.add(store));
        } else {
          getCategoryStores(categoryId).forEach((store) => storesSet.add(store));
        }
      });
      stores = Array.from(storesSet);
    }

    // 店番でソート
    return stores.sort((a, b) => a.code.localeCompare(b.code));
  }, [selectedCategories, enabledStores, categories]);

  /**
   * 店舗が属するカテゴリを取得
   */
  const getStoreCategory = (storeCode: string): StoreCategory | null => {
    return categories.find((cat) => cat.storeIds.includes(storeCode)) || null;
  };

  /**
   * プレビュー値を計算（均等配分または構成比配分、固定店舗を除外）
   */
  const calculatePreview = useMemo(() => {
    if (selectedStores.size === 0) return {};

    const preview: Record<string, number> = {};

    // 固定店舗の合計配分数を計算
    let lockedTotal = 0;
    STORE_DATA.forEach((store, index) => {
      if (lockedStores.has(store.code)) {
        lockedTotal += allocations[index] || 0;
      }
    });

    // 固定されていない選択店舗
    const unlockedSelectedStores = Array.from(selectedStores).filter(
      (code) => !lockedStores.has(code)
    );

    if (unlockedSelectedStores.length === 0) {
      return preview;
    }

    // 残りの配分数
    const remainingDelivery = totalDelivery - lockedTotal;

    if (remainingDelivery < 0) {
      return preview;
    }

    if (distributionMode === 'equal') {
      // 均等配分のプレビュー
      const perStore = Math.floor(remainingDelivery / unlockedSelectedStores.length);
      const remainder = remainingDelivery % unlockedSelectedStores.length;
      let remainderDistributed = 0;

      unlockedSelectedStores.forEach((code) => {
        preview[code] = perStore;
        if (remainderDistributed < remainder) {
          preview[code] += 1;
          remainderDistributed++;
        }
      });
    } else {
      // 構成比配分のプレビュー
      const selectedStoresWithRatio: Array<{ code: string; ratio: number }> = [];
      let totalRatio = 0;

      unlockedSelectedStores.forEach((code) => {
        const setting = storeSettings[code];
        const ratio = setting?.salesRatio || 0;
        selectedStoresWithRatio.push({ code, ratio });
        totalRatio += ratio;
      });

      if (totalRatio === 0) {
        // 構成比が0の場合は均等配分にフォールバック
        const perStore = Math.floor(remainingDelivery / unlockedSelectedStores.length);
        const remainder = remainingDelivery % unlockedSelectedStores.length;
        let remainderDistributed = 0;

        unlockedSelectedStores.forEach((code) => {
          preview[code] = perStore;
          if (remainderDistributed < remainder) {
            preview[code] += 1;
            remainderDistributed++;
          }
        });
      } else {
        let allocated = 0;
        const distributionPlan: Array<{ code: string; quantity: number }> = [];

        selectedStoresWithRatio.forEach(({ code, ratio }) => {
          const normalizedRatio = ratio / totalRatio;
          const quantity = Math.floor(remainingDelivery * normalizedRatio);
          distributionPlan.push({ code, quantity });
          allocated += quantity;
        });

        const remainingQty = remainingDelivery - allocated;
        if (remainingQty > 0) {
          const sortedByRatio = [...selectedStoresWithRatio].sort((a, b) => b.ratio - a.ratio);
          for (let i = 0; i < remainingQty && i < sortedByRatio.length; i++) {
            const planItem = distributionPlan.find((p) => p.code === sortedByRatio[i].code);
            if (planItem) {
              planItem.quantity += 1;
            }
          }
        }

        distributionPlan.forEach(({ code, quantity }) => {
          preview[code] = quantity;
        });
      }
    }

    return preview;
  }, [selectedStores, distributionMode, totalDelivery, storeSettings, lockedStores, allocations]);

  /**
   * 全店舗選択（カテゴリ絞り込みが適用されている場合は絞り込まれた店舗のみ）
   */
  const handleSelectAll = () => {
    const allCodes = new Set(availableStores.map((s) => s.code));
    setSelectedStores(allCodes);
  };

  /**
   * カテゴリ選択をトグル
   */
  const handleToggleCategory = (categoryId: string) => {
    const newSelectedCategories = new Set(selectedCategories);

    if (newSelectedCategories.has(categoryId)) {
      newSelectedCategories.delete(categoryId);

      const categoryStores = categoryId === 'uncategorized'
        ? getUncategorizedStores()
        : getCategoryStores(categoryId);

      const newSelectedStores = new Set(selectedStores);
      const newAllocations = [...allocations];

      categoryStores.forEach((store) => {
        newSelectedStores.delete(store.code);
        const storeIndex = STORE_DATA.findIndex((s) => s.code === store.code);
        if (storeIndex !== -1) {
          newAllocations[storeIndex] = 0;
        }
      });

      setSelectedStores(newSelectedStores);
      onChange(newAllocations);
    } else {
      newSelectedCategories.add(categoryId);

      // カテゴリ選択時に、そのカテゴリ内の店舗も自動的に選択
      const categoryStores = categoryId === 'uncategorized'
        ? getUncategorizedStores()
        : getCategoryStores(categoryId);

      const newSelectedStores = new Set(selectedStores);
      categoryStores.forEach((store) => {
        newSelectedStores.add(store.code);
      });
      setSelectedStores(newSelectedStores);
    }

    setSelectedCategories(newSelectedCategories);
  };

  return (
    <Box>
      {/* 縦並びセクション */}
      <Stack spacing={1.5}>
        {/* カテゴリー絞り込み */}
        {categories.length > 0 && (
          <Card variant="outlined" sx={{ borderColor: 'grey.300' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.75rem' }}>
                  カテゴリー ({selectedCategories.size}選択)
                </Typography>
                {selectedCategories.size > 0 && (
                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedCategories(new Set());
                      setSelectedStores(new Set());
                      const newAllocations = [...allocations];
                      STORE_DATA.forEach((_, index) => {
                        newAllocations[index] = 0;
                      });
                      onChange(newAllocations);
                    }}
                    sx={{ fontSize: '0.65rem', minWidth: 'auto', px: 1, py: 0.25 }}
                  >
                    リセット
                  </Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {categories.map((category, index) => {
                  const color = getCategoryColor(index);
                  const isSelected = selectedCategories.has(category.id);
                  return (
                    <Chip
                      key={category.id}
                      label={`${category.name} (${getCategoryStores(category.id).length})`}
                      onClick={() => handleToggleCategory(category.id)}
                      size="small"
                      sx={{
                        bgcolor: isSelected ? color.main : 'transparent',
                        color: isSelected ? 'white' : color.main,
                        borderColor: color.main,
                        borderWidth: 1,
                        borderStyle: 'solid',
                        fontSize: '0.7rem',
                        height: 24,
                        '&:hover': {
                          bgcolor: isSelected ? color.main : color.light,
                        },
                      }}
                    />
                  );
                })}
                <Chip
                  label={`未分類 (${getUncategorizedStores().length})`}
                  onClick={() => handleToggleCategory('uncategorized')}
                  size="small"
                  variant={selectedCategories.has('uncategorized') ? 'filled' : 'outlined'}
                  sx={{ fontSize: '0.7rem', height: 24 }}
                />
              </Box>
            </CardContent>
          </Card>
        )}

        {/* 店舗選択 */}
        <Card variant="outlined" sx={{ borderColor: 'grey.300' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.75rem' }}>
                店舗選択 ({selectedStores.size}/{availableStores.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Button
                  size="small"
                  onClick={handleSelectAll}
                  variant="text"
                  sx={{ fontSize: '0.65rem', minWidth: 'auto', px: 1, py: 0.25 }}
                >
                  全選択
                </Button>
                <Button
                  size="small"
                  onClick={handleClearAll}
                  variant="text"
                  color="error"
                  sx={{ fontSize: '0.65rem', minWidth: 'auto', px: 1, py: 0.25 }}
                >
                  クリア
                </Button>
              </Box>
            </Box>
            <Box sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              maxHeight: 200,
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                width: 6,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: 3,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: 3,
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.3)',
                },
              },
            }}>
              {availableStores.map((store) => {
                const storeIndex = STORE_DATA.findIndex((s) => s.code === store.code);
                const quantity = allocations[storeIndex] || 0;
                const isSelected = selectedStores.has(store.code);
                const setting = storeSettings[store.code];
                const ratio = setting?.salesRatio || 0;
                const storeCategory = getStoreCategory(store.code);
                const categoryIndex = storeCategory ? categories.findIndex((c) => c.id === storeCategory.id) : -1;
                const color = categoryIndex >= 0 ? getCategoryColor(categoryIndex) : null;

                return (
                  <Chip
                    key={store.code}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                          {store.code}
                        </Typography>
                        {quantity > 0 && (
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>
                            ({quantity})
                          </Typography>
                        )}
                        {distributionMode === 'ratio' && ratio > 0 && (
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                            [{ratio}%]
                          </Typography>
                        )}
                      </Box>
                    }
                    onClick={() => handleToggleStore(store.code)}
                    size="small"
                    sx={
                      color
                        ? {
                            bgcolor: isSelected ? color.main : 'transparent',
                            color: isSelected ? 'white' : color.main,
                            borderColor: color.main,
                            borderWidth: 1,
                            borderStyle: 'solid',
                            height: 24,
                            '&:hover': {
                              bgcolor: isSelected ? color.main : color.light,
                            },
                          }
                        : {
                            bgcolor: isSelected ? 'primary.main' : 'transparent',
                            color: isSelected ? 'white' : 'text.primary',
                            borderColor: isSelected ? 'primary.main' : 'grey.300',
                            borderWidth: 1,
                            borderStyle: 'solid',
                            height: 24,
                            '&:hover': {
                              bgcolor: isSelected ? 'primary.main' : 'grey.100',
                            },
                          }
                    }
                  />
                );
              })}
            </Box>
          </CardContent>
        </Card>

        {/* 4. 配分方法選択 + 実行ボタン（1行に統合） */}
        <Card variant="outlined" sx={{ borderColor: 'grey.300' }}>
          <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {/* 構成比ボタン */}
              <Button
                variant={distributionMode === 'ratio' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setDistributionMode('ratio')}
                sx={{
                  flex: 1,
                  py: 0.75,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  bgcolor: distributionMode === 'ratio' ? 'primary.main' : 'transparent',
                  color: distributionMode === 'ratio' ? 'white' : 'primary.main',
                  borderColor: 'primary.main',
                  '&:hover': {
                    bgcolor: distributionMode === 'ratio' ? 'primary.dark' : 'primary.50',
                  },
                }}
              >
                <AutoFixHigh sx={{ mr: 0.5, fontSize: '0.9rem' }} />
                構成比
              </Button>

              {/* 実行ボタン */}
              <Button
                variant="contained"
                size="small"
                onClick={handleDistribute}
                disabled={selectedStores.size === 0}
                color="success"
                sx={{
                  flex: 1.2,
                  py: 0.75,
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  boxShadow: 2,
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
              >
                実行
              </Button>

              {/* 均等ボタン */}
              <Button
                variant={distributionMode === 'equal' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setDistributionMode('equal')}
                sx={{
                  flex: 1,
                  py: 0.75,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  bgcolor: distributionMode === 'equal' ? 'primary.main' : 'transparent',
                  color: distributionMode === 'equal' ? 'white' : 'primary.main',
                  borderColor: 'primary.main',
                  '&:hover': {
                    bgcolor: distributionMode === 'equal' ? 'primary.dark' : 'primary.50',
                  },
                }}
              >
                <Functions sx={{ mr: 0.5, fontSize: '0.9rem' }} />
                均等
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* 5. 配分数量入力（横スクロール形式） */}
        <Box className="swiper-no-swiping">
          {/* 商品番号 + 配分数量入力 + アクションボタン */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.9rem' }}>
                商品 {productIndex + 1}:
              </Typography>
              <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                配分数量入力
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DeleteSweep sx={{ fontSize: '0.9rem' }} />}
                onClick={handleClearUnlocked}
                sx={{ fontSize: '0.65rem', px: 1, py: 0.5, minWidth: 'auto' }}
              >
                クリア
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<LockOutlined sx={{ fontSize: '0.9rem' }} />}
                onClick={handleLockAll}
                color="warning"
                sx={{ fontSize: '0.65rem', px: 1, py: 0.5, minWidth: 'auto' }}
              >
                全ロック
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<LockOpenOutlined sx={{ fontSize: '0.9rem' }} />}
                onClick={handleUnlockAll}
                color="info"
                sx={{ fontSize: '0.65rem', px: 1, py: 0.5, minWidth: 'auto' }}
              >
                全解除
              </Button>
            </Box>
          </Box>

          {selectedStoresList.length > 0 ? (
            <Box
              className="swiper-no-swiping"
              sx={{
                position: 'relative',
                border: '2px solid',
                borderColor: 'primary.main',
                borderRadius: 1,
                bgcolor: 'background.paper',
                p: 1,
                // 横スワイプ専用エリアであることを視覚的に示す
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  gap: 1.5,
                  px: 0.5,
                  py: 1,
                  WebkitOverflowScrolling: 'touch',
                  scrollBehavior: 'smooth',
                  scrollSnapType: 'x proximity',
                  scrollbarWidth: 'thin',
                  // 重要: 横スクロールのみを許可、縦スクロールを無効化
                  touchAction: 'pan-x',
                  // スクロール中は縦スクロールをブロック
                  overscrollBehaviorX: 'contain',
                  overscrollBehaviorY: 'none',
                  '&::-webkit-scrollbar': {
                    height: 8,
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    borderRadius: 4,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    borderRadius: 4,
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.6)',
                    },
                  },
                }}
              >
                {selectedStoresList.map((store) => {
                  const storeIndex = STORE_DATA.findIndex((s) => s.code === store.code);
                  const quantity = allocations[storeIndex] || 0;
                  const previewValue = calculatePreview[store.code];
                  const hasPreview = previewValue !== undefined && quantity === 0;
                  const isLocked = lockedStores.has(store.code);

                  return (
                    <Card
                      key={store.code}
                      variant="outlined"
                      onTouchStart={() => handleLongPressStart(store.code)}
                      onTouchEnd={handleLongPressEnd}
                      onMouseDown={() => handleLongPressStart(store.code)}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        handleToggleLock(store.code);
                      }}
                      sx={{
                        minWidth: 70,
                        maxWidth: 70,
                        flexShrink: 0,
                        scrollSnapAlign: 'start',
                        bgcolor: isLocked ? 'warning.50' : quantity > 0 ? 'success.50' : 'background.paper',
                        borderColor: isLocked ? 'warning.main' : quantity > 0 ? 'success.main' : 'divider',
                        borderWidth: isLocked || quantity > 0 ? 2 : 1,
                        transition: 'all 0.2s ease',
                        touchAction: 'pan-x', // カード上でも横スワイプのみ許可
                        boxShadow: quantity > 0 ? 1 : 0,
                        '&:hover': {
                          boxShadow: 2,
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 0.75, '&:last-child': { pb: 0.75 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="caption" fontWeight="medium" display="block" sx={{ fontSize: '0.65rem', lineHeight: 1.2 }}>
                            {store.code}店
                          </Typography>
                          {isLocked && <Lock sx={{ fontSize: '0.8rem', color: 'warning.main' }} />}
                        </Box>
                        <TextField
                          type="number"
                          size="small"
                          value={quantity || ''}
                          placeholder={hasPreview ? String(previewValue) : ''}
                          onChange={(e) => handleChangeAllocation(store.code, parseInt(e.target.value) || 0)}
                          fullWidth
                          inputProps={{
                            inputMode: 'numeric',
                            pattern: '[0-9]*',
                            min: 0,
                            style: {
                              textAlign: 'center',
                              fontSize: '0.85rem',
                              fontWeight: quantity > 0 ? 'bold' : 'normal',
                              padding: '6px 4px'
                            },
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '0.75rem',
                            },
                            '& .MuiInputBase-input': {
                              padding: '6px 4px',
                              '&::placeholder': {
                                color: 'grey.400',
                                opacity: 0.7,
                                fontWeight: 'normal',
                              },
                            },
                          }}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
              {/* 右側のグラデーションインジケーター（スクロール可能を示す） */}
              {selectedStoresList.length > 4 && (
                <Box
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    bottom: 8,
                    width: 60,
                    background: 'linear-gradient(to left, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0) 100%)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    pr: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'primary.main', fontWeight: 'bold', lineHeight: 1 }}>
                      スワイプ
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.8rem', color: 'primary.main', fontWeight: 'bold' }}>
                      →
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="info" sx={{ fontSize: '0.8rem', py: 0.5 }}>
              配分する店舗を選択してください
            </Alert>
          )}
        </Box>
        {/* 統計表示（画面最下部） */}
        <Card
          variant="outlined"
          sx={{
            mt: 2,
            borderWidth: 2,
            borderColor:
              remaining === 0
                ? 'success.main'
                : remaining < 0
                ? 'error.main'
                : 'primary.main',
          }}
        >
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            {/* 統計数値（3列グリッド） */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 0.25 }}>
                  総納品数
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  {totalDelivery}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 0.25 }}>
                  配分済み
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main', fontSize: '1.1rem' }}>
                  {totalAllocated}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', mb: 0.25 }}>
                  残り
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: remaining === 0 ? 'success.main' : remaining < 0 ? 'error.main' : 'warning.main',
                    fontSize: '1.1rem',
                  }}
                >
                  {remaining}
                </Typography>
              </Box>
            </Box>

            {/* プログレスバー */}
            <Box sx={{ mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(progressPercentage, 100)}
                sx={{
                  height: 8,
                  borderRadius: 1,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor:
                      remaining === 0
                        ? 'success.main'
                        : remaining < 0
                        ? 'error.main'
                        : 'primary.main',
                    borderRadius: 1,
                  },
                }}
              />
              <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.25, fontSize: '0.65rem', color: 'text.secondary' }}>
                {progressPercentage.toFixed(1)}%
              </Typography>
            </Box>

            {/* ステータス表示 */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {remaining === 0 ? (
                  <>
                    <CheckCircle sx={{ fontSize: '1rem', color: 'success.main' }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main', fontSize: '0.75rem' }}>
                      完了
                    </Typography>
                  </>
                ) : remaining < 0 ? (
                  <>
                    <ErrorIcon sx={{ fontSize: '1rem', color: 'error.main' }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main', fontSize: '0.75rem' }}>
                      超過: {Math.abs(remaining)}個
                    </Typography>
                  </>
                ) : (
                  <>
                    <WarningIcon sx={{ fontSize: '1rem', color: 'warning.main' }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.main', fontSize: '0.75rem' }}>
                      残り: {remaining}個
                    </Typography>
                  </>
                )}
              </Box>

              {/* 固定店舗数表示 */}
              {lockedStores.size > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Lock sx={{ fontSize: '0.9rem', color: 'warning.main' }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                    固定: {lockedStores.size}店舗
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Stack>

      {/* エラー表示 */}
      {remaining < 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          配分数が総納品数を超えています！ {Math.abs(remaining)} 個減らしてください。
        </Alert>
      )}
    </Box>
  );
};
