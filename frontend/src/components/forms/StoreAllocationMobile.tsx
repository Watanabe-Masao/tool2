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
  Divider,
  List,
  ListItem,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { STORE_DATA, STORE_COUNT } from '@/utils/constants';
import type { OrderFormData } from '@/schemas/orderSchema';
import { StoreSettingsService } from '@/services/firebase/storeSettingsService';
import { StoreCategoryService } from '@/services/firebase/storeCategoryService';
import { useAuthContext } from '@/context/AuthContext';
import type { StoreSettings } from '@/types/storeSettings';
import type { StoreCategory } from '@/types/storeCategory';

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
}

/**
 * 店舗配分入力（モバイル最適化版・チェックボックス方式）
 *
 * 機能:
 * - 店舗設定で有効にした店舗のみ表示
 * - チェックボックスで配分する店舗を選択
 * - 選択した店舗の入力フィールドのみ表示
 * - 残り配分数のリアルタイム表示
 */
export const StoreAllocationMobile: React.FC<StoreAllocationMobileProps> = ({
  productIndex,
  control,
  errors,
  totalDelivery,
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
      return setting?.enabled ?? true; // デフォルトは有効
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
  enabledStores,
  categories,
  storeSettings,
}) => {
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('equal');

  // 初期選択状態を設定（配分数が0より大きい店舗）
  useEffect(() => {
    const initialSelected = new Set<string>();
    STORE_DATA.forEach((store, index) => {
      if (allocations[index] > 0) {
        initialSelected.add(store.code);
      }
    });
    setSelectedStores(initialSelected);
  }, []); // 初回のみ実行

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
   * 選択した店舗のリスト
   */
  const selectedStoresList = useMemo(() => {
    return enabledStores.filter((store) => selectedStores.has(store.code));
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
      // 選択解除時は配分数を0にする
      handleChangeAllocation(storeCode, 0);
    } else {
      newSelected.add(storeCode);
    }
    setSelectedStores(newSelected);
  };

  /**
   * 均等配分（選択した店舗のみ）
   */
  const handleEqualDistribution = () => {
    if (selectedStores.size === 0) return;

    const perStore = Math.floor(totalDelivery / selectedStores.size);
    const remainder = totalDelivery % selectedStores.size;

    const newAllocations = [...allocations];
    let remainderDistributed = 0;

    STORE_DATA.forEach((store, index) => {
      if (selectedStores.has(store.code)) {
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
   * 構成比による配分
   * 選択した店舗の構成比を自動的に100%になるように再計算して配分
   */
  const handleRatioDistribution = () => {
    if (selectedStores.size === 0) return;

    // 選択した店舗の構成比を取得
    const selectedStoresWithRatio: Array<{ code: string; ratio: number }> = [];
    let totalRatio = 0;

    selectedStores.forEach((code) => {
      const setting = storeSettings[code];
      const ratio = setting?.salesRatio || 0;
      selectedStoresWithRatio.push({ code, ratio });
      totalRatio += ratio;
    });

    // 構成比が全て0の場合は均等配分にフォールバック
    if (totalRatio === 0) {
      handleEqualDistribution();
      return;
    }

    // 構成比を100%になるように正規化して配分
    const newAllocations = [...allocations];
    let allocated = 0;

    // 正規化した構成比で配分を計算
    const distributionPlan: Array<{ code: string; quantity: number }> = [];
    selectedStoresWithRatio.forEach(({ code, ratio }) => {
      const normalizedRatio = ratio / totalRatio;
      const quantity = Math.floor(totalDelivery * normalizedRatio);
      distributionPlan.push({ code, quantity });
      allocated += quantity;
    });

    // 残りを構成比が最も大きい店舗に配分
    const remaining = totalDelivery - allocated;
    if (remaining > 0) {
      // 構成比が最も大きい店舗を見つける
      const sortedByRatio = [...selectedStoresWithRatio].sort((a, b) => b.ratio - a.ratio);
      for (let i = 0; i < remaining && i < sortedByRatio.length; i++) {
        const planItem = distributionPlan.find((p) => p.code === sortedByRatio[i].code);
        if (planItem) {
          planItem.quantity += 1;
        }
      }
    }

    // 配分を適用
    STORE_DATA.forEach((store, index) => {
      const planItem = distributionPlan.find((p) => p.code === store.code);
      newAllocations[index] = planItem ? planItem.quantity : 0;
    });

    onChange(newAllocations);
  };

  /**
   * 配分実行（モードに応じて）
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
  };

  /**
   * 全店舗選択
   */
  const handleSelectAll = () => {
    const allCodes = new Set(enabledStores.map((s) => s.code));
    setSelectedStores(allCodes);
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
   * 表示する店舗リスト（カテゴリが選択されている場合はそのカテゴリの店舗のみ）
   */
  const availableStores = useMemo(() => {
    if (selectedCategory === null) {
      return enabledStores;
    } else if (selectedCategory === 'uncategorized') {
      return getUncategorizedStores();
    } else {
      return getCategoryStores(selectedCategory);
    }
  }, [selectedCategory, enabledStores, categories]);

  return (
    <Box>
      {/* ヘッダー */}
      <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
        店舗への配分数を入力
      </Typography>

      {/* 統計情報 */}
      <Card
        sx={{
          mb: 2,
          bgcolor: remaining === 0 ? 'success.light' : remaining < 0 ? 'error.light' : 'info.light',
        }}
      >
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" spacing={2} justifyContent="space-around">
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                総納品数
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {totalDelivery}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                配分済み
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {totalAllocated}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                残り
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={remaining === 0 ? 'success.main' : remaining < 0 ? 'error.main' : 'primary.main'}
              >
                {remaining}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {remaining < 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          配分数が総納品数を超えています！ {Math.abs(remaining)} 個減らしてください。
        </Alert>
      )}

      {/* 配分モード選択 */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            配分方法
          </Typography>
          <ToggleButtonGroup
            value={distributionMode}
            exclusive
            onChange={(_, newMode) => newMode && setDistributionMode(newMode)}
            fullWidth
            size="small"
          >
            <ToggleButton value="equal">均等配分</ToggleButton>
            <ToggleButton value="ratio">構成比配分</ToggleButton>
          </ToggleButtonGroup>
          {distributionMode === 'ratio' && (
            <Alert severity="info" sx={{ mt: 1 }}>
              選択した店舗の構成比を自動的に100%に正規化して配分します
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 一括操作ボタン */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant="outlined" size="small" onClick={handleSelectAll} fullWidth>
          全選択
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleDistribute}
          fullWidth
          disabled={selectedStores.size === 0}
        >
          配分実行
        </Button>
        <Button variant="outlined" size="small" onClick={handleClearAll} color="error" fullWidth>
          全クリア
        </Button>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      {/* カテゴリ選択 */}
      {categories.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              カテゴリで絞り込み
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label="全て"
                onClick={() => setSelectedCategory(null)}
                color={selectedCategory === null ? 'primary' : 'default'}
                variant={selectedCategory === null ? 'filled' : 'outlined'}
              />
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  label={`${category.name} (${getCategoryStores(category.id).length})`}
                  onClick={() => setSelectedCategory(category.id)}
                  color={selectedCategory === category.id ? 'primary' : 'default'}
                  variant={selectedCategory === category.id ? 'filled' : 'outlined'}
                />
              ))}
              <Chip
                label={`未分類 (${getUncategorizedStores().length})`}
                onClick={() => setSelectedCategory('uncategorized')}
                color={selectedCategory === 'uncategorized' ? 'primary' : 'default'}
                variant={selectedCategory === 'uncategorized' ? 'filled' : 'outlined'}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 店舗選択（チップ形式） */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            配分する店舗を選択 ({selectedStores.size}/{enabledStores.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 300, overflowY: 'auto' }}>
            {availableStores.map((store) => {
              const storeIndex = STORE_DATA.findIndex((s) => s.code === store.code);
              const quantity = allocations[storeIndex] || 0;
              const isSelected = selectedStores.has(store.code);
              const setting = storeSettings[store.code];
              const ratio = setting?.salesRatio || 0;

              return (
                <Chip
                  key={store.code}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2">
                        {store.code}: {store.name}
                      </Typography>
                      {quantity > 0 && (
                        <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 'bold' }}>
                          ({quantity})
                        </Typography>
                      )}
                      {distributionMode === 'ratio' && ratio > 0 && (
                        <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                          [{ratio}%]
                        </Typography>
                      )}
                    </Box>
                  }
                  onClick={() => handleToggleStore(store.code)}
                  color={isSelected ? 'primary' : 'default'}
                  variant={isSelected ? 'filled' : 'outlined'}
                  sx={{ fontSize: '0.875rem' }}
                />
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* 選択した店舗の入力フィールド */}
      {selectedStoresList.length > 0 && (
        <>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            配分数を入力 ({selectedStoresList.length}店舗)
          </Typography>
          <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
            {selectedStoresList.map((store) => {
              const storeIndex = STORE_DATA.findIndex((s) => s.code === store.code);
              const quantity = allocations[storeIndex] || 0;

              return (
                <ListItem
                  key={store.code}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {store.code}: {store.name}
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={quantity}
                    onChange={(e) => handleChangeAllocation(store.code, parseInt(e.target.value) || 0)}
                    inputProps={{
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                      min: 0,
                      style: { textAlign: 'right' },
                    }}
                    sx={{ width: 80 }}
                  />
                </ListItem>
              );
            })}
          </List>
        </>
      )}

      {selectedStoresList.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          配分する店舗を選択してください
        </Alert>
      )}
    </Box>
  );
};
