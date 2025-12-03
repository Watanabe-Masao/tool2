import { calculateEffectiveQuantityWithMigration } from './unitConversion';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * 商品の各種計算結果
 */
export interface ProductMetrics {
  /** センター着原価 */
  centerCost: number;
  /** センターフィー率 */
  centerFeeRate: number;
  /** 店着原価 */
  storeCost: number;
  /** 本体価格（税抜） */
  sellingPrice: number;
  /** 総納品数 */
  totalDelivery: number;
  /** 実効数量（単位変換後） */
  effectiveQuantity: number;
  /** センターフィー込原価（1単位あたり） */
  centerCostWithFee: number;
  /** 総数量（総納品数 × 実効数量） */
  quantity: number;
  /** 差益額（(店着原価 - センターフィー込原価) × 総数量） */
  profitAmount: number;
  /** 粗利額（(売価 - 店着原価) × 総数量） */
  grossProfitAmount: number;
  /** 総センター着原価（センター着原価 × 総数量） */
  totalCenterCost: number;
  /** 総センターフィー込原価（センターフィー込原価 × 総数量） */
  totalCenterCostWithFee: number;
  /** 総店着原価（店着原価 × 総数量） */
  totalStoreCost: number;
  /** 総売価（売価 × 総数量） */
  totalSellingPrice: number;
}

/**
 * 商品の各種計算を実行
 *
 * ProductFormCardPricingとProductPricingFormで共通の計算ロジック。
 * 計算結果を統一することで、表示のズレを防止します。
 *
 * @param product - 商品データ
 * @returns 計算結果
 */
export function calculateProductMetrics(
  product: OrderFormData['products'][number]
): ProductMetrics {
  // 基本値の取得（デフォルト値付き）
  const centerCost = product.centerCost || 0;
  const centerFeeRate = product.centerFeeRate ?? 13;
  const storeCost = product.storeCost || 0;
  const sellingPrice = product.priceExcludingTax || 0;
  const totalDelivery = product.totalDelivery || 0;

  // 単位変換を適用して実効数量を計算
  const conversionResult = calculateEffectiveQuantityWithMigration({
    quantityPerPackage: product.quantityPerPackage,
    packageUnit: product.packageUnit || '',
    unit: product.unit || '',
  });
  const effectiveQuantity = conversionResult.effectiveQuantity;

  // センターフィー込原価（1単位あたり）
  // centerCostが0の場合も考慮
  const centerCostWithFee = centerCost
    ? Math.round(centerCost * (1 + centerFeeRate / 100))
    : 0;

  // 総数量（箱数 × 実効数量）
  const quantity = totalDelivery * effectiveQuantity;

  // 差益額（店着原価 - センターフィー込原価） × 総数量
  // 各商品の差益を丸めてから集計
  const profitAmount = Math.round((storeCost - centerCostWithFee) * quantity);

  // 粗利額（売価 - 店着原価） × 総数量
  // 各商品の粗利を丸めてから集計
  const grossProfitAmount = Math.round((sellingPrice - storeCost) * quantity);

  // 各総額（集計用）
  const totalCenterCost = centerCost * quantity;
  const totalCenterCostWithFee = centerCostWithFee * quantity;
  const totalStoreCost = storeCost * quantity;
  const totalSellingPrice = sellingPrice * quantity;

  return {
    centerCost,
    centerFeeRate,
    storeCost,
    sellingPrice,
    totalDelivery,
    effectiveQuantity,
    centerCostWithFee,
    quantity,
    profitAmount,
    grossProfitAmount,
    totalCenterCost,
    totalCenterCostWithFee,
    totalStoreCost,
    totalSellingPrice,
  };
}

/**
 * 全商品の集計を計算
 *
 * @param products - 商品データ配列
 * @returns 集計結果
 */
export function calculateProductsSummary(products: OrderFormData['products']) {
  let totalCenterCost = 0;
  let totalCenterCostWithFee = 0;
  let totalStoreCost = 0;
  let totalSellingPrice = 0;
  let totalProfit = 0;
  let grossProfit = 0;

  products.forEach((product) => {
    const metrics = calculateProductMetrics(product);

    totalCenterCost += metrics.totalCenterCost;
    totalCenterCostWithFee += metrics.totalCenterCostWithFee;
    totalStoreCost += metrics.totalStoreCost;
    totalSellingPrice += metrics.totalSellingPrice;
    totalProfit += metrics.profitAmount;
    grossProfit += metrics.grossProfitAmount;
  });

  // 出荷原価率 = 店着総原価 / センターフィー込総原価 × 100
  const shippingCostRate = totalCenterCostWithFee > 0
    ? (totalStoreCost / totalCenterCostWithFee * 100).toFixed(1)
    : '0.0';

  // 値入率（粗利率）= 粗利額 / 総売価 × 100
  const grossProfitMargin = totalSellingPrice > 0
    ? (grossProfit / totalSellingPrice * 100).toFixed(1)
    : '0.0';

  return {
    totalCenterCost,
    totalCenterCostWithFee,
    totalStoreCost,
    totalSellingPrice,
    totalProfit,
    shippingCostRate,
    grossProfit,
    grossProfitMargin,
  };
}
