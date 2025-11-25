/**
 * Firebase 関連型定義
 *
 * @description
 * Firestore データ構造、Firebase Auth、リアルタイムリスナーなど、
 * Firebase に関連する全ての型を定義
 */

/**
 * Firestoreに保存される注文データ（スネークケース）
 */
export interface FirestoreOrderData {
  delivery_date: string;
  suppliers: string[];
  products: Array<{
    supplier: string;
    name: string;
    origin: string;
    specification: string;
    quantity_per_package: number | null;
    unit: string;
    store_cost: number;
    price_excluding_tax: number;
    total_delivery: number;
    store_allocations: number[];
  }>;
  buyer_name: string;
  timestamp: Date;
  userId: string;
}

/**
 * オートコンプリート履歴データ
 */
export interface AutocompleteHistoryData {
  /** フィールド名 */
  field: 'productName' | 'origin' | 'specification' | 'supplier';
  /** 値のリスト */
  values: string[];
  /** 最終更新日時 */
  lastUpdated: Date;
  /** ユーザーID */
  userId: string;
}
