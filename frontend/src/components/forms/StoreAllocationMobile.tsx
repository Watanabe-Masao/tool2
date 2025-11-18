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
  productIndex,
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
      handleChangeAllocation(storeCode, 0);
    } else {
      newSelected.add(storeCode);
    }
    setSelectedStores(newSelected);
  };

  /**
   * 均等配分
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
   * 表示する店舗リスト
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
      {/* 縦並びセクション（1-5項目） */}
      <Stack spacing={1}>
        {/* 1. タイトル + 総納品数統合 */}
        <Typography variant="subtitle2" fontWeight="bold">
          商品{productIndex + 1}：総納品数 {totalDelivery}個
        </Typography>

        {/* 2. カテゴリー絞り込み（デフォルトオープン） */}
        {categories.length > 0 && (
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
        )}

        {/* 3. 配分する店舗を選択（デフォルト閉じ） */}
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

        {/* 4. 配分方法選択 + 統計情報 + 実行ボタン */}
        <Card variant="outlined">
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                配分方法を選択
              </Typography>
              <Chip label={`総: ${totalDelivery}`} size="small" variant="outlined" />
              <Chip label={`済: ${totalAllocated}`} size="small" variant="outlined" />
              <Chip
                label={`残: ${remaining}`}
                size="small"
                color={remaining === 0 ? 'success' : remaining < 0 ? 'error' : 'warning'}
              />
            </Box>
            <ToggleButtonGroup
              value={distributionMode}
              exclusive
              onChange={(_, newMode) => newMode && setDistributionMode(newMode)}
              fullWidth
              size="small"
              sx={{ mb: 1 }}
            >
              <ToggleButton value="equal">均等配分</ToggleButton>
              <ToggleButton value="ratio">構成比配分</ToggleButton>
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
              <Alert severity="info" sx={{ mt: 0.5, fontSize: '0.65rem', py: 0.25 }}>
                選択店舗の構成比を100%に正規化して配分
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 5. 配分数量入力（横スクロール形式） */}
        <Box>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
            配分数を入力 ({selectedStoresList.length}店舗)
          </Typography>

          {selectedStoresList.length > 0 ? (
            <Box
              sx={{
                position: 'relative',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper',
                p: 1,
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

                  return (
                    <Card
                      key={store.code}
                      variant="outlined"
                      sx={{
                        minWidth: 70,
                        maxWidth: 70,
                        flexShrink: 0,
                        scrollSnapAlign: 'start',
                        bgcolor: quantity > 0 ? 'success.50' : 'background.paper',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          boxShadow: 1,
                        },
                      }}
                    >
                      <CardContent sx={{ p: 0.75, '&:last-child': { pb: 0.75 } }}>
                        <Typography variant="caption" fontWeight="medium" display="block" sx={{ mb: 0.5, fontSize: '0.65rem', lineHeight: 1.2 }}>
                          {store.code}
                        </Typography>
                        <TextField
                          type="number"
                          size="small"
                          value={quantity}
                          onChange={(e) => handleChangeAllocation(store.code, parseInt(e.target.value) || 0)}
                          fullWidth
                          inputProps={{
                            inputMode: 'numeric',
                            pattern: '[0-9]*',
                            min: 0,
                            style: { textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', padding: '6px 4px' },
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontSize: '0.75rem',
                            },
                            '& .MuiInputBase-input': {
                              padding: '6px 4px',
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
                    width: 50,
                    background: 'linear-gradient(to left, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0) 100%)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    pr: 1,
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 'bold' }}>
                    →
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="info" sx={{ fontSize: '0.8rem', py: 0.5 }}>
              配分する店舗を選択してください
            </Alert>
          )}
        </Box>
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
