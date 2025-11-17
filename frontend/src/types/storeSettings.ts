/**
 * 店舗設定の型定義
 */

/**
 * 店舗設定
 */
export interface StoreSettings {
  /** ドキュメントID（店舗コード） */
  id: string;
  /** ユーザーID */
  userId: string;
  /** 店舗コード */
  storeCode: string;
  /** 販売構成比（%） */
  salesRatio: number;
  /** 配分画面で使用するか */
  enabled: boolean;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
}

/**
 * 店舗設定作成用の入力型
 */
export type CreateStoreSettingsInput = Omit<StoreSettings, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 店舗設定更新用の入力型
 */
export type UpdateStoreSettingsInput = Partial<Omit<StoreSettings, 'id' | 'userId' | 'storeCode' | 'createdAt' | 'updatedAt'>>;
