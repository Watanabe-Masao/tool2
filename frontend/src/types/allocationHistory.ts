/**
 * 配分履歴の型定義
 *
 * 過去の配分データを保存し、学習データとして活用するための型
 */

/**
 * 配分バッチ（1回の配分確定操作）
 */
export interface AllocationBatch {
  /** ドキュメントID */
  id?: string;
  /** ユーザーID */
  userId: string;
  /** 店着日（YYYY-MM-DD） */
  deliveryDate: string;
  /** センター送信日（YYYY-MM-DD）（オプショナル） */
  centerDeliveryDate?: string;
  /** 帳合先リスト */
  suppliers: string[];
  /** 配分した商品数 */
  productCount: number;
  /** 総配分数量（全商品の合計） */
  totalQuantity: number;
  /** バイヤー名 */
  buyerName: string;
  /** ブック名/ファイル名 */
  bookName: string;
  /** シート名（デフォルト: 配分書） */
  sheetName: string;
  /** 作成日時 */
  createdAt?: Date;
  /** 更新日時 */
  updatedAt?: Date;
}

/**
 * 配分明細（商品ごとの配分詳細）
 */
export interface AllocationDetail {
  /** ドキュメントID */
  id?: string;
  /** バッチID（親への参照） */
  batchId: string;
  /** ユーザーID */
  userId: string;
  /** 商品名 */
  productName: string;
  /** 産地 */
  origin: string;
  /** 規格 */
  specification: string;
  /** 帳合先 */
  supplier: string;
  /** カテゴリーコード */
  categoryCode?: string;
  /** 入数 */
  quantityPerPackage: number | null;
  /** 単位 */
  unit: string;
  /** センター着原価 */
  centerCost: number;
  /** センターフィー率（%） */
  centerFeeRate: number;
  /** 店原 */
  storeCost: number;
  /** 本体価格（税抜） */
  priceExcludingTax: number;
  /** 総納品数 */
  totalDelivery: number;
  /** 店舗別配分（36店舗） */
  storeAllocations: number[];
  /** 配分方式 */
  allocationMethod: 'manual' | 'even' | 'salesRatio' | 'history' | 'hybrid';
  /** 手動調整があったか */
  hasManualAdjustment: boolean;
  /** 作成日時 */
  createdAt?: Date;
}

/**
 * 配分履歴の保存用入力型
 */
export interface SaveAllocationHistoryInput {
  /** 店着日 */
  deliveryDate: Date;
  /** センター送信日（オプショナル） */
  centerDeliveryDate?: Date;
  /** 帳合先リスト */
  suppliers: string[];
  /** バイヤー名 */
  buyerName: string;
  /** ブック名/ファイル名 */
  bookName: string;
  /** シート名（デフォルト: 配分書） */
  sheetName?: string;
  /** 商品データ */
  products: Array<{
    name: string;
    origin: string;
    specification: string;
    supplier: string;
    categoryCode?: string;
    quantityPerPackage: number | null;
    unit: string;
    centerCost: number;
    centerFeeRate: number;
    storeCost: number;
    priceExcludingTax: number;
    totalDelivery: number;
    storeAllocations: number[];
    allocationMethod?: 'manual' | 'even' | 'salesRatio' | 'history' | 'hybrid';
    hasManualAdjustment?: boolean;
  }>;
}

/**
 * 配分履歴の閲覧用データ
 */
export interface AllocationHistoryView {
  /** バッチ情報 */
  batch: AllocationBatch;
  /** 配分明細 */
  details: AllocationDetail[];
}

/**
 * カレンダー用の日付別配分サマリー
 */
export interface AllocationDaySummary {
  /** 日付（YYYY-MM-DD） */
  date: string;
  /** 配分バッチ数 */
  batchCount: number;
  /** 総商品数 */
  totalProducts: number;
  /** 総配分数量 */
  totalQuantity: number;
}
