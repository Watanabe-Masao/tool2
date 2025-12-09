import type { ProductFormData, OrderFormData } from '@/schemas/orderSchema';

/**
 * 価格設定の必須フィールド名とキーのマッピング
 */
const PRICING_FIELD_LABELS: Record<keyof Pick<ProductFormData, 'centerCost' | 'centerFeeRate' | 'storeCost' | 'priceExcludingTax' | 'totalDelivery'>, string> = {
  centerCost: 'センター着原価',
  centerFeeRate: 'センターフィー率',
  storeCost: '店着原価',
  priceExcludingTax: '本体価格',
  totalDelivery: '総納品数',
};

/**
 * 商品の未入力価格フィールドを取得
 *
 * ProductFormCardPricingとProductPricingFormで共通の
 * 未入力フィールドチェックロジックを統一
 *
 * @param product - 商品データ
 * @returns 未入力フィールド名の配列
 *
 * @example
 * ```typescript
 * const missingFields = getMissingPricingFields(product);
 * if (missingFields.length > 0) {
 *   console.log('未入力: ' + missingFields.join('、'));
 * }
 * ```
 */
export function getMissingPricingFields(product: ProductFormData): string[] {
  const missingFields: string[] = [];

  if (product.centerCost === null) missingFields.push(PRICING_FIELD_LABELS.centerCost);
  if (product.centerFeeRate === null) missingFields.push(PRICING_FIELD_LABELS.centerFeeRate);
  if (product.storeCost === null) missingFields.push(PRICING_FIELD_LABELS.storeCost);
  if (product.priceExcludingTax === null) missingFields.push(PRICING_FIELD_LABELS.priceExcludingTax);
  if (product.totalDelivery === null) missingFields.push(PRICING_FIELD_LABELS.totalDelivery);

  return missingFields;
}

/**
 * 価格設定が完了しているかチェック
 *
 * @param product - 商品データ
 * @returns すべての価格フィールドが入力されている場合true
 */
export function isPricingComplete(product: ProductFormData): boolean {
  return getMissingPricingFields(product).length === 0;
}

/**
 * 配分状態の計算結果
 */
export interface AllocationStatus {
  /** 配分済み合計 */
  totalAllocated: number;
  /** 残り（総納品数 - 配分済み合計） */
  remaining: number;
  /** 配分が完了しているか（remaining === 0） */
  isComplete: boolean;
  /** 配分が超過しているか（remaining < 0） */
  isExceeded: boolean;
}

/**
 * 配分状態を計算
 *
 * StoreAllocationGridなどで使用する配分計算ロジック
 *
 * @param allocations - 各店舗への配分数配列
 * @param totalDelivery - 総納品数
 * @returns 配分状態
 *
 * @example
 * ```typescript
 * const status = calculateAllocationStatus(product.storeAllocations, product.totalDelivery ?? 0);
 * if (status.isComplete) {
 *   console.log('配分完了');
 * } else if (status.isExceeded) {
 *   console.log(`${Math.abs(status.remaining)}個超過`);
 * }
 * ```
 */
export function calculateAllocationStatus(
  allocations: number[],
  totalDelivery: number
): AllocationStatus {
  const totalAllocated = allocations.reduce((sum, val) => sum + val, 0);
  const remaining = totalDelivery - totalAllocated;

  return {
    totalAllocated,
    remaining,
    isComplete: remaining === 0,
    isExceeded: remaining < 0,
  };
}

/**
 * 複数商品の未入力フィールド情報を取得
 *
 * ProductPricingFormで使用する全商品の未入力チェック
 *
 * @param products - 商品データ配列
 * @returns 未入力がある商品のインデックスとフィールド名のリスト
 *
 * @example
 * ```typescript
 * const incompleteProducts = getIncompleteProductsPricing(products);
 * incompleteProducts.forEach(({ index, fields }) => {
 *   console.log(`商品${index + 1}: ${fields.join('、')}が未入力`);
 * });
 * ```
 */
export function getIncompleteProductsPricing(
  products: OrderFormData['products']
): Array<{ index: number; fields: string[] }> {
  return products
    .map((product, index) => {
      const missingFields = getMissingPricingFields(product);
      if (missingFields.length > 0) {
        return { index, fields: missingFields };
      }
      return null;
    })
    .filter((item): item is { index: number; fields: string[] } => item !== null);
}
