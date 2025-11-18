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
  List,
  ListItem,
  ToggleButtonGroup,
  ToggleButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
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
 * 店舗配分入力（モバイル最適化版・横スクロール方式）
 *
 * 機能:
 * - 横スクロール可能な列レイアウト
 * - 店舗設定で有効にした店舗のみ表示
 * - チェックボックスで配分する店舗を選択
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
 * StoreAllocationMobileの内部コンテンツ（横スクロール版）
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
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('equal');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    category: true,  // デフォルトでオープン
    stores: false,   // デフォルトで閉じる
  });

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
   */
  const handleRatioDistribution = () => {
    if (selectedStores.size === 0) return;

    const selectedStoresWithRatio: Array<{ code: string; ratio: number }> = [];
    let totalRatio = 0;

    selectedStores.forEach((code) => {
      const setting = storeSettings[code];
      const ratio = setting?.salesRatio || 0;
      selectedStoresWithRatio.push({ code, ratio });
      totalRatio += ratio;
    });

    if (totalRatio === 0) {
      handleEqualDistribution();
      return;
    }

    const newAllocations = [...allocations];
    let allocated = 0;

    const distributionPlan: Array<{ code: string; quantity: number }> = [];
    selectedStoresWithRatio.forEach(({ code, ratio }) => {
      const normalizedRatio = ratio / totalRatio;
      const quantity = Math.floor(totalDelivery * normalizedRatio);
      distributionPlan.push({ code, quantity });
      allocated += quantity;
    });

    const remainingQty = totalDelivery - allocated;
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
   * 表示する店舗リスト（選択されたカテゴリの店舗のみ）
   */
  const availableStores = useMemo(() => {
    if (selectedCategories.size === 0) {
      return enabledStores;
    }

    const stores = new Set<typeof STORE_DATA[number]>();
    selectedCategories.forEach((categoryId) => {
      if (categoryId === 'uncategorized') {
        getUncategorizedStores().forEach((store) => stores.add(store));
      } else {
        getCategoryStores(categoryId).forEach((store) => stores.add(store));
      }
    });

    return Array.from(stores);
  }, [selectedCategories, enabledStores, categories]);

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
    }

    setSelectedCategories(newSelectedCategories);
  };

  /**
   * セクションの展開/折りたたみ
   */
  const handleToggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <Box>
      {/* 横スクロールコンテナ */}
      <Box
        sx={{
          display: 'flex',
          overflowX: 'auto',
          gap: 2,
          pb: 2,
          '&::-webkit-scrollbar': {
            height: 8,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 4,
          },
        }}
      >
        {/* 1列目: タイトル + 総納品数チップ */}
        <Box sx={{ minWidth: 200, flexShrink: 0 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                配分数量を振り分け
              </Typography>
              <Chip
                label={`総納品数: ${totalDelivery}個`}
                color="primary"
                variant="filled"
                size="small"
              />
            </CardContent>
          </Card>
        </Box>

        {/* 2列目: カテゴリー絞り込み（デフォルトオープン） */}
        {categories.length > 0 && (
          <Box sx={{ minWidth: 280, flexShrink: 0 }}>
            <Card variant="outlined">
              <Accordion
                expanded={expandedSections.category}
                onChange={() => handleToggleSection('category')}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    カテゴリで絞り込み ({selectedCategories.size}選択中)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {categories.map((category) => (
                      <Chip
                        key={category.id}
                        label={`${category.name} (${getCategoryStores(category.id).length})`}
                        onClick={() => handleToggleCategory(category.id)}
                        color={selectedCategories.has(category.id) ? 'primary' : 'default'}
                        variant={selectedCategories.has(category.id) ? 'filled' : 'outlined'}
                        size="small"
                      />
                    ))}
                    <Chip
                      label={`未分類 (${getUncategorizedStores().length})`}
                      onClick={() => handleToggleCategory('uncategorized')}
                      color={selectedCategories.has('uncategorized') ? 'primary' : 'default'}
                      variant={selectedCategories.has('uncategorized') ? 'filled' : 'outlined'}
                      size="small"
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Card>
          </Box>
        )}

        {/* 3列目: 配分する店舗を選択（デフォルト閉じ） */}
        <Box sx={{ minWidth: 300, flexShrink: 0 }}>
          <Card variant="outlined">
            <Accordion
              expanded={expandedSections.stores}
              onChange={() => handleToggleSection('stores')}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle2" fontWeight="bold">
                  配分する店舗を選択 ({selectedStores.size}/{availableStores.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                  <Button variant="outlined" size="small" onClick={handleSelectAll} fullWidth>
                    全選択
                  </Button>
                  <Button variant="outlined" size="small" onClick={handleClearAll} color="error" fullWidth>
                    全クリア
                  </Button>
                </Stack>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 300, overflowY: 'auto' }}>
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <Typography variant="caption">
                              {store.code}: {store.name}
                            </Typography>
                            {quantity > 0 && (
                              <Typography variant="caption" sx={{ ml: 0.25, fontWeight: 'bold' }}>
                                ({quantity})
                              </Typography>
                            )}
                            {distributionMode === 'ratio' && ratio > 0 && (
                              <Typography variant="caption" sx={{ ml: 0.25, color: 'text.secondary', fontSize: '0.65rem' }}>
                                [{ratio}%]
                              </Typography>
                            )}
                          </Box>
                        }
                        onClick={() => handleToggleStore(store.code)}
                        color={isSelected ? 'primary' : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        size="small"
                      />
                    );
                  })}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Card>
        </Box>

        {/* 4列目: 統計情報（コンパクト表示） */}
        <Box sx={{ minWidth: 180, flexShrink: 0 }}>
          <Card
            variant="outlined"
            sx={{
              bgcolor: remaining === 0 ? 'success.light' : remaining < 0 ? 'error.light' : 'warning.light',
              height: '100%',
            }}
          >
            <CardContent>
              <Stack spacing={1}>
                <Box>
                  <Typography variant="caption" color="text.secondary">総納品数</Typography>
                  <Typography variant="h6" fontWeight="bold">{totalDelivery}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">配分済み</Typography>
                  <Typography variant="h6" fontWeight="bold">{totalAllocated}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">残り</Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color={remaining === 0 ? 'success.main' : remaining < 0 ? 'error.main' : 'warning.main'}
                  >
                    {remaining}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* 5列目: 配分方法選択 + 実行ボタン */}
        <Box sx={{ minWidth: 220, flexShrink: 0 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                配分方法
              </Typography>
              <ToggleButtonGroup
                value={distributionMode}
                exclusive
                onChange={(_, newMode) => newMode && setDistributionMode(newMode)}
                fullWidth
                size="small"
                sx={{ mb: 1.5 }}
              >
                <ToggleButton value="equal">均等</ToggleButton>
                <ToggleButton value="ratio">構成比</ToggleButton>
              </ToggleButtonGroup>
              <Button
                variant="contained"
                size="small"
                onClick={handleDistribute}
                fullWidth
                disabled={selectedStores.size === 0}
              >
                配分実行
              </Button>
              {distributionMode === 'ratio' && (
                <Alert severity="info" sx={{ mt: 1, fontSize: '0.7rem', py: 0.5 }}>
                  選択店舗の構成比を100%に正規化して配分
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* 6列目: 配分数量入力 */}
        <Box sx={{ minWidth: 320, flexShrink: 0 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                配分数を入力 ({selectedStoresList.length}店舗)
              </Typography>
              {selectedStoresList.length > 0 ? (
                <List sx={{ width: '100%', maxHeight: 400, overflowY: 'auto', p: 0 }}>
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
                          py: 1,
                          px: 0,
                        }}
                      >
                        <Typography variant="caption" sx={{ flex: 1, fontSize: '0.75rem' }}>
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
                            style: { textAlign: 'right', fontSize: '0.875rem' },
                          }}
                          sx={{ width: 70 }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Alert severity="info" sx={{ mt: 1 }}>
                  配分する店舗を選択してください
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* エラー表示 */}
      {remaining < 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          配分数が総納品数を超えています！ {Math.abs(remaining)} 個減らしてください。
        </Alert>
      )}
    </Box>
  );
};
