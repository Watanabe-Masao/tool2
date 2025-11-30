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

  // 長押し+スワイプ検出用の状態
  const longPressTimer = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);
  const touchStartX = React.useRef<number | null>(null);
  const touchStartTime = React.useRef<number | null>(null);
  const currentTouchStore = React.useRef<string | null>(null);
  const isLongPressActivated = React.useRef<boolean>(false);
  const isInputFieldTouch = React.useRef<boolean>(false);
  const [swipePreview, setSwipePreview] = React.useState<{ storeCode: string; direction: 'up' | 'down' } | null>(null);

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
   * タッチ開始（長押し+スワイプ用）
   */
  const handleTouchStart = (storeCode: string, event: React.TouchEvent) => {
    // 入力フィールド内でのタッチは完全に無視
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.closest('input')) {
      isInputFieldTouch.current = true;
      return;
    }

    isInputFieldTouch.current = false;
    isLongPressActivated.current = false;

    const touch = event.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
    touchStartTime.current = Date.now();
    currentTouchStore.current = storeCode;

    // 長押し判定を600msに延長（誤操作防止）
    longPressTimer.current = window.setTimeout(() => {
      // 長押しが成立
      isLongPressActivated.current = true;
    }, 600);
  };

  /**
   * タッチ移動（スワイプ検出）
   */
  const handleTouchMove = (event: React.TouchEvent) => {
    // 入力フィールド内のタッチは無視
    if (isInputFieldTouch.current) return;

    if (!touchStartY.current || !touchStartX.current || !currentTouchStore.current || !touchStartTime.current) return;

    const touch = event.touches[0];
    const deltaY = touch.clientY - touchStartY.current;
    const deltaX = touch.clientX - touchStartX.current;

    // 長押しが成立している場合のみスワイプ検出
    if (isLongPressActivated.current) {
      // 横方向の移動が大きい場合は、横スクロールとみなして無視
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
        // 横スワイプを検出したらロック操作をキャンセル
        if (longPressTimer.current) {
          window.clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        isLongPressActivated.current = false;
        setSwipePreview(null);
        return;
      }

      // 縦方向のスワイプを検出（70px以上）
      if (Math.abs(deltaY) > 70) {
        // スクロールを防ぐ（縦スワイプが検出されたら）
        event.preventDefault();

        if (deltaY < -70) {
          // 上スワイプ
          setSwipePreview({ storeCode: currentTouchStore.current, direction: 'up' });
        } else if (deltaY > 70) {
          // 下スワイプ
          setSwipePreview({ storeCode: currentTouchStore.current, direction: 'down' });
        }
      }
    }
  };

  /**
   * タッチ終了（スワイプ実行）
   */
  const handleTouchEnd = () => {
    // 入力フィールド内のタッチは無視
    if (isInputFieldTouch.current) {
      isInputFieldTouch.current = false;
      return;
    }

    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // 長押し+スワイプが成立した場合のみロック操作を実行
    if (isLongPressActivated.current && swipePreview && currentTouchStore.current) {
      const storeCode = currentTouchStore.current;

      if (swipePreview.direction === 'up') {
        // 上スワイプ: ロック
        const newLockedStores = new Set(lockedStores);
        newLockedStores.add(storeCode);
        setLockedStores(newLockedStores);
      } else if (swipePreview.direction === 'down') {
        // 下スワイプ: ロック解除
        const newLockedStores = new Set(lockedStores);
        newLockedStores.delete(storeCode);
        setLockedStores(newLockedStores);
      }
    }

    // リセット
    touchStartY.current = null;
    touchStartX.current = null;
    touchStartTime.current = null;
    currentTouchStore.current = null;
    isLongPressActivated.current = false;
    isInputFieldTouch.current = false;
    setSwipePreview(null);
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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {categories.map((category, index) => {
                  const color = getCategoryColor(index);
                  const isSelected = selectedCategories.has(category.id);
                  const storeCount = getCategoryStores(category.id).length;
                  return (
                    <Chip
                      key={category.id}
                      label={
                        /* バッジスタイル: カテゴリ名 + 円形カウンター */
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            lineHeight: 1,
                          }}>
                            {category.name}
                          </Typography>
                          {/* 店舗数バッジ（円形） */}
                          <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 18,
                            height: 18,
                            px: 0.25,
                            borderRadius: '9px',
                            bgcolor: isSelected
                              ? 'rgba(255, 255, 255, 0.3)'
                              : `${color.main}20`,
                          }}>
                            <Typography variant="caption" sx={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              lineHeight: 1,
                              color: isSelected ? 'white' : color.main,
                            }}>
                              {storeCount}
                            </Typography>
                          </Box>
                        </Box>
                      }
                      onClick={() => handleToggleCategory(category.id)}
                      size="small"
                      sx={{
                        // UX重視: 控えめな色使いで、カテゴリ所属を明確に
                        bgcolor: isSelected ? `${color.light}` : 'rgba(255, 255, 255, 0.9)',
                        color: isSelected ? color.main : color.main,
                        borderColor: color.main, // 常にカテゴリ色の境界線
                        borderWidth: isSelected ? 2 : 1.5,
                        borderStyle: 'solid',
                        height: 32,
                        borderRadius: 16,
                        boxShadow: isSelected
                          ? `0 2px 6px ${color.main}30`
                          : '0 1px 2px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                        '& .MuiChip-label': {
                          px: 1.25,
                        },
                        '&:hover': {
                          bgcolor: isSelected ? color.light : `${color.main}10`,
                          transform: 'scale(1.08) translateY(-1px)',
                          boxShadow: `0 3px 8px ${color.main}25`,
                        },
                        '&:active': {
                          transform: 'scale(0.96)',
                          transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
                        },
                      }}
                    />
                  );
                })}
                <Chip
                  label={
                    /* バッジスタイル: 未分類 + 円形カウンター */
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        lineHeight: 1,
                      }}>
                        未分類
                      </Typography>
                      {/* 店舗数バッジ（円形） */}
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 18,
                        height: 18,
                        px: 0.25,
                        borderRadius: '9px',
                        bgcolor: selectedCategories.has('uncategorized')
                          ? 'rgba(255, 255, 255, 0.3)'
                          : 'rgba(97, 97, 97, 0.15)',
                      }}>
                        <Typography variant="caption" sx={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          lineHeight: 1,
                          color: selectedCategories.has('uncategorized') ? 'white' : 'grey.700',
                        }}>
                          {getUncategorizedStores().length}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  onClick={() => handleToggleCategory('uncategorized')}
                  size="small"
                  sx={{
                    // UX重視: 控えめな色使い
                    bgcolor: selectedCategories.has('uncategorized')
                      ? 'grey.300'
                      : 'rgba(255, 255, 255, 0.9)',
                    color: selectedCategories.has('uncategorized') ? 'grey.800' : 'grey.600',
                    borderColor: 'grey.500', // 常にグレー系の境界線
                    borderWidth: selectedCategories.has('uncategorized') ? 2 : 1.5,
                    borderStyle: 'solid',
                    height: 32,
                    borderRadius: 16,
                    boxShadow: selectedCategories.has('uncategorized')
                      ? '0 2px 6px rgba(0, 0, 0, 0.12)'
                      : '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: selectedCategories.has('uncategorized') ? 'scale(1.02)' : 'scale(1)',
                    '& .MuiChip-label': {
                      px: 1.25,
                    },
                    '&:hover': {
                      bgcolor: selectedCategories.has('uncategorized') ? 'grey.300' : 'grey.100',
                      transform: 'scale(1.08) translateY(-1px)',
                      boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
                    },
                    '&:active': {
                      transform: 'scale(0.96)',
                      transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
                    },
                  }}
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
            {/* 店舗選択エリア: CSS Grid レイアウト（モバイルで1行5-6個） */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
              gap: 0.75,
              maxHeight: 200,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch', // スムーズスクロール（iOS）
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
                // モバイル最適化: 情報階層を簡潔に（店舗コード + 数量のみ）
                const storeCategory = getStoreCategory(store.code);
                const categoryIndex = storeCategory ? categories.findIndex((c) => c.id === storeCategory.id) : -1;
                const color = categoryIndex >= 0 ? getCategoryColor(categoryIndex) : null;

                return (
                  <Chip
                    key={store.code}
                    label={
                      /* 情報の階層化: 店舗コード（大）+ 数量（小）を縦並び */
                      <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.25,
                        py: 0.5,
                      }}>
                        {/* 店舗コード - メイン情報 */}
                        <Typography variant="caption" sx={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          lineHeight: 1,
                          letterSpacing: '0.01em',
                        }}>
                          {store.code}
                        </Typography>

                        {/* 数量 - サブ情報（存在する場合のみ） */}
                        {quantity > 0 && (
                          <Typography variant="caption" sx={{
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            lineHeight: 1,
                          }}>
                            {quantity}
                          </Typography>
                        )}
                      </Box>
                    }
                    onClick={() => handleToggleStore(store.code)}
                    size="small"
                    sx={
                      color
                        ? {
                            // 固定サイズ（グリッドに合わせる）
                            width: '100%',
                            height: 44, // Appleタッチ最小サイズ
                            // UX重視: カテゴリ色を控えめに使用、未選択でも所属が明確
                            bgcolor: isSelected ? color.light : 'rgba(255, 255, 255, 0.9)',
                            color: isSelected ? color.main : color.main,
                            // 境界線: 常にカテゴリ色（未選択でも所属を示す）
                            borderColor: color.main,
                            borderWidth: isSelected ? 2 : 1.5,
                            borderStyle: 'solid',
                            borderRadius: 2, // 8px
                            // 影（控えめに）
                            boxShadow: isSelected
                              ? `0 2px 6px ${color.main}30`
                              : '0 1px 2px rgba(0, 0, 0, 0.05)',
                            // トランジション（細部にこだわる）
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                            // ラベルパディング最小化
                            '& .MuiChip-label': {
                              px: 0.5,
                              width: '100%',
                            },
                            // ホバー: 浮き上がる効果
                            '&:hover': {
                              bgcolor: isSelected ? color.light : `${color.main}10`,
                              transform: 'scale(1.08) translateY(-2px)',
                              boxShadow: `0 3px 8px ${color.main}25`,
                            },
                            // アクティブ: 押し込む効果
                            '&:active': {
                              transform: 'scale(0.96)',
                              transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
                            },
                          }
                        : {
                            // 固定サイズ（グリッドに合わせる）
                            width: '100%',
                            height: 44, // Appleタッチ最小サイズ（操作性重視）
                            // UX重視: 未分類店舗もグレー系で統一（控えめ）
                            bgcolor: isSelected ? 'grey.300' : 'rgba(255, 255, 255, 0.9)',
                            color: isSelected ? 'grey.800' : 'grey.600',
                            // 境界線: 常にグレー系（未選択でも分かる）
                            borderColor: 'grey.500',
                            borderWidth: isSelected ? 2 : 1.5,
                            borderStyle: 'solid',
                            borderRadius: 2, // 8px - タッチしやすい角丸
                            // 影（控えめに）
                            boxShadow: isSelected
                              ? '0 2px 6px rgba(0, 0, 0, 0.12)'
                              : '0 1px 2px rgba(0, 0, 0, 0.05)',
                            // トランジション（スムーズな状態変化）
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                            // ラベルパディング最小化（情報密度向上）
                            '& .MuiChip-label': {
                              px: 0.5,
                              width: '100%',
                            },
                            // ホバー: 浮き上がる効果（操作のフィードバック）
                            '&:hover': {
                              bgcolor: isSelected ? 'grey.300' : 'grey.100',
                              transform: 'scale(1.08) translateY(-2px)',
                              boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
                            },
                            // アクティブ: 押し込む効果（タッチフィードバック）
                            '&:active': {
                              transform: 'scale(0.96)',
                              transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
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
        <Box>
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
              sx={{
                position: 'relative',
                border: '2px solid',
                borderColor: 'primary.main',
                borderRadius: 1,
                bgcolor: 'background.paper',
                p: 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              {/* グリッド形式（2列） - 横スクロール削減 */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1,
                  maxHeight: 300,
                  overflowY: 'auto',
                  px: 0.5,
                  py: 1,
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'thin',
                  '&::-webkit-scrollbar': {
                    width: 8,
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
                      sx={{
                        // グリッド幅に合わせる
                        width: '100%',
                        height: 'fit-content',
                        bgcolor:
                          swipePreview?.storeCode === store.code
                            ? swipePreview.direction === 'up'
                              ? 'warning.100'
                              : 'info.100'
                            : isLocked
                            ? 'warning.50'
                            : quantity > 0
                            ? 'success.50'
                            : 'background.paper',
                        borderColor:
                          swipePreview?.storeCode === store.code
                            ? swipePreview.direction === 'up'
                              ? 'warning.main'
                              : 'info.main'
                            : isLocked
                            ? 'warning.main'
                            : quantity > 0
                            ? 'success.main'
                            : 'divider',
                        borderWidth: isLocked || quantity > 0 || swipePreview?.storeCode === store.code ? 2 : 1,
                        transition: 'all 0.15s ease',
                        boxShadow: quantity > 0 ? 1 : 0,
                        transform:
                          swipePreview?.storeCode === store.code
                            ? swipePreview.direction === 'up'
                              ? 'translateY(-4px)'
                              : 'translateY(4px)'
                            : 'none',
                        '&:hover': {
                          boxShadow: 2,
                        },
                      }}
                    >
                      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                        {/* ヘッダー部分（長押し+スワイプ操作エリア） */}
                        <Box
                          onTouchStart={(e) => handleTouchStart(store.code, e)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleToggleLock(store.code);
                          }}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 0.75,
                            pb: 0.5,
                            cursor: 'pointer',
                            userSelect: 'none',
                            // このエリアでは長押し+縦スワイプを検出
                            touchAction: 'none',
                          }}
                        >
                          <Typography variant="caption" fontWeight="medium" display="block" sx={{ fontSize: '0.65rem', lineHeight: 1.2 }}>
                            {store.code}店
                          </Typography>
                          {isLocked && <Lock sx={{ fontSize: '0.8rem', color: 'warning.main' }} />}
                        </Box>
                        {/* 入力フィールドエリア */}
                        <Box sx={{ px: 0.75, pb: 0.75 }}>
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
                              // 入力フィールド内では通常のタッチ操作を許可
                              touchAction: 'manipulation',
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
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
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
