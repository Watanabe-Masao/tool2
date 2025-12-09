import { useCallback } from 'react';
import { STORE_DATA, STORE_COUNT } from '@/utils/constants';
import type { StoreSettings } from '@/types/storeSettings';

/**
 * 自動配分フックのパラメータ
 */
export interface UseAutoDistributionParams {
  allocations: number[];
  selectedStores: Set<string>;
  lockedStores: Set<string>;
  storeSettings: Record<string, StoreSettings>;
  totalDelivery: number;
  allocationRate: number;
  onChange: (allocations: number[]) => void;
}

/**
 * 自動配分フック
 *
 * 均等配分・構成比配分のロジックを提供します。
 * 固定店舗（ロック済み）を除外した配分を行います。
 */
export const useAutoDistribution = ({
  allocations,
  selectedStores,
  lockedStores,
  storeSettings,
  totalDelivery,
  allocationRate,
  onChange,
}: UseAutoDistributionParams) => {
  /**
   * 固定されていない選択店舗と残り配分数を計算
   */
  const getUnlockedContext = useCallback(() => {
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

    // 残りの配分数（配分率適用）
    const remainingDelivery = totalDelivery - lockedTotal;
    const adjustedDelivery = Math.floor(remainingDelivery * (allocationRate / 100));

    return {
      unlockedSelectedStores,
      lockedTotal,
      remainingDelivery,
      adjustedDelivery,
    };
  }, [allocations, selectedStores, lockedStores, totalDelivery, allocationRate]);

  /**
   * 均等配分
   */
  const distributeEqual = useCallback(() => {
    if (selectedStores.size === 0) return;

    const { unlockedSelectedStores, remainingDelivery, adjustedDelivery } = getUnlockedContext();

    if (unlockedSelectedStores.length === 0) return;

    if (remainingDelivery < 0) {
      alert('固定された配分数が総納品数を超えています');
      return;
    }

    const newAllocations = [...allocations];
    const perStore = Math.floor(adjustedDelivery / unlockedSelectedStores.length);
    const remainder = adjustedDelivery % unlockedSelectedStores.length;
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
  }, [allocations, selectedStores, lockedStores, getUnlockedContext, onChange]);

  /**
   * 構成比による配分
   */
  const distributeByRatio = useCallback(() => {
    if (selectedStores.size === 0) return;

    const { unlockedSelectedStores, remainingDelivery, adjustedDelivery } = getUnlockedContext();

    if (unlockedSelectedStores.length === 0) return;

    if (remainingDelivery < 0) {
      alert('固定された配分数が総納品数を超えています');
      return;
    }

    // 選択店舗の構成比を収集
    const selectedStoresWithRatio: Array<{ code: string; ratio: number }> = [];
    let totalRatio = 0;

    unlockedSelectedStores.forEach((code) => {
      const setting = storeSettings[code];
      const ratio = setting?.salesRatio || 0;
      selectedStoresWithRatio.push({ code, ratio });
      totalRatio += ratio;
    });

    // 構成比が0の場合は均等配分にフォールバック
    if (totalRatio === 0) {
      distributeEqual();
      return;
    }

    const newAllocations = [...allocations];
    let allocated = 0;

    const distributionPlan: Array<{ code: string; quantity: number }> = [];
    selectedStoresWithRatio.forEach(({ code, ratio }) => {
      const normalizedRatio = ratio / totalRatio;
      const quantity = Math.floor(adjustedDelivery * normalizedRatio);
      distributionPlan.push({ code, quantity });
      allocated += quantity;
    });

    // 余りを構成比が高い店舗から配分
    const remainingQty = adjustedDelivery - allocated;
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
  }, [allocations, selectedStores, lockedStores, storeSettings, getUnlockedContext, distributeEqual, onChange]);

  /**
   * 全クリア
   */
  const clearAll = useCallback(() => {
    onChange(new Array(STORE_COUNT).fill(0));
  }, [onChange]);

  /**
   * 未ロック店舗のみクリア
   */
  const clearUnlocked = useCallback(() => {
    const newAllocations = [...allocations];
    STORE_DATA.forEach((store, index) => {
      if (!lockedStores.has(store.code)) {
        newAllocations[index] = 0;
      }
    });
    onChange(newAllocations);
  }, [allocations, lockedStores, onChange]);

  return {
    distributeEqual,
    distributeByRatio,
    clearAll,
    clearUnlocked,
  };
};
