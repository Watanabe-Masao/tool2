import type { AllocationDetail } from '@/types/allocationHistory';

/**
 * AllocationDetailWithDate type
 *
 * 日付範囲選択時に使用する、deliveryDateを含む配分明細
 */
export interface AllocationDetailWithDate extends AllocationDetail {
  deliveryDate: string;
}

/**
 * DetailGridRow type
 *
 * DataGrid用の行データ型（詳細モーダル用）
 */
export interface DetailGridRow {
  id: string;
  productName: string;
  origin: string;
  specification: string;
  unit: string; // 規格の単位
  quantityPerPackage: number | null; // 入数
  packageUnit: string; // 入数の単位
  totalDelivery: number | null; // 総納品数 - 未入力時null、0の場合0として区別
  deliveryDate?: string; // 日付範囲選択時に使用
  rowType?: 'data' | 'subtotal' | 'grandtotal'; // 行のタイプ
  groupKey?: string; // グループキー
  [key: string]: string | number | null | undefined; // 店舗別配分数量（store_xxx）
}

/**
 * AvailableFilterValues type
 *
 * フィルター用の利用可能な値
 */
export interface AvailableFilterValues {
  productNames: string[];
  origins: string[];
  specifications: string[];
  dates: string[];
}

/**
 * StoreAggregation type
 *
 * 店舗別集計データ
 */
export interface StoreAggregation {
  byStore: number[]; // 各店舗の配分数量
  total: number; // 合計数量
}
