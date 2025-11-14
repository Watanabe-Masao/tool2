/**
 * アプリケーション定数
 */

// ============================================================
// API関連
// ============================================================

/**
 * APIのベースURL
 * 開発環境ではViteプロキシを使用するため'/api'
 * 本番環境では環境変数から取得
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const API_ENDPOINTS = {
  /** ヘルスチェック */
  HEALTH: '/health',
  /** バージョン情報 */
  VERSION: '/version',
  /** Firebase設定取得 */
  FIREBASE_CONFIG: '/firebase-config',
  /** テンプレート生成 */
  GENERATE_TEMPLATE: '/generate',
  /** ファイルダウンロード（ベースパス） */
  DOWNLOAD: '/download',
} as const;

// ============================================================
// Firebase関連
// ============================================================

export const FIRESTORE_COLLECTIONS = {
  /** 注文データ */
  ORDERS: 'haibun_orders',
  /** オートコンプリート履歴 */
  AUTOCOMPLETE_HISTORY: 'autocomplete_history',
  /** ユーザープロフィール */
  USER_PROFILES: 'user_profiles',
} as const;

// ============================================================
// IndexedDB関連
// ============================================================

export const INDEXEDDB_NAME = 'HaibunDB';
export const INDEXEDDB_VERSION = 1;

export const INDEXEDDB_STORES = {
  /** 注文データ */
  ORDERS: 'orders',
  /** オートコンプリート履歴 */
  AUTOCOMPLETE_HISTORY: 'autocomplete_history',
} as const;

// ============================================================
// フォーム関連
// ============================================================

/**
 * 36店舗の名前リスト
 */
export const STORE_NAMES: readonly string[] = [
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
] as const;

/** 店舗数 */
export const STORE_COUNT = 36;

/** デフォルトの商品フォームデータ */
export const DEFAULT_PRODUCT_FORM_DATA = {
  name: '',
  origin: '',
  specification: '',
  quantityPerPackage: 1,
  storeCost: 0,
  priceExcludingTax: 0,
  storeAllocations: new Array(STORE_COUNT).fill(0),
} as const;

// ============================================================
// バリデーション関連
// ============================================================

/** 最大文字数制限 */
export const MAX_LENGTH = {
  /** 品名 */
  PRODUCT_NAME: 100,
  /** 産地 */
  ORIGIN: 50,
  /** 規格 */
  SPECIFICATION: 50,
  /** 帳合先 */
  SUPPLIER: 100,
  /** バイヤー名 */
  BUYER_NAME: 50,
  /** カスタムファイル名 */
  CUSTOM_FILENAME: 100,
} as const;

/** 数値の範囲 */
export const NUMBER_RANGE = {
  /** 1パックの数量 */
  QUANTITY_PER_PACKAGE: { min: 1, max: 9999 },
  /** 店原 */
  STORE_COST: { min: 0, max: 999999 },
  /** 本体価格 */
  PRICE_EXCLUDING_TAX: { min: 0, max: 999999 },
  /** 総納品数 */
  TOTAL_DELIVERY: { min: 1, max: 999999 },
  /** 店舗配分数 */
  STORE_ALLOCATION: { min: 0, max: 9999 },
} as const;

// ============================================================
// UI関連
// ============================================================

/** 通知表示時間（ミリ秒） */
export const NOTIFICATION_DURATION = {
  /** 成功 */
  SUCCESS: 4000,
  /** エラー */
  ERROR: 6000,
  /** 警告 */
  WARNING: 5000,
  /** 情報 */
  INFO: 4000,
} as const;

/** ローディング遅延時間（ミリ秒） */
export const LOADING_DELAY = 200;

/** オートコンプリートのデバウンス時間（ミリ秒） */
export const AUTOCOMPLETE_DEBOUNCE_MS = 300;

/** TanStack Queryのキャッシュ時間（ミリ秒） */
export const QUERY_CACHE_TIME = {
  /** 短期（5分） */
  SHORT: 5 * 60 * 1000,
  /** 中期（30分） */
  MEDIUM: 30 * 60 * 1000,
  /** 長期（1時間） */
  LONG: 60 * 60 * 1000,
} as const;

// ============================================================
// 日付関連
// ============================================================

/** 日付フォーマット */
export const DATE_FORMAT = {
  /** YYYY-MM-DD */
  ISO: 'yyyy-MM-dd',
  /** YYYY年MM月DD日 */
  JP_LONG: 'yyyy年MM月dd日',
  /** MM/DD */
  SHORT: 'MM/dd',
  /** YYYY/MM/DD (曜日) */
  JP_WITH_DAY: 'yyyy/MM/dd (E)',
} as const;

/** 曜日の日本語表記 */
export const DAY_OF_WEEK_JP = ['日', '月', '火', '水', '木', '金', '土'] as const;

// ============================================================
// ファイル関連
// ============================================================

/** ファイルタイプ */
export const FILE_TYPE = {
  /** Excel */
  EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  /** PDF */
  PDF: 'application/pdf',
} as const;

/** ファイル拡張子 */
export const FILE_EXTENSION = {
  /** Excel */
  EXCEL: '.xlsx',
  /** PDF */
  PDF: '.pdf',
} as const;

// ============================================================
// アプリケーション情報
// ============================================================

/** アプリケーション名 */
export const APP_NAME = '配分表作成ツール';

/** アプリケーションバージョン */
export const APP_VERSION = '3.0.0';

/** アプリケーション説明 */
export const APP_DESCRIPTION = '36店舗への商品配分表を自動生成するWebアプリケーション';
