/**
 * Repository 関連型定義
 *
 * @description
 * Firestore Repository で使用するデータ型、
 * クエリ条件、フィルター条件など、Repository 層に関連する全ての型を定義
 */

/**
 * オートコンプリートフィールド
 */
export type AutocompleteField = 'productName' | 'origin' | 'specification' | 'supplier';

/**
 * オートコンプリート履歴
 */
export interface AutocompleteHistory {
  id: string;
  userId: string;
  field: AutocompleteField;
  value: string;
  count: number;
  lastUsed: Date;
}

/**
 * メールアドレス
 */
export interface EmailAddress {
  id: string;
  userId: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  order: number;
}

/**
 * 帳合先プリセット
 */
export interface SupplierPreset {
  id: string;
  userId: string;
  supplier: string;
  displayName?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 価格履歴
 */
export interface PricingHistory {
  id: string;
  userId: string;
  productName: string;
  supplier: string;
  storeCost: number;
  priceExcludingTax: number;
  centerFeeRate: number;
  centerCost: number;
  recordedAt: Date;
}

/**
 * 商品履歴
 */
export interface ProductHistory {
  id: string;
  userId: string;
  supplier: string;
  name: string;
  origin: string;
  specification: string;
  quantityPerPackage: number | null;
  unit: string;
  categoryCode?: string;
  usageCount: number;
  pinned: boolean;
  pinOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 商品履歴削除条件
 */
export interface DeleteProductHistoryConditions {
  supplier?: string;
  name?: string;
  exceptPinned?: boolean;
}
