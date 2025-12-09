/**
 * 商品関連型定義
 *
 * @description
 * 商品データ、商品フォーム、商品履歴など、商品ドメインに関連する全ての型を定義
 *
 * NOTE: フォーム用の型 (ProductFormData) は @/schemas/orderSchema からインポートしてください
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
  /** 入数の単位 (kg, g, 個など) */
  packageUnit?: string;
  /** 単位 */
  specificationUnit: string;
  /** 店原 - 未入力時null、0円の場合0として区別 */
  storeCost: number | null;
  /** 本体価格（税抜） - 未入力時null、0円の場合0として区別 */
  priceExcludingTax: number | null;
  /** 総納品数 - 未入力時null、0の場合0として区別 */
  totalDelivery: number | null;
  /** 36店舗への配分数 (length = 36) */
  storeAllocations: number[];
}

/**
 * ProductFormData型のre-export
 *
 * @description
 * 後方互換性のため、ProductFormDataを@/schemas/orderSchemaから再エクスポート
 * 新規コードでは直接 @/schemas/orderSchema からインポートしてください
 */
export type { ProductFormData } from '@/schemas/orderSchema';
