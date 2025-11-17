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
  ToggleButton,
  ToggleButtonGroup,
  Paper,
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

  // 店舗設定とカテゴリーを読み込み
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

        // カテゴリーを読み込み
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
 * 配分方法の種類
 */
type DistributionMethod = 'equal' | 'ratio';

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
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [distributionMethod, setDistributionMethod] = useState<DistributionMethod>('equal');

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

  // カテゴリーに属さない店舗（未分類）を取得
  const uncategorizedStores = useMemo(() => {
    const categorizedStoreIds = new Set<string>();
    categories.forEach((cat) => {
      cat.storeIds.forEach((id) => categorizedStoreIds.add(id));
    });
    return enabledStores.filter((store) => !categorizedStoreIds.has(store.code));
  }, [categories, enabledStores]);

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
   * カテゴリー選択トグル
   */
  const handleToggleCategory = (categoryId: string) => {
    const newSelectedCategories = new Set(selectedCategories);
    if (newSelectedCategories.has(categoryId)) {
      newSelectedCategories.delete(categoryId);
    } else {
      newSelectedCategories.add(categoryId);
    }
    setSelectedCategories(newSelectedCategories);
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
   * 構成比配分（選択した店舗の構成比を100%に正規化して配分）
   */
  const handleRatioDistribution = () => {
    if (selectedStores.size === 0) return;

    // 選択した店舗の構成比の合計を計算
    let totalRatio = 0;
    const storeRatios: Record<string, number> = {};

    selectedStores.forEach((storeCode) => {
      const setting = storeSettings[storeCode];
      const ratio = setting?.salesRatio ?? 0;
      storeRatios[storeCode] = ratio;
      totalRatio += ratio;
    });

    // 構成比の合計が0の場合は均等配分にフォールバック
    if (totalRatio === 0) {
      handleEqualDistribution();
      return;
    }

    // 構成比を100%に正規化して配分
    const newAllocations = [...allocations];
    let allocatedTotal = 0;
    const storesArray = Array.from(selectedStores);

    // 最初のN-1店舗に配分
    storesArray.slice(0, -1).forEach((storeCode) => {
      const storeIndex = STORE_DATA.findIndex((s) => s.code === storeCode);
      if (storeIndex === -1) return;

      const normalizedRatio = storeRatios[storeCode] / totalRatio;
      const allocation = Math.floor(totalDelivery * normalizedRatio);
      newAllocations[storeIndex] = allocation;
      allocatedTotal += allocation;
    });

    // 最後の店舗に残りを配分（端数処理）
    const lastStoreCode = storesArray[storesArray.length - 1];
    const lastStoreIndex = STORE_DATA.findIndex((s) => s.code === lastStoreCode);
    if (lastStoreIndex !== -1) {
      newAllocations[lastStoreIndex] = totalDelivery - allocatedTotal;
    }

    // 選択されていない店舗は0に
    STORE_DATA.forEach((store, index) => {
      if (!selectedStores.has(store.code)) {
        newAllocations[index] = 0;
      }
    });

    onChange(newAllocations);
  };

  /**
   * 配分実行（選択した方法に応じて）
   */
  const handleDistribute = () => {
    if (distributionMethod === 'equal') {
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
   * 全店舗選択（表示されているカテゴリーの店舗のみ）
   */
  const handleSelectAll = () => {
    const newSelected = new Set<string>();

    // 選択されたカテゴリーの店舗を追加
    categories.forEach((category) => {
      if (selectedCategories.has(category.id)) {
        category.storeIds.forEach((storeId) => {
          const store = enabledStores.find((s) => s.code === storeId);
          if (store) {
            newSelected.add(storeId);
          }
        });
      }
    });

    // 未分類の店舗を追加（カテゴリーが選択されていない場合は全て）
    if (selectedCategories.size === 0) {
      uncategorizedStores.forEach((store) => {
        newSelected.add(store.code);
      });
    }

    setSelectedStores(newSelected);
  };

  return (
    <Box>
      {/* ヘッダー部分 */}
      <Paper elevation={2} sx={{ mb: 2, p: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
          店舗への配分数を設定
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

        {/* 配分方法選択 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            配分方法
          </Typography>
          <ToggleButtonGroup
            value={distributionMethod}
            exclusive
            onChange={(_, newMethod) => newMethod && setDistributionMethod(newMethod)}
            size="small"
            fullWidth
          >
            <ToggleButton value="equal">均等配分</ToggleButton>
            <ToggleButton value="ratio">構成比配分</ToggleButton>
          </ToggleButtonGroup>
          {distributionMethod === 'ratio' && (
            <Alert severity="info" sx={{ mt: 1, fontSize: '0.75rem' }}>
              選択した店舗の構成比を100%に自動調整して配分します
            </Alert>
          )}
        </Box>

        {/* 一括操作ボタン */}
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" onClick={handleSelectAll} fullWidth>
            全選択
          </Button>
          <Button variant="contained" size="small" onClick={handleDistribute} fullWidth disabled={selectedStores.size === 0}>
            配分実行
          </Button>
          <Button variant="outlined" size="small" onClick={handleClearAll} color="error" fullWidth>
            全クリア
          </Button>
        </Stack>
      </Paper>

      <Divider sx={{ my: 2 }} />

      {/* カテゴリー選択（チップ形式） */}
      {categories.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
              ステップ1: カテゴリーを選択 ({selectedCategories.size}/{categories.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  label={`${category.name} (${category.storeIds.length}店舗)`}
                  onClick={() => handleToggleCategory(category.id)}
                  color={selectedCategories.has(category.id) ? 'primary' : 'default'}
                  variant={selectedCategories.has(category.id) ? 'filled' : 'outlined'}
                  sx={{ fontSize: '0.875rem' }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 店舗選択（チップ形式） */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
            ステップ2: 配分する店舗を選択 ({selectedStores.size}/{enabledStores.length})
          </Typography>

          {/* 選択されたカテゴリーの店舗を表示 */}
          {categories.map((category) => {
            if (!selectedCategories.has(category.id)) return null;

            const categoryStores = enabledStores.filter((store) => category.storeIds.includes(store.code));
            if (categoryStores.length === 0) return null;

            return (
              <Box key={category.id} sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  {category.name}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {categoryStores.map((store) => {
                    const storeIndex = STORE_DATA.findIndex((s) => s.code === store.code);
                    const quantity = allocations[storeIndex] || 0;
                    const setting = storeSettings[store.code];
                    const ratio = setting?.salesRatio ?? 0;

                    return (
                      <Chip
                        key={store.code}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span>{store.code}: {store.name}</span>
                            {quantity > 0 && (
                              <span style={{ fontWeight: 'bold' }}>({quantity})</span>
                            )}
                            {distributionMethod === 'ratio' && ratio > 0 && (
                              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>[{ratio}%]</span>
                            )}
                          </Box>
                        }
                        onClick={() => handleToggleStore(store.code)}
                        color={selectedStores.has(store.code) ? 'primary' : 'default'}
                        variant={selectedStores.has(store.code) ? 'filled' : 'outlined'}
                        sx={{ fontSize: '0.75rem' }}
                      />
                    );
                  })}
                </Box>
              </Box>
            );
          })}

          {/* 未分類の店舗を表示 */}
          {uncategorizedStores.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                未分類の店舗
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {uncategorizedStores.map((store) => {
                  const storeIndex = STORE_DATA.findIndex((s) => s.code === store.code);
                  const quantity = allocations[storeIndex] || 0;
                  const setting = storeSettings[store.code];
                  const ratio = setting?.salesRatio ?? 0;

                  return (
                    <Chip
                      key={store.code}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <span>{store.code}: {store.name}</span>
                          {quantity > 0 && (
                            <span style={{ fontWeight: 'bold' }}>({quantity})</span>
                          )}
                          {distributionMethod === 'ratio' && ratio > 0 && (
                            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>[{ratio}%]</span>
                          )}
                        </Box>
                      }
                      onClick={() => handleToggleStore(store.code)}
                      color={selectedStores.has(store.code) ? 'primary' : 'default'}
                      variant={selectedStores.has(store.code) ? 'filled' : 'outlined'}
                      sx={{ fontSize: '0.75rem' }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 選択した店舗の入力フィールド */}
      {selectedStoresList.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
              ステップ3: 配分数を入力 ({selectedStoresList.length}店舗)
            </Typography>
            <List sx={{ bgcolor: 'background.paper', borderRadius: 1, p: 0 }}>
              {selectedStoresList.map((store) => {
                const storeIndex = STORE_DATA.findIndex((s) => s.code === store.code);
                const quantity = allocations[storeIndex] || 0;
                const setting = storeSettings[store.code];
                const ratio = setting?.salesRatio ?? 0;

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
                      py: 1.5,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {store.code}: {store.name}
                      </Typography>
                      {distributionMethod === 'ratio' && ratio > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          構成比: {ratio}%
                        </Typography>
                      )}
                    </Box>
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
          </CardContent>
        </Card>
      )}

      {selectedStoresList.length === 0 && (
        <Alert severity="info">
          配分する店舗を選択してください
        </Alert>
      )}
    </Box>
  );
};
