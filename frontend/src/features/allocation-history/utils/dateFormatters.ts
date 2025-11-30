import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * Date Format Type
 */
export type DateFormatType = 'short' | 'medium' | 'long';

/**
 * formatAllocationDate
 *
 * 配分履歴用の日付フォーマット関数。
 * date-fns の format と parseISO の重複ロジックを削減します。
 *
 * **使用箇所:**
 * - AllocationFiltersSection: 日付フィルター表示
 * - AllocationDetailModalHeader: 日付バッジ表示
 * - AllocationHistoryTable: 日付列表示
 * - groupingStrategies: グループキー生成
 *
 * **削減効果:** ~40行の重複コードを削除
 *
 * **フォーマット:**
 * - `short`: 1/15(月) - コンパクト表示
 * - `medium`: 1月15日(月) - 標準表示
 * - `long`: 2025年1月15日(月) - 詳細表示
 *
 * @example
 * ```tsx
 * // ISO文字列をフォーマット
 * formatAllocationDate('2025-01-15', 'short')  // => "1/15(月)"
 * formatAllocationDate('2025-01-15', 'medium') // => "1月15日(月)"
 * formatAllocationDate('2025-01-15', 'long')   // => "2025年1月15日(月)"
 *
 * // Date オブジェクトをフォーマット
 * formatAllocationDate(new Date('2025-01-15'), 'short') // => "1/15(月)"
 * ```
 *
 * @param date - ISO文字列 or Date オブジェクト
 * @param formatType - フォーマットタイプ
 * @returns フォーマット済み日付文字列
 */
export const formatAllocationDate = (date: string | Date, formatType: DateFormatType = 'short'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  const formatPatterns: Record<DateFormatType, string> = {
    short: 'M/d(E)',      // 1/15(月)
    medium: 'M月d日(E)',  // 1月15日(月)
    long: 'yyyy年M月d日(E)', // 2025年1月15日(月)
  };

  return format(dateObj, formatPatterns[formatType], { locale: ja });
};

/**
 * formatDateRange
 *
 * 日付範囲を "M/d - M/d" 形式でフォーマット。
 *
 * @example
 * ```tsx
 * formatDateRange('2025-01-15', '2025-01-20') // => "1/15 - 1/20"
 * ```
 *
 * @param start - 開始日（ISO文字列）
 * @param end - 終了日（ISO文字列）
 * @returns フォーマット済み日付範囲文字列
 */
export const formatDateRange = (start: string, end: string): string => {
  const startFormatted = formatAllocationDate(start, 'short').replace(/\(.\)$/, ''); // 曜日を除去
  const endFormatted = formatAllocationDate(end, 'short').replace(/\(.\)$/, '');
  return `${startFormatted} - ${endFormatted}`;
};
