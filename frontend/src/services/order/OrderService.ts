import { STORE_DATA } from '@/utils/constants';
import type { StoreSettings } from '@/types/storeSettings';

/**
 * 自動配分の方式
 */
export type AllocationMethod = 'even' | 'salesRatio' | 'proportional' | 'history';

/**
 * 自動配分の結果
 */
export interface AllocationResult {
  /** 配分配列（36店舗） */
  allocations: number[];
  /** 使用した配分方式 */
  method: AllocationMethod;
  /** 配分が成功したか */
  success: boolean;
  /** エラーメッセージ（失敗時） */
  error?: string;
}

/**
 * OrderService
 *
 * 注文に関するビジネスロジックを提供するサービスクラス
 *
 * 責務:
 * - 価格計算（センターフィー込原価、値入率、差益）
 * - 配分計算（店舗への自動配分）
 * - バリデーション（ビジネスルール）
 * - データ変換（フォーマット変換）
 *
 * @example
 * ```typescript
 * // センターフィー込原価を計算
 * const costWithFee = OrderService.calculateCenterCostWithFee(100, 13);
 * console.log(costWithFee); // 113
 *
 * // 値入率を計算
 * const margin = OrderService.calculateProfitMargin(150, 100);
 * console.log(margin); // 33.3
 *
 * // 差益を計算
 * const profit = OrderService.calculateProfitAmount(100, 113, 10, 10);
 * console.log(profit); // -13000
 * ```
 */
export class OrderService {
  /**
   * センターフィー込原価を計算
   *
   * センター着原価にセンターフィー率を加算した金額を計算します。
   * 結果は四捨五入されます。
   *
   * @param centerCost - センター着原価
   * @param centerFeeRate - センターフィー率（%）
   * @returns センターフィー込原価（四捨五入）
   *
   * @example
   * ```typescript
   * const costWithFee = OrderService.calculateCenterCostWithFee(100, 13);
   * // 100 * (1 + 13/100) = 100 * 1.13 = 113
   * console.log(costWithFee); // 113
   * ```
   */
  static calculateCenterCostWithFee(centerCost: number, centerFeeRate: number): number {
    if (centerCost <= 0) return 0;
    return Math.round(centerCost * (1 + centerFeeRate / 100));
  }

  /**
   * 値入率を計算
   *
   * (売価 - 店着原価) / 売価 × 100 で計算します。
   * 結果は小数点第1位まで表示されます。
   *
   * @param priceExcludingTax - 本体価格（税抜売価）
   * @param storeCost - 店着原価
   * @returns 値入率（%、小数点第1位）
   *
   * @example
   * ```typescript
   * const margin = OrderService.calculateProfitMargin(150, 100);
   * // (150 - 100) / 150 * 100 = 33.333... ≒ 33.3
   * console.log(margin); // 33.3
   * ```
   */
  static calculateProfitMargin(priceExcludingTax: number, storeCost: number): number {
    if (!priceExcludingTax || priceExcludingTax <= 0) return 0;
    if (!storeCost) return 0;

    const margin = ((priceExcludingTax - storeCost) / priceExcludingTax) * 100;
    return Math.round(margin * 10) / 10; // 小数点第1位まで
  }

  /**
   * 差益金額を計算
   *
   * (店着原価 - センターフィー込原価) × (総納品数 × 入数) で計算します。
   *
   * @param storeCost - 店着原価
   * @param centerCostWithFee - センターフィー込原価
   * @param totalDelivery - 総納品数（ケース数）
   * @param quantityPerPackage - 入数
   * @returns 差益金額（円）
   *
   * @example
   * ```typescript
   * const profit = OrderService.calculateProfitAmount(120, 113, 10, 10);
   * // (120 - 113) * (10 * 10) = 7 * 100 = 700
   * console.log(profit); // 700
   * ```
   */
  static calculateProfitAmount(
    storeCost: number,
    centerCostWithFee: number,
    totalDelivery: number,
    quantityPerPackage: number
  ): number {
    if (!storeCost || !centerCostWithFee || !totalDelivery || !quantityPerPackage) {
      return 0;
    }

    return Math.round((storeCost - centerCostWithFee) * (totalDelivery * quantityPerPackage));
  }

  /**
   * 店着原価を逆算
   *
   * センター着原価とセンターフィー率から、店着原価を推定します。
   * センターフィー込原価 = 店着原価 と仮定した場合の値です。
   *
   * @param centerCost - センター着原価
   * @param centerFeeRate - センターフィー率（%）
   * @returns 推定店着原価（四捨五入）
   *
   * @example
   * ```typescript
   * const storeCost = OrderService.estimateStoreCost(100, 13);
   * // 100 * (1 + 13/100) = 113
   * console.log(storeCost); // 113
   * ```
   */
  static estimateStoreCost(centerCost: number, centerFeeRate: number): number {
    return this.calculateCenterCostWithFee(centerCost, centerFeeRate);
  }

  /**
   * 売価を逆算
   *
   * 店着原価と目標値入率から、売価を推定します。
   *
   * @param storeCost - 店着原価
   * @param targetMargin - 目標値入率（%）
   * @returns 推定売価（四捨五入）
   *
   * @example
   * ```typescript
   * const price = OrderService.estimatePrice(100, 30);
   * // storeCost / (1 - targetMargin/100) = 100 / 0.7 ≒ 143
   * console.log(price); // 143
   * ```
   */
  static estimatePrice(storeCost: number, targetMargin: number): number {
    if (!storeCost || storeCost <= 0) return 0;
    if (targetMargin <= 0 || targetMargin >= 100) return 0;

    return Math.round(storeCost / (1 - targetMargin / 100));
  }

  /**
   * 配分合計が総納品数と一致するか検証
   *
   * @param storeAllocations - 店舗配分配列
   * @param totalDelivery - 総納品数
   * @returns 一致する場合true
   *
   * @example
   * ```typescript
   * const valid = OrderService.validateAllocation([2, 3, 5], 10);
   * console.log(valid); // true (2+3+5=10)
   * ```
   */
  static validateAllocation(storeAllocations: number[], totalDelivery: number): boolean {
    const sum = storeAllocations.reduce((acc, val) => acc + (val || 0), 0);
    return sum === totalDelivery;
  }

  /**
   * 配分合計を計算
   *
   * @param storeAllocations - 店舗配分配列
   * @returns 配分合計
   *
   * @example
   * ```typescript
   * const total = OrderService.calculateAllocationTotal([2, 3, 5]);
   * console.log(total); // 10
   * ```
   */
  static calculateAllocationTotal(storeAllocations: number[]): number {
    return storeAllocations.reduce((acc, val) => acc + (val || 0), 0);
  }

  /**
   * 均等配分を計算
   *
   * 総納品数を店舗数で均等に配分します。
   * 割り切れない場合、余りは最初の店舗から順に1つずつ追加します。
   *
   * @param totalDelivery - 総納品数
   * @param storeCount - 店舗数
   * @returns 配分配列
   *
   * @example
   * ```typescript
   * const allocations = OrderService.calculateEvenAllocation(10, 3);
   * console.log(allocations); // [4, 3, 3] (10 = 4+3+3)
   * ```
   */
  static calculateEvenAllocation(totalDelivery: number, storeCount: number): number[] {
    if (totalDelivery <= 0 || storeCount <= 0) {
      return new Array(storeCount).fill(0);
    }

    const baseAmount = Math.floor(totalDelivery / storeCount);
    const remainder = totalDelivery % storeCount;

    const allocations = new Array(storeCount).fill(baseAmount);

    // 余りを最初の店舗から順に配分
    for (let i = 0; i < remainder; i++) {
      allocations[i] += 1;
    }

    return allocations;
  }

  /**
   * 比率配分を計算
   *
   * 各店舗の既存配分比率を維持したまま、総納品数に合わせて再配分します。
   * 端数調整は最大配分店舗で行います。
   *
   * @param currentAllocations - 現在の配分
   * @param newTotalDelivery - 新しい総納品数
   * @returns 新しい配分配列
   *
   * @example
   * ```typescript
   * const newAllocations = OrderService.calculateProportionalAllocation([2, 3, 5], 20);
   * // 比率 2:3:5 を維持して20に配分 → [4, 6, 10]
   * console.log(newAllocations); // [4, 6, 10]
   * ```
   */
  static calculateProportionalAllocation(
    currentAllocations: number[],
    newTotalDelivery: number
  ): number[] {
    const currentTotal = this.calculateAllocationTotal(currentAllocations);

    if (currentTotal === 0 || newTotalDelivery <= 0) {
      return this.calculateEvenAllocation(newTotalDelivery, currentAllocations.length);
    }

    // 比率を計算
    const ratios = currentAllocations.map(val => (val || 0) / currentTotal);

    // 新しい配分を計算（小数点以下切り捨て）
    const newAllocations = ratios.map(ratio => Math.floor(ratio * newTotalDelivery));

    // 端数を計算
    const allocatedTotal = this.calculateAllocationTotal(newAllocations);
    const shortfall = newTotalDelivery - allocatedTotal;

    // 端数を最大配分店舗に追加
    if (shortfall > 0) {
      const maxIndex = newAllocations.indexOf(Math.max(...newAllocations));
      newAllocations[maxIndex] += shortfall;
    }

    return newAllocations;
  }

  /**
   * 金額を円表示にフォーマット
   *
   * @param amount - 金額
   * @returns フォーマット済み文字列（例: "1,234円"）
   *
   * @example
   * ```typescript
   * const formatted = OrderService.formatCurrency(1234);
   * console.log(formatted); // "1,234円"
   * ```
   */
  static formatCurrency(amount: number): string {
    return `${amount.toLocaleString('ja-JP')}円`;
  }

  /**
   * パーセンテージをフォーマット
   *
   * @param value - 値
   * @param decimals - 小数点以下桁数（デフォルト: 1）
   * @returns フォーマット済み文字列（例: "33.3%"）
   *
   * @example
   * ```typescript
   * const formatted = OrderService.formatPercentage(33.333);
   * console.log(formatted); // "33.3%"
   * ```
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * 販売構成比に基づく自動配分
   *
   * 各店舗の販売構成比（salesRatio）に基づいて配分を計算します。
   * ロック済み店舗がある場合、残りの数量を未ロック店舗に配分します。
   *
   * @param totalDelivery - 総納品数
   * @param storeSettings - 店舗設定（店舗コードをキーとするオブジェクト）
   * @param lockedAllocations - ロック済み店舗の配分（店舗コード → 数量）
   * @returns 配分結果
   *
   * @example
   * ```typescript
   * const result = OrderService.calculateSalesRatioAllocation(
   *   100,
   *   { '01': { salesRatio: 10, enabled: true }, '02': { salesRatio: 20, enabled: true } },
   *   new Map([['01', 15]])  // 店舗01は15個で固定
   * );
   * // 残り85個を店舗02以降にsalesRatioで配分
   * ```
   */
  static calculateSalesRatioAllocation(
    totalDelivery: number,
    storeSettings: Record<string, StoreSettings>,
    lockedAllocations: Map<string, number> = new Map()
  ): AllocationResult {
    if (totalDelivery <= 0) {
      return {
        allocations: new Array(STORE_DATA.length).fill(0),
        method: 'salesRatio',
        success: true,
      };
    }

    // 1. ロック済み店舗の合計を計算
    let lockedTotal = 0;
    lockedAllocations.forEach((qty) => {
      lockedTotal += qty;
    });

    // ロック済みの合計が総納品数を超えている場合はエラー
    if (lockedTotal > totalDelivery) {
      return {
        allocations: new Array(STORE_DATA.length).fill(0),
        method: 'salesRatio',
        success: false,
        error: 'ロック済み店舗の合計が総納品数を超えています',
      };
    }

    // 2. 残りの配分数量
    const remainingQty = totalDelivery - lockedTotal;

    // 3. 有効な店舗のsalesRatio合計を計算（ロック済み・無効店舗を除外）
    let totalRatio = 0;
    const enabledStores: { index: number; code: string; ratio: number }[] = [];

    STORE_DATA.forEach((store, index) => {
      if (!lockedAllocations.has(store.code)) {
        const setting = storeSettings[store.code];
        // enabled が undefined または true の場合は有効とみなす
        if (setting?.enabled !== false) {
          const ratio = setting?.salesRatio ?? 0;
          if (ratio > 0) {
            totalRatio += ratio;
            enabledStores.push({ index, code: store.code, ratio });
          }
        }
      }
    });

    // 4. 配分配列を初期化
    const allocations: number[] = new Array(STORE_DATA.length).fill(0);

    // 5. ロック済み店舗の値を設定
    STORE_DATA.forEach((store, index) => {
      if (lockedAllocations.has(store.code)) {
        allocations[index] = lockedAllocations.get(store.code)!;
      }
    });

    // 6. 残りを販売構成比で配分
    if (remainingQty > 0 && totalRatio > 0) {
      let allocated = 0;

      // 比率に基づいて配分（小数点以下切り捨て）
      enabledStores.forEach(({ index, ratio }) => {
        const amount = Math.floor((ratio / totalRatio) * remainingQty);
        allocations[index] = amount;
        allocated += amount;
      });

      // 7. 端数調整（最大比率の店舗に追加）
      const shortfall = remainingQty - allocated;
      if (shortfall > 0 && enabledStores.length > 0) {
        // 最大比率の店舗を探す
        const maxStore = enabledStores.reduce((max, store) =>
          store.ratio > max.ratio ? store : max
        );
        allocations[maxStore.index] += shortfall;
      }
    } else if (remainingQty > 0 && totalRatio === 0) {
      // 販売構成比が設定されていない場合は均等配分にフォールバック
      const enabledIndices = STORE_DATA
        .map((store, index) => ({ store, index }))
        .filter(({ store }) => {
          if (lockedAllocations.has(store.code)) return false;
          const setting = storeSettings[store.code];
          return setting?.enabled !== false;
        })
        .map(({ index }) => index);

      if (enabledIndices.length > 0) {
        const baseAmount = Math.floor(remainingQty / enabledIndices.length);
        const remainder = remainingQty % enabledIndices.length;

        enabledIndices.forEach((index, i) => {
          allocations[index] = baseAmount + (i < remainder ? 1 : 0);
        });
      }
    }

    return {
      allocations,
      method: 'salesRatio',
      success: true,
    };
  }

  /**
   * 過去の配分履歴に基づく自動配分
   *
   * 同じ商品名（または類似商品）の過去の配分パターンを参考に配分を計算します。
   * 過去データがない場合は均等配分にフォールバックします。
   *
   * @param totalDelivery - 総納品数
   * @param pastAllocations - 過去の配分データ（配列の配列）
   * @param lockedAllocations - ロック済み店舗の配分（店舗コード → 数量）
   * @returns 配分結果
   *
   * @example
   * ```typescript
   * const pastData = [
   *   [10, 20, 15, ...],  // 過去の配分1
   *   [12, 18, 16, ...],  // 過去の配分2
   * ];
   * const result = OrderService.calculateHistoryBasedAllocation(100, pastData);
   * // 過去の平均比率で配分
   * ```
   */
  static calculateHistoryBasedAllocation(
    totalDelivery: number,
    pastAllocations: number[][],
    lockedAllocations: Map<string, number> = new Map()
  ): AllocationResult {
    if (totalDelivery <= 0) {
      return {
        allocations: new Array(STORE_DATA.length).fill(0),
        method: 'history',
        success: true,
      };
    }

    // 過去データがない場合は均等配分
    if (pastAllocations.length === 0) {
      const evenAllocations = this.calculateEvenAllocation(totalDelivery, STORE_DATA.length);
      return {
        allocations: evenAllocations,
        method: 'history',
        success: true,
        error: '過去の配分履歴がないため、均等配分を適用しました',
      };
    }

    // 1. ロック済み店舗の合計を計算
    let lockedTotal = 0;
    lockedAllocations.forEach((qty) => {
      lockedTotal += qty;
    });

    if (lockedTotal > totalDelivery) {
      return {
        allocations: new Array(STORE_DATA.length).fill(0),
        method: 'history',
        success: false,
        error: 'ロック済み店舗の合計が総納品数を超えています',
      };
    }

    const remainingQty = totalDelivery - lockedTotal;

    // 2. 過去データの平均比率を計算
    const avgRatios: number[] = new Array(STORE_DATA.length).fill(0);
    let validDataCount = 0;

    pastAllocations.forEach((allocation) => {
      const total = allocation.reduce((sum, val) => sum + (val || 0), 0);
      if (total > 0) {
        validDataCount++;
        allocation.forEach((val, index) => {
          avgRatios[index] += (val || 0) / total;
        });
      }
    });

    // 平均を計算
    if (validDataCount > 0) {
      avgRatios.forEach((_, index) => {
        avgRatios[index] /= validDataCount;
      });
    }

    // 3. 配分配列を初期化
    const allocations: number[] = new Array(STORE_DATA.length).fill(0);

    // 4. ロック済み店舗の値を設定
    STORE_DATA.forEach((store, index) => {
      if (lockedAllocations.has(store.code)) {
        allocations[index] = lockedAllocations.get(store.code)!;
      }
    });

    // 5. ロックされていない店舗の比率を再計算
    let unlockedRatioTotal = 0;
    STORE_DATA.forEach((store, index) => {
      if (!lockedAllocations.has(store.code)) {
        unlockedRatioTotal += avgRatios[index];
      }
    });

    // 6. 残りを過去の比率で配分
    if (remainingQty > 0 && unlockedRatioTotal > 0) {
      let allocated = 0;

      STORE_DATA.forEach((store, index) => {
        if (!lockedAllocations.has(store.code)) {
          const normalizedRatio = avgRatios[index] / unlockedRatioTotal;
          const amount = Math.floor(normalizedRatio * remainingQty);
          allocations[index] = amount;
          allocated += amount;
        }
      });

      // 7. 端数調整（最大比率の未ロック店舗に追加）
      const shortfall = remainingQty - allocated;
      if (shortfall > 0) {
        let maxIndex = -1;
        let maxRatio = 0;
        STORE_DATA.forEach((store, index) => {
          if (!lockedAllocations.has(store.code) && avgRatios[index] > maxRatio) {
            maxRatio = avgRatios[index];
            maxIndex = index;
          }
        });
        if (maxIndex >= 0) {
          allocations[maxIndex] += shortfall;
        }
      }
    } else if (remainingQty > 0) {
      // 比率がない場合は均等配分
      const unlockedIndices: number[] = [];
      STORE_DATA.forEach((store, index) => {
        if (!lockedAllocations.has(store.code)) {
          unlockedIndices.push(index);
        }
      });

      if (unlockedIndices.length > 0) {
        const baseAmount = Math.floor(remainingQty / unlockedIndices.length);
        const remainder = remainingQty % unlockedIndices.length;

        unlockedIndices.forEach((index, i) => {
          allocations[index] = baseAmount + (i < remainder ? 1 : 0);
        });
      }
    }

    return {
      allocations,
      method: 'history',
      success: true,
    };
  }
}
