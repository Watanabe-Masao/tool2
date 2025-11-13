// ============================================================
// Product Types
// ============================================================

/**
 * 商品データ
 */
export interface ProductData {
  /** 品名 */
  name: string;
  /** 産地 */
  origin: string;
  /** 規格 */
  specification: string;
  /** 1パックの数量 */
  quantityPerPackage: number;
  /** 店原 */
  storeCost: number;
  /** 本体価格（税抜） */
  priceExcludingTax: number;
  /** 36店舗への配分数 (length = 36) */
  storeAllocations: number[];
}

// ============================================================
// Order Types
// ============================================================

/**
 * 注文データ
 */
export interface OrderData {
  /** Firestore ID */
  id?: string;
  /** 店着日 */
  deliveryDate: Date;
  /** 帳合先 */
  supplier: string;
  /** 総納品数 */
  totalDelivery: number;
  /** 商品リスト */
  products: ProductData[];
  /** バイヤー名 */
  buyerName: string;
  /** 作成日時 */
  timestamp: Date;
  /** ユーザーID */
  userId: string;
}

// ============================================================
// Store Types
// ============================================================

/**
 * 店舗データ
 */
export interface StoreData {
  /** 店舗ID (0-35) */
  id: number;
  /** 店舗名 */
  name: string;
  /** 配分数 */
  allocation: number;
}

/**
 * 36店舗の名前リスト（定数）
 */
export const STORE_NAMES: string[] = [
  '阪急1',
  '阪急2',
  '阪急3',
  '阪急4',
  '阪急5',
  '阪急6',
  '阪急百貨店本店',
  '阪急百貨店千里店',
  '阪急百貨店西宮店',
  '阪急百貨店川西店',
  '阪急百貨店宝塚店',
  '阪急百貨店博多店',
  'イズミヤ1',
  'イズミヤ2',
  'イズミヤ3',
  'イズミヤ4',
  'イズミヤ5',
  'イズミヤ6',
  'ライフ1',
  'ライフ2',
  'ライフ3',
  'ライフ4',
  'ライフ5',
  'ライフ6',
  '万代1',
  '万代2',
  '万代3',
  '万代4',
  '万代5',
  '万代6',
  'コープ1',
  'コープ2',
  'コープ3',
  'コープ4',
  'コープ5',
  'コープ6',
];

// ============================================================
// API Types
// ============================================================

/**
 * APIリクエスト: テンプレート生成
 */
export interface TemplateRequest {
  /** 店着日 (YYYY-MM-DD) */
  delivery_date: string;
  /** 帳合先 */
  supplier: string;
  /** バイヤー名 */
  buyer_name: string;
  /** 商品リスト */
  products: Array<{
    /** 品名 */
    name: string;
    /** 産地 */
    origin: string;
    /** 規格 */
    specification: string;
    /** 1パックの数量 */
    quantity_per_package: number;
    /** 店原 */
    store_cost: number;
    /** 本体価格（税抜） */
    price_excluding_tax: number;
    /** 36店舗への配分数 */
    store_allocations: number[];
  }>;
  /** 総納品数 */
  total_delivery: number;
  /** カスタムファイル名（オプション） */
  custom_filename?: string;
}

/**
 * APIレスポンス: テンプレート生成成功
 */
export interface TemplateResponse {
  /** 生成されたExcelファイル名 */
  filename: string;
  /** 生成されたPDFファイル名 */
  pdf_filename: string;
  /** メッセージ */
  message: string;
}

/**
 * APIレスポンス: エラー
 */
export interface ErrorResponse {
  /** エラー詳細 */
  detail: string;
}

/**
 * APIレスポンス: バージョン情報
 */
export interface VersionResponse {
  /** バージョン番号 */
  version: string;
  /** 環境 */
  environment: string;
}

/**
 * APIレスポンス: Firebase設定
 */
export interface FirebaseConfigResponse {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// ============================================================
// Firebase Types
// ============================================================

/**
 * Firestoreに保存される注文データ（スネークケース）
 */
export interface FirestoreOrderData {
  delivery_date: string;
  supplier: string;
  total_delivery: number;
  products: Array<{
    name: string;
    origin: string;
    specification: string;
    quantity_per_package: number;
    store_cost: number;
    price_excluding_tax: number;
    store_allocations: number[];
  }>;
  buyer_name: string;
  timestamp: Date;
  user_id: string;
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

// ============================================================
// Form Types
// ============================================================

/**
 * React Hook Form用のフォームデータ
 */
export interface OrderFormData {
  /** 店着日 */
  deliveryDate: Date;
  /** 帳合先 */
  supplier: string;
  /** 総納品数 */
  totalDelivery: number;
  /** 商品リスト */
  products: ProductFormData[];
}

/**
 * React Hook Form用の商品フォームデータ
 */
export interface ProductFormData {
  /** 品名 */
  name: string;
  /** 産地 */
  origin: string;
  /** 規格 */
  specification: string;
  /** 1パックの数量 */
  quantityPerPackage: number;
  /** 店原 */
  storeCost: number;
  /** 本体価格（税抜） */
  priceExcludingTax: number;
  /** 36店舗への配分数 */
  storeAllocations: number[];
}

// ============================================================
// Utility Types
// ============================================================

/**
 * カレンダーイベント
 */
export interface CalendarEvent {
  /** イベントID */
  id: string;
  /** 日付 */
  date: Date;
  /** 帳合先 */
  supplier: string;
  /** 商品数 */
  productCount: number;
  /** 注文データ */
  orderData: OrderData;
}

/**
 * デバイス検出結果
 */
export interface DeviceInfo {
  /** iOSかどうか */
  isIOS: boolean;
  /** Safariかどうか */
  isSafari: boolean;
  /** モバイルかどうか */
  isMobile: boolean;
  /** タブレットかどうか */
  isTablet: boolean;
}

/**
 * 通知の種類
 */
export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

/**
 * 通知データ
 */
export interface NotificationData {
  /** メッセージ */
  message: string;
  /** 種類 */
  severity: NotificationSeverity;
  /** 表示時間（ミリ秒） */
  duration?: number;
}
