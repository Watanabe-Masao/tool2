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
    specificationUnit: string;
    /** 店原 - 未入力時null、0円の場合0として区別 */
    store_cost: number | null;
    /** 本体価格（税抜） - 未入力時null、0円の場合0として区別 */
    price_excluding_tax: number | null;
    /** 総納品数 - 未入力時null、0の場合0として区別 */
    total_delivery: number | null;
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
