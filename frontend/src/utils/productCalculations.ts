import { calculateEffectiveQuantityV2 } from './unitConversion';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * 商品の各種計算結果
 */
export interface ProductMetrics {
  /** センター着原価 */
  centerCost: number | null;
  /** センターフィー率 */
  centerFeeRate: number | null;
  /** 店着原価 */
  storeCost: number | null;
  /** 本体価格（税抜） */
  sellingPrice: number | null;
  /** 総納品数 */
  totalDelivery: number | null;
  /** 実効数量（単位変換後） */
  effectiveQuantity: number;
  /** センターフィー込原価（1単位あたり） - 計算可能な場合のみ数値 */
  centerCostWithFee: number | null;
  /** 総数量（総納品数 × 実効数量） */
  quantity: number;
  /** 差益額（(店着原価 - センターフィー込原価) × 総数量） - 計算可能な場合のみ数値 */
  profitAmount: number | null;
  /** 粗利額（(売価 - 店着原価) × 総数量） - 計算可能な場合のみ数値 */
  grossProfitAmount: number | null;
  /** 総センター着原価（センター着原価 × 総数量） - 計算可能な場合のみ数値 */
  totalCenterCost: number | null;
  /** 総センターフィー込原価（センターフィー込原価 × 総数量） - 計算可能な場合のみ数値 */
  totalCenterCostWithFee: number | null;
  /** 総店着原価（店着原価 × 総数量） - 計算可能な場合のみ数値 */
  totalStoreCost: number | null;
  /** 総売価（売価 × 総数量） - 計算可能な場合のみ数値 */
  totalSellingPrice: number | null;
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
  // 基本値を取得（nullの可能性あり）
  const centerCost = product.centerCost;
  const centerFeeRate = product.centerFeeRate;
  const storeCost = product.storeCost;
  const sellingPrice = product.priceExcludingTax;
  const totalDelivery = product.totalDelivery;

  // 単位変換を適用して実効数量を計算
  // V2形式のデータを直接V2計算関数に渡す（無駄な変換を避ける）
  const conversionResult = calculateEffectiveQuantityV2({
    specification: product.specification || '',
    specificationUnit: product.specificationUnit || '',
    quantityPerPackage: product.quantityPerPackage,
    packageUnit: product.packageUnit || '',
  });
  const effectiveQuantity = conversionResult.effectiveQuantity;

  // 総数量（箱数 × 実効数量） - totalDeliveryがnullの場合は0
  const quantity = (totalDelivery ?? 0) * effectiveQuantity;

  // センターフィー込原価の計算
  // centerCostまたはcenterFeeRateがnullの場合は計算不可
  let centerCostWithFee: number | null = null;
  if (centerCost !== null && centerFeeRate !== null) {
    centerCostWithFee = Math.round(centerCost * (1 + centerFeeRate / 100));
  }

  // 差益額の計算
  // storeCost、centerCostWithFee、totalDeliveryのいずれかがnullの場合は計算不可
  let profitAmount: number | null = null;
  if (storeCost !== null && centerCostWithFee !== null && totalDelivery !== null) {
    profitAmount = Math.round((storeCost - centerCostWithFee) * quantity);
  }

  // 粗利額の計算
  // sellingPrice、storeCost、totalDeliveryのいずれかがnullの場合は計算不可
  let grossProfitAmount: number | null = null;
  if (sellingPrice !== null && storeCost !== null && totalDelivery !== null) {
    grossProfitAmount = Math.round((sellingPrice - storeCost) * quantity);
  }

  // 各総額の計算（いずれかがnullの場合はnull）
  const totalCenterCost = centerCost !== null && totalDelivery !== null
    ? centerCost * quantity
    : null;
  const totalCenterCostWithFee = centerCostWithFee !== null && totalDelivery !== null
    ? centerCostWithFee * quantity
    : null;
  const totalStoreCost = storeCost !== null && totalDelivery !== null
    ? storeCost * quantity
    : null;
  const totalSellingPrice = sellingPrice !== null && totalDelivery !== null
    ? sellingPrice * quantity
    : null;

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

  products.forEach((product) => {
    const metrics = calculateProductMetrics(product);

    // nullの場合は集計に含めない（未入力の商品はスキップ）
    if (metrics.totalCenterCost !== null) {
      totalCenterCost += metrics.totalCenterCost;
    }
    if (metrics.totalCenterCostWithFee !== null) {
      totalCenterCostWithFee += metrics.totalCenterCostWithFee;
    }
    if (metrics.totalStoreCost !== null) {
      totalStoreCost += metrics.totalStoreCost;
    }
    if (metrics.totalSellingPrice !== null) {
      totalSellingPrice += metrics.totalSellingPrice;
    }
    if (metrics.profitAmount !== null) {
      totalProfit += metrics.profitAmount;
    }
    if (metrics.grossProfitAmount !== null) {
      grossProfit += metrics.grossProfitAmount;
    }
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
