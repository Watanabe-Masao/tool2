/**
 * メッセージ・テキストの単一情報源（Single Source of Truth）
 *
 * @description
 * アプリケーション全体で使用するすべてのテキストを一元管理
 *
 * ## ディレクトリ構成
 * - validation.ts: バリデーションメッセージ
 * - notification.ts: 通知メッセージ（成功/エラー/警告/情報/確認）
 * - ui.ts: UIテキスト（ラベル、ボタン、プレースホルダー等）
 *
 * ## 使用方法
 * ```typescript
 * import { REQUIRED_MESSAGES } from '@/messages/validation';
 * import { SUCCESS_MESSAGES } from '@/messages/notification';
 * import { BUTTON_LABELS } from '@/messages/ui';
 *
 * // または統合インポート
 * import { REQUIRED_MESSAGES, SUCCESS_MESSAGES, BUTTON_LABELS } from '@/messages';
 * ```
 *
 * ## 設計原則
 * 1. **集約**: すべてのテキストを messages/ に集約
 * 2. **分類**: 用途別にファイルを分離
 * 3. **型安全**: as const で不変性を保証
 * 4. **再利用**: ヘルパー関数で動的メッセージ生成
 * 5. **i18n対応**: 将来的な多言語化を考慮した構造
 */

// ===== バリデーションメッセージ =====
export {
  REQUIRED_MESSAGES,
  TYPE_ERROR_MESSAGES,
  FIELD_VALIDATION_MESSAGES,
  CUSTOM_VALIDATION_MESSAGES,
  createMaxLengthMessage,
  createMinLengthMessage,
  createMinValueMessage,
  createMaxValueMessage,
  createRangeMessage,
} from './validation';

// ===== 通知メッセージ =====
export {
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  WARNING_MESSAGES,
  INFO_MESSAGES,
  CONFIRM_MESSAGES,
  createMessage,
} from './notification';

// ===== UI テキスト =====
export {
  BUTTON_LABELS,
  FIELD_LABELS,
  PAGE_TITLES,
  SECTION_TITLES,
  PLACEHOLDERS,
  STATUS_LABELS,
  HELP_TEXT,
  EMPTY_STATE_MESSAGES,
  TIME_LABELS,
  UNIT_LABELS,
} from './ui';
