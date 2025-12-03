import type { AllocationDetail } from '@/types/allocationHistory';
import type { DetailGridRow, AllocationDetailWithDate, StoreAggregation } from '../types';
import { STORE_DATA } from '@/utils/constants';

/**
 * 店舗別配分数量を集計（純粋関数）
 *
 * @param details - 配分明細の配列
 * @returns 店舗別集計データ
 */
export const aggregateStoreAllocations = (
  details: AllocationDetail[] | AllocationDetailWithDate[]
): StoreAggregation => {
  const byStore: number[] = Array(STORE_DATA.length).fill(0);
  let total = 0;

  details.forEach(detail => {
    detail.storeAllocations.forEach((qty, storeIdx) => {
      if (storeIdx < STORE_DATA.length) {
        byStore[storeIdx] += qty;
      }
    });
    total += (detail.totalDelivery ?? 0);
  });

  return { byStore, total };
};

/**
 * DetailGridRowを作成（純粋関数）
 *
 * @param detail - 配分明細
 * @param id - 行ID
 * @param deliveryDate - 納品日（オプション）
 * @returns DataGrid行データ
 */
export const createDataRow = (
  detail: AllocationDetail | AllocationDetailWithDate,
  id: string,
  deliveryDate?: string
): DetailGridRow => {
  const row: DetailGridRow = {
    id,
    productName: detail.productName,
    origin: detail.origin,
    specification: detail.specification,
    unit: detail.unit,
    quantityPerPackage: detail.quantityPerPackage,
    packageUnit: detail.packageUnit,
    totalDelivery: detail.totalDelivery,
    rowType: 'data',
  };

  // 日付を設定（引数 or AllocationDetailWithDateから）
  if (deliveryDate) {
    row.deliveryDate = deliveryDate;
  } else if ('deliveryDate' in detail) {
    row.deliveryDate = detail.deliveryDate;
  }

  // 店舗別配分数量を動的プロパティとして追加
  detail.storeAllocations.forEach((qty, storeIdx) => {
    if (storeIdx < STORE_DATA.length) {
      row[`store_${STORE_DATA[storeIdx].code}`] = qty;
    }
  });

  return row;
};

/**
 * 小計行を作成（純粋関数）
 *
 * @param id - 行ID
 * @param label - 小計のラベル
 * @param aggregation - 集計データ
 * @param groupKey - グループキー（オプション）
 * @param deliveryDate - 納品日（オプション）
 * @returns 小計行データ
 */
export const createSubtotalRow = (
  id: string,
  label: string,
  aggregation: StoreAggregation,
  groupKey?: string,
  deliveryDate?: string
): DetailGridRow => {
  const row: DetailGridRow = {
    id,
    productName: label,
    origin: '',
    specification: '',
    unit: '',
    quantityPerPackage: null,
    packageUnit: '',
    totalDelivery: aggregation.total,
    deliveryDate: deliveryDate || '小計',
    rowType: 'subtotal',
    groupKey,
  };

  // 店舗別小計を追加
  aggregation.byStore.forEach((total, storeIdx) => {
    if (storeIdx < STORE_DATA.length) {
      row[`store_${STORE_DATA[storeIdx].code}`] = total;
    }
  });

  return row;
};

/**
 * 総合計行を作成（純粋関数）
 *
 * @param aggregation - 集計データ
 * @returns 総合計行データ
 */
export const createGrandTotalRow = (aggregation: StoreAggregation): DetailGridRow => {
  const row: DetailGridRow = {
    id: 'grandtotal',
    productName: '総合計',
    origin: '',
    specification: '',
    unit: '',
    quantityPerPackage: null,
    packageUnit: '',
    totalDelivery: aggregation.total,
    deliveryDate: '総合計',
    rowType: 'grandtotal',
  };

  aggregation.byStore.forEach((total, storeIdx) => {
    if (storeIdx < STORE_DATA.length) {
      row[`store_${STORE_DATA[storeIdx].code}`] = total;
    }
  });

  return row;
};

/**
 * 単一バッチの行データを生成（純粋関数）
 *
 * @param details - 配分明細の配列
 * @returns DataGrid行データの配列
 */
export const generateSingleBatchRows = (details: AllocationDetail[]): DetailGridRow[] => {
  return details.map((detail, idx) => createDataRow(detail, detail.id || `row-${idx}`));
};
