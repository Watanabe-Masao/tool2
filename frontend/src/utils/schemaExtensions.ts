import { z } from 'zod';

/**
 * Zod Schema Extensions
 *
 * @description
 * 再利用可能な Zod スキーマパターンとヘルパー関数を提供します。
 *
 * @example
 * ```typescript
 * import { createNonEmptyString, createEmail } from '@/utils/schemaExtensions';
 *
 * const UserSchema = z.object({
 *   name: createNonEmptyString({ label: 'ユーザー名' }),
 *   email: createEmail(),
 * });
 * ```
 */

// ============================================================
// 文字列スキーマ
// ============================================================

/**
 * 非空文字列スキーマを作成
 *
 * @param options - オプション
 * @param options.label - フィールドラベル（エラーメッセージに使用）
 * @param options.maxLength - 最大文字数
 * @param options.minLength - 最小文字数
 * @param options.trim - 前後の空白を削除するか
 */
export function createNonEmptyString(options?: {
  label?: string;
  maxLength?: number;
  minLength?: number;
  trim?: boolean;
}) {
  const { label = 'この項目', maxLength, minLength = 1, trim = true } = options || {};

  let schema = z.string({ required_error: `${label}は必須です` });

  if (trim) {
    schema = schema.trim();
  }

  schema = schema.min(minLength, `${label}は${minLength}文字以上で入力してください`);

  if (maxLength) {
    schema = schema.max(maxLength, `${label}は${maxLength}文字以内で入力してください`);
  }

  return schema;
}

/**
 * メールアドレススキーマを作成
 */
export function createEmail(options?: { label?: string }) {
  const { label = 'メールアドレス' } = options || {};

  return z
    .string({ required_error: `${label}は必須です` })
    .trim()
    .email(`${label}の形式が正しくありません`);
}

/**
 * URL スキーマを作成
 */
export function createUrl(options?: { label?: string }) {
  const { label = 'URL' } = options || {};

  return z
    .string({ required_error: `${label}は必須です` })
    .trim()
    .url(`${label}の形式が正しくありません`);
}

/**
 * 電話番号スキーマを作成（日本の電話番号形式）
 */
export function createPhoneNumber(options?: { label?: string }) {
  const { label = '電話番号' } = options || {};

  return z
    .string({ required_error: `${label}は必須です` })
    .trim()
    .regex(
      /^0\d{1,4}-?\d{1,4}-?\d{4}$/,
      `${label}の形式が正しくありません（例: 03-1234-5678）`
    );
}

/**
 * 郵便番号スキーマを作成（日本の郵便番号形式）
 */
export function createPostalCode(options?: { label?: string }) {
  const { label = '郵便番号' } = options || {};

  return z
    .string({ required_error: `${label}は必須です` })
    .trim()
    .regex(/^\d{3}-?\d{4}$/, `${label}の形式が正しくありません（例: 123-4567）`);
}

// ============================================================
// 数値スキーマ
// ============================================================

/**
 * 正の数値スキーマを作成
 *
 * @param options - オプション
 * @param options.label - フィールドラベル
 * @param options.integer - 整数のみ許可するか
 * @param options.min - 最小値
 * @param options.max - 最大値
 */
export function createPositiveNumber(options?: {
  label?: string;
  integer?: boolean;
  min?: number;
  max?: number;
}) {
  const { label = 'この数値', integer = false, min = 0, max } = options || {};

  let schema = z
    .number({ required_error: `${label}は必須です`, invalid_type_error: `${label}は数値で入力してください` })
    .min(min, `${label}は${min}以上で入力してください`);

  if (integer) {
    schema = schema.int(`${label}は整数で入力してください`);
  }

  if (max !== undefined) {
    schema = schema.max(max, `${label}は${max}以下で入力してください`);
  }

  return schema;
}

/**
 * パーセンテージスキーマを作成（0-100）
 */
export function createPercentage(options?: { label?: string }) {
  const { label = 'パーセンテージ' } = options || {};

  return z
    .number({
      required_error: `${label}は必須です`,
      invalid_type_error: `${label}は数値で入力してください`,
    })
    .min(0, `${label}は0以上で入力してください`)
    .max(100, `${label}は100以下で入力してください`);
}

/**
 * 金額スキーマを作成（0以上の整数）
 */
export function createCurrency(options?: { label?: string; maxAmount?: number }) {
  const { label = '金額', maxAmount } = options || {};

  let schema = z
    .number({
      required_error: `${label}は必須です`,
      invalid_type_error: `${label}は数値で入力してください`,
    })
    .int(`${label}は整数で入力してください`)
    .min(0, `${label}は0以上で入力してください`);

  if (maxAmount !== undefined) {
    schema = schema.max(maxAmount, `${label}は${maxAmount}以下で入力してください`);
  }

  return schema;
}

// ============================================================
// 日付スキーマ
// ============================================================

/**
 * 日付スキーマを作成
 *
 * @param options - オプション
 * @param options.label - フィールドラベル
 * @param options.minDate - 最小日付
 * @param options.maxDate - 最大日付
 * @param options.futureOnly - 未来の日付のみ許可
 * @param options.pastOnly - 過去の日付のみ許可
 */
export function createDate(options?: {
  label?: string;
  minDate?: Date;
  maxDate?: Date;
  futureOnly?: boolean;
  pastOnly?: boolean;
}) {
  const { label = '日付', minDate, maxDate, futureOnly = false, pastOnly = false } = options || {};

  let schema = z.date({
    required_error: `${label}は必須です`,
    invalid_type_error: `${label}の形式が正しくありません`,
  });

  if (minDate) {
    schema = schema.min(minDate, `${label}は${minDate.toLocaleDateString()}以降で選択してください`);
  }

  if (maxDate) {
    schema = schema.max(maxDate, `${label}は${maxDate.toLocaleDateString()}以前で選択してください`);
  }

  if (futureOnly) {
    schema = schema.refine((date) => date > new Date(), {
      message: `${label}は未来の日付を選択してください`,
    });
  }

  if (pastOnly) {
    schema = schema.refine((date) => date < new Date(), {
      message: `${label}は過去の日付を選択してください`,
    });
  }

  return schema;
}

// ============================================================
// 配列スキーマ
// ============================================================

/**
 * 非空配列スキーマを作成
 *
 * @param itemSchema - 配列要素のスキーマ
 * @param options - オプション
 * @param options.label - フィールドラベル
 * @param options.minLength - 最小要素数
 * @param options.maxLength - 最大要素数
 */
export function createNonEmptyArray<T extends z.ZodTypeAny>(
  itemSchema: T,
  options?: {
    label?: string;
    minLength?: number;
    maxLength?: number;
  }
) {
  const { label = 'この配列', minLength = 1, maxLength } = options || {};

  let schema = z.array(itemSchema).min(minLength, `${label}は${minLength}個以上選択してください`);

  if (maxLength) {
    schema = schema.max(maxLength, `${label}は${maxLength}個以下で選択してください`);
  }

  return schema;
}

/**
 * ユニークな配列スキーマを作成
 *
 * @param itemSchema - 配列要素のスキーマ
 * @param options - オプション
 */
export function createUniqueArray<T extends z.ZodTypeAny>(
  itemSchema: T,
  options?: {
    label?: string;
    minLength?: number;
    maxLength?: number;
  }
) {
  const { label = 'この配列' } = options || {};

  const baseSchema = createNonEmptyArray(itemSchema, options);

  return baseSchema.refine(
    (arr) => new Set(arr).size === arr.length,
    {
      message: `${label}に重複する値があります`,
    }
  );
}

// ============================================================
// 選択肢スキーマ
// ============================================================

/**
 * Enum スキーマを作成
 *
 * @param values - 選択肢の配列
 * @param options - オプション
 */
export function createEnum<T extends readonly [string, ...string[]]>(
  values: T,
  options?: { label?: string }
) {
  const { label = 'この項目' } = options || {};

  return z.enum(values, {
    required_error: `${label}は必須です`,
    invalid_type_error: `${label}は有効な値を選択してください`,
  });
}

// ============================================================
// オプショナルスキーマ
// ============================================================

/**
 * オプショナルかつ null 許可のスキーマを作成
 *
 * @description
 * undefined と null の両方を許可します。
 * React Hook Form の optional フィールドで使用します。
 */
export function createNullable<T extends z.ZodTypeAny>(schema: T) {
  return schema.optional().nullable();
}

/**
 * 空文字列を null に変換するスキーマを作成
 *
 * @description
 * フォームの入力フィールドで空文字列が送信された場合に null に変換します。
 */
export function createNullableString<T extends z.ZodString>(schema: T) {
  return schema
    .transform((val) => (val === '' ? null : val))
    .pipe(z.string().nullable());
}

// ============================================================
// カスタムバリデーション
// ============================================================

/**
 * パスワードスキーマを作成
 *
 * @param options - オプション
 * @param options.minLength - 最小文字数
 * @param options.requireNumber - 数字を必須にするか
 * @param options.requireSpecialChar - 特殊文字を必須にするか
 */
export function createPassword(options?: {
  minLength?: number;
  requireNumber?: boolean;
  requireSpecialChar?: boolean;
}) {
  const { minLength = 8, requireNumber = true, requireSpecialChar = true } = options || {};

  let schema = z.string().min(minLength, `パスワードは${minLength}文字以上で入力してください`);

  if (requireNumber) {
    schema = schema.regex(/\d/, 'パスワードには数字を含めてください');
  }

  if (requireSpecialChar) {
    schema = schema.regex(/[!@#$%^&*(),.?":{}|<>]/, 'パスワードには特殊文字を含めてください');
  }

  return schema;
}

/**
 * パスワード確認スキーマを作成
 *
 * @description
 * パスワードと確認用パスワードが一致することを検証します。
 *
 * @example
 * ```typescript
 * const confirmation = createPasswordConfirmation('password', 'confirmPassword');
 * const SignupSchema = z.object({
 *   password: createPassword(),
 *   confirmPassword: z.string(),
 * }).refine(confirmation.check, confirmation.options);
 * ```
 */
export function createPasswordConfirmation(
  passwordField: string,
  confirmPasswordField: string
) {
  return {
    check: (data: any) => data[passwordField] === data[confirmPasswordField],
    options: {
      message: 'パスワードが一致しません',
      path: [confirmPasswordField],
    },
  };
}
