/**
 * ユーザー設定の型定義
 */

/**
 * メールアドレス帳エントリ
 */
export interface EmailAddressEntry {
  /** エントリID */
  id: string;
  /** 表示名 */
  name: string;
  /** メールアドレス */
  email: string;
  /** 表示順序 */
  displayOrder?: number;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
}

/**
 * ユーザー設定
 */
export interface UserSettings {
  /** ドキュメントID */
  id: string;
  /** ユーザーID */
  userId: string;
  /** メール送信時の表示名 */
  emailSenderName?: string;
  /** 担当バイヤー名 */
  buyerName?: string;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
}

/**
 * ユーザー設定作成入力
 */
export interface CreateUserSettingsInput {
  /** ユーザーID */
  userId: string;
  /** メール送信時の表示名 */
  emailSenderName?: string;
  /** 担当バイヤー名 */
  buyerName?: string;
}

/**
 * ユーザー設定更新入力
 */
export interface UpdateUserSettingsInput {
  /** メール送信時の表示名 */
  emailSenderName?: string;
  /** 担当バイヤー名 */
  buyerName?: string;
}
