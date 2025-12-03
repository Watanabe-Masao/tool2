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
  const centerFeeRate = product.centerFeeRate ?? 0; // デフォルトは0%（帳合先プリセットから設定される）
  const storeCost = product.storeCost || 0;
  const sellingPrice = product.priceExcludingTax || 0;
  const totalDelivery = product.totalDelivery || 0;

  // デバッグ用ログ: centerFeeRateの値を確認
  if (centerCost > 0) {
    console.log('[calculateProductMetrics] Debug:', {
      name: product.name,
      centerCost,
      centerFeeRateFromProduct: product.centerFeeRate,
      centerFeeRateUsed: centerFeeRate,
    });
  }

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
 * 各商品の計算結果（calculateProductMetrics）を集計し、
 * 全体の出荷原価率と値入率を計算します。
 *
 * 重要: 率の計算は各商品の率を平均するのではなく、
 * 全商品の合計金額から計算します。これにより、
 * 金額の大きい商品が適切に重み付けされます。
 *
 * @example
 * 商品A: 店着10,000円 / センターフィー込9,000円 = 111.1%
 * 商品B: 店着1,000円 / センターフィー込900円 = 111.1%
 *
 * ❌ 平均: (111.1% + 111.1%) / 2 = 111.1%
 * ✅ 正しい: (10,000 + 1,000) / (9,000 + 900) × 100 = 111.1%
 *
 * 商品Aの金額比重が10倍なので、正しく計算される。
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

  console.log('[calculateProductsSummary] 集計開始 - 商品数:', products.length);

  products.forEach((product, index) => {
    const metrics = calculateProductMetrics(product);

    console.log(`[calculateProductsSummary] 商品${index + 1}:`, {
      name: product.name,
      totalCenterCost: metrics.totalCenterCost,
      totalCenterCostWithFee: metrics.totalCenterCostWithFee,
      centerCostWithFee: metrics.centerCostWithFee,
      centerFeeRate: metrics.centerFeeRate,
      quantity: metrics.quantity,
    });

    totalCenterCost += metrics.totalCenterCost;
    totalCenterCostWithFee += metrics.totalCenterCostWithFee;
    totalStoreCost += metrics.totalStoreCost;
    totalSellingPrice += metrics.totalSellingPrice;
    totalProfit += metrics.profitAmount;
    grossProfit += metrics.grossProfitAmount;
  });

  console.log('[calculateProductsSummary] 集計結果:', {
    totalCenterCost,
    totalCenterCostWithFee,
    差分: totalCenterCostWithFee - totalCenterCost,
  });

  // 出荷原価率 = 全商品の店着総原価 / 全商品のセンターフィー込総原価 × 100
  // 注: 各商品の率を平均するのではなく、合計金額から計算する
  const shippingCostRate = totalCenterCostWithFee > 0
    ? (totalStoreCost / totalCenterCostWithFee * 100).toFixed(1)
    : '0.0';

  // 値入率（粗利率）= 全商品の粗利額 / 全商品の総売価 × 100
  // 注: 各商品の率を平均するのではなく、合計金額から計算する
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
