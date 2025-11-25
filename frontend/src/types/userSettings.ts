/**
 * ユーザー設定の型定義
 */

import type { EmailAddress, SupplierPreset } from './repository';

/**
 * メールアドレス帳エントリ (UI用)
 *
 * Repository型のEmailAddressからuserIdを除外し、
 * idを必須にしたUI層用の型
 */
export type EmailAddressEntry = Omit<EmailAddress, 'userId' | 'id'> & {
  /** エントリID (必須) */
  id: string;
};

/**
 * 帳合先プリセットエントリ (UI用)
 *
 * Repository型のSupplierPresetからuserIdを除外し、
 * idを必須にしたUI層用の型
 */
export type SupplierPresetEntry = Omit<SupplierPreset, 'userId' | 'id'> & {
  /** エントリID (必須) */
  id: string;
};

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
