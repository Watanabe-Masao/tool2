// ============================================================
// Product Types
// ============================================================

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
  /** 帳合先リスト */
  suppliers: string[];
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
    standard: string;
    /** 入数 */
    quantity: number | null;
    /** 単位 */
    unit: string;
    /** 店着原価 */
    store_cost: number;
    /** 税抜売価 */
    price: number;
    /** 総納品数 */
    total_delivery: number;
    /** 納品先（帳合先） */
    delivery_dest: string;
    /** 店舗配分数（店舗コード→数量のマップ） */
    store_quantities: Record<string, number>;
  }>;
  /** カスタムファイル名（オプション） */
  custom_filename?: string;
}

/**
 * APIレスポンス: テンプレート生成成功
 */
export interface TemplateResponse {
  /** 成功フラグ */
  success: boolean;
  /** 生成されたExcelファイル名 */
  filename: string;
  /** ダウンロードURL */
  download_url: string;
  /** 生成されたPDFファイル名（オプション） */
  pdf_filename?: string;
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
  userId: string; // user_id → userId に変更
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
 * Note: この型は orderSchema.ts から自動生成される型と重複しています
 * 将来的には削除を検討してください
 */
export interface OrderFormData {
  /** 店着日 */
  deliveryDate: Date;
  /** 帳合先リスト */
  suppliers: string[];
  /** 商品リスト */
  products: ProductFormData[];
}

/**
 * React Hook Form用の商品フォームデータ
 * Note: この型は orderSchema.ts から自動生成される型と重複しています
 * 将来的には削除を検討してください
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
  /** 帳合先リスト */
  suppliers: string[];
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
