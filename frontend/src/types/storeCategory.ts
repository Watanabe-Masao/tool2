/**
 * 店舗カテゴリーの型定義
 */

/**
 * 店舗カテゴリー
 */
export interface StoreCategory {
  /** カテゴリーID */
  id: string;
  /** カテゴリー名（大型店、中型店など） */
  name: string;
  /** このカテゴリーに属する店番のリスト */
  storeIds: string[];
  /** 表示順 */
  order: number;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
}

/**
 * 店舗カテゴリー作成用の型
 */
export type CreateStoreCategoryInput = Omit<StoreCategory, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 店舗カテゴリー更新用の型
 */
export type UpdateStoreCategoryInput = Partial<Omit<StoreCategory, 'id' | 'createdAt' | 'updatedAt'>>;
