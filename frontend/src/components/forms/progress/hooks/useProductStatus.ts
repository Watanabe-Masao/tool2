import { useMemo } from 'react';
import type { OrderFormData } from '@/schemas/orderSchema';
import type { ProductStatus } from '../types';

/**
 * 商品ステータス計算フック
 *
 * 商品の入力完了状態を計算します。
 *
 * @param product - 商品データ
 * @returns 商品ステータス
 */
export const useProductStatus = (
  product: OrderFormData['products'][0]
): ProductStatus => {
  return useMemo(() => {
    const hasBasicInfo = !!(product.name && product.origin);
    const hasPricing = !!(
      product.storeCost !== null &&
      product.priceExcludingTax !== null &&
      product.totalDelivery !== null
    );
    const totalAllocated = product.storeAllocations.reduce(
      (sum, val) => sum + val,
      0
    );
    const totalDeliveryValue = product.totalDelivery ?? 0;
    const hasAllocation =
      totalAllocated === totalDeliveryValue && totalAllocated > 0;
    const hasOverAllocation = totalAllocated > totalDeliveryValue;

    return {
      hasBasicInfo,
      hasPricing,
      hasAllocation,
      hasOverAllocation,
      totalAllocated,
      remaining: totalDeliveryValue - totalAllocated,
    };
  }, [
    product.name,
    product.origin,
    product.storeCost,
    product.priceExcludingTax,
    product.totalDelivery,
    product.storeAllocations,
  ]);
};

/**
 * 商品ステータスを計算（関数版）
 *
 * フック外で使用する場合用
 */
export const getProductStatus = (
  product: OrderFormData['products'][0]
): ProductStatus => {
  const hasBasicInfo = !!(product.name && product.origin);
  const hasPricing = !!(
    product.storeCost !== null &&
    product.priceExcludingTax !== null &&
    product.totalDelivery !== null
  );
  const totalAllocated = product.storeAllocations.reduce(
    (sum, val) => sum + val,
    0
  );
  const totalDeliveryValue = product.totalDelivery ?? 0;
  const hasAllocation =
    totalAllocated === totalDeliveryValue && totalAllocated > 0;
  const hasOverAllocation = totalAllocated > totalDeliveryValue;

  return {
    hasBasicInfo,
    hasPricing,
    hasAllocation,
    hasOverAllocation,
    totalAllocated,
    remaining: totalDeliveryValue - totalAllocated,
  };
};
