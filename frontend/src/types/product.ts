/**
 * 商品関連型定義
 *
 * @description
 * 商品データ、商品フォーム、商品履歴など、商品ドメインに関連する全ての型を定義
 */

/**
 * 商品データ
 */
export interface ProductData {
  /** カテゴリーコード */
  categoryCode?: string;
  /** 帳合先 */
  supplier: string;
  /** 品名 */
  name: string;
  /** 産地 */
  origin: string;
  /** 規格 */
  specification: string;
  /** 1パックの数量 */
  quantityPerPackage: number | null;
  /** 単位 */
  unit: string;
  /** 店原 */
  storeCost: number;
  /** 本体価格（税抜） */
  priceExcludingTax: number;
  /** 総納品数 */
  totalDelivery: number;
  /** 36店舗への配分数 (length = 36) */
  storeAllocations: number[];
}

/**
 * React Hook Form用の商品フォームデータ
 *
 * @deprecated この型は orderSchema.ts から自動生成される型と重複しています
 * 将来的には Zod schema から生成される型を使用してください
 */
export interface ProductFormData {
  /** カテゴリーコード */
  categoryCode?: string;
  /** 帳合先 */
  supplier: string;
  /** 品名 */
  name: string;
  /** 産地 */
  origin: string;
  /** 規格 */
  specification: string;
  /** 1パックの数量 */
  quantityPerPackage: number | null;
  /** 単位 */
  unit: string;
  /** 店原 */
  storeCost: number;
  /** 本体価格（税抜） */
  priceExcludingTax: number;
  /** 総納品数 */
  totalDelivery: number;
  /** 36店舗への配分数 */
  storeAllocations: number[];
}
