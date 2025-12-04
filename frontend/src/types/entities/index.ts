/**
 * Entity型定義
 *
 * Repository層からアプリケーション層に渡されるドメインエンティティ
 * DBの生データではなく、アプリケーションで使用しやすい形に変換された型
 */

/**
 * メールアドレスエンティティ
 *
 * Repository型のEmailAddressからuserIdを除外し、
 * idを必須にしたエンティティ型
 *
 * @remarks
 * - userId: 認証コンテキストから取得できるため除外
 * - id: エンティティとして必須（DBから取得済み）
 */
export interface EmailAddressEntity {
  /** エンティティID（必須） */
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
 * 帳合先プリセットエンティティ
 *
 * Repository型のSupplierPresetからuserIdを除外し、
 * idを必須にしたエンティティ型
 *
 * @remarks
 * - userId: 認証コンテキストから取得できるため除外
 * - id: エンティティとして必須（DBから取得済み）
 */
export interface SupplierPresetEntity {
  /** エンティティID（必須） */
  id: string;
  /** 帳合先名 */
  supplier: string;
  /** センターフィー率（%）（デフォルト値として使用） */
  centerFeeRate?: number;
  /** 表示順序 */
  displayOrder?: number;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
}
