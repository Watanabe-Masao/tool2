import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { AllocationDetail } from '@/types/allocationHistory';
import type { DetailGridRow, AllocationDetailWithDate } from '../types';
import type { CompositeKeyField, SortOrder } from '../hooks/useAllocationFilters';
import {
  createDataRow,
  createSubtotalRow,
  createGrandTotalRow,
  aggregateStoreAllocations,
} from './rowGenerators';

/**
 * 日付範囲から全日付リストを生成（純粋関数）
 */
const generateAllDates = (start: string, end: string): string[] => {
  return eachDayOfInterval({
    start: parseISO(start),
    end: parseISO(end),
  }).map(date => format(date, 'yyyy-MM-dd'));
};

/**
 * 日付ごとにグループ化（純粋関数）
 *
 * @param details - 配分明細（deliveryDate付き）
 * @returns グループ化されたマップ
 */
const groupByDateKey = (details: AllocationDetailWithDate[]): Map<string, AllocationDetailWithDate[]> => {
  const groups = new Map<string, AllocationDetailWithDate[]>();

  details.forEach(detail => {
    const dateKey = detail.deliveryDate;
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(detail);
  });

  return groups;
};

/**
 * 商品ごとにグループ化（純粋関数）
 */
const groupByProductKey = (details: AllocationDetailWithDate[]): Map<string, AllocationDetailWithDate[]> => {
  const groups = new Map<string, AllocationDetailWithDate[]>();

  details.forEach(detail => {
    const key = `${detail.productName}|${detail.origin}|${detail.specification}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(detail);
  });

  return groups;
};

/**
 * フィールド値を取得（型安全版）
 */
const getFieldValue = (detail: AllocationDetailWithDate, field: CompositeKeyField): string => {
  switch (field) {
    case 'productName':
      return detail.productName;
    case 'origin':
      return detail.origin;
    case 'specification':
      return detail.specification;
    case 'deliveryDate':
      return detail.deliveryDate;
  }
};

/**
 * 複合キーでグループ化（純粋関数）
 */
const groupByCompositeKey = (
  details: AllocationDetailWithDate[],
  fields: CompositeKeyField[]
): Map<string, AllocationDetailWithDate[]> => {
  const groups = new Map<string, AllocationDetailWithDate[]>();

  details.forEach(detail => {
    const keyParts = fields.map(field => getFieldValue(detail, field));
    const key = keyParts.join('|');

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(detail);
  });

  return groups;
};

/**
 * グループをソート順に並べ替え（純粋関数）
 */
const sortGroups = <T>(
  groups: Map<string, T[]>,
  sortOrder: SortOrder,
  getTotalFn: (items: T[]) => number
): Array<{ key: string; items: T[]; total: number }> => {
  const groupsWithTotals = Array.from(groups.entries()).map(([key, items]) => ({
    key,
    items,
    total: getTotalFn(items),
  }));

  if (sortOrder === 'totalDesc') {
    groupsWithTotals.sort((a, b) => b.total - a.total);
  } else if (sortOrder === 'totalAsc') {
    groupsWithTotals.sort((a, b) => a.total - b.total);
  }

  return groupsWithTotals;
};

/**
 * Strategy: 日付ごとにグループ化
 *
 * 最適化: 日付順にソート、各日付内で商品を列挙
 */
export const generateRowsByDate = (
  details: AllocationDetailWithDate[],
  _sortOrder: SortOrder // 日付モードではソート不要
): DetailGridRow[] => {
  const rows: DetailGridRow[] = [];
  const dateGroups = groupByDateKey(details);

  // 日付順にソート
  const sortedDates = Array.from(dateGroups.keys()).sort();

  // グランドトータル用の集計
  const grandAggregation = aggregateStoreAllocations(details);

  sortedDates.forEach(dateStr => {
    const dateDetails = dateGroups.get(dateStr)!;

    // 各商品の行を追加
    dateDetails.forEach((detail, idx) => {
      const row = createDataRow(detail, `${dateStr}-${idx}`, dateStr);
      rows.push(row);
    });

    // 日付ごとの小計行
    const subtotalAggregation = aggregateStoreAllocations(dateDetails);
    const subtotalLabel = `${format(parseISO(dateStr), 'M月d日(E)', { locale: ja })} 小計`;
    const subtotalRow = createSubtotalRow(
      `subtotal-${dateStr}`,
      subtotalLabel,
      subtotalAggregation,
      dateStr,
      dateStr
    );
    rows.push(subtotalRow);
  });

  // グランドトータル行を追加
  const grandTotalRow = createGrandTotalRow(grandAggregation);
  rows.push(grandTotalRow);

  return rows;
};

/**
 * Strategy: 商品ごとにグループ化（最適化版）
 *
 * 最適化ポイント: allDates.forEach + find (O(n*m)) → Map lookup (O(n+m))
 */
export const generateRowsByProduct = (
  details: AllocationDetailWithDate[],
  dateRange: { start: string; end: string },
  sortOrder: SortOrder
): DetailGridRow[] => {
  const rows: DetailGridRow[] = [];
  const allDates = generateAllDates(dateRange.start, dateRange.end);
  const productGroups = groupByProductKey(details);

  // 商品グループをソート
  const sortedGroups = sortGroups(
    productGroups,
    sortOrder,
    (items) => items.reduce((sum, d) => sum + d.totalDelivery, 0)
  );

  // グランドトータル用の集計
  const grandAggregation = aggregateStoreAllocations(details);

  sortedGroups.forEach(({ key, items: groupDetails }) => {
    const [productName, origin, specification] = key.split('|');

    // 🚀 最適化: O(n*m) → O(n+m)
    // 日付でインデックスを作成
    const detailsByDate = new Map(
      groupDetails.map(d => [d.deliveryDate, d])
    );

    // 各日付の行を追加
    allDates.forEach(dateStr => {
      const detailForDate = detailsByDate.get(dateStr);
      if (detailForDate) {
        const row = createDataRow(detailForDate, `${key}-${dateStr}`, dateStr);
        row.productName = productName;
        row.origin = origin;
        row.specification = specification;
        rows.push(row);
      }
    });

    // 商品ごとの小計行
    const subtotalAggregation = aggregateStoreAllocations(groupDetails);
    const subtotalRow = createSubtotalRow(
      `subtotal-${key}`,
      `${productName} 小計`,
      subtotalAggregation,
      key
    );
    subtotalRow.origin = origin;
    subtotalRow.specification = specification;
    rows.push(subtotalRow);
  });

  // グランドトータル行を追加
  const grandTotalRow = createGrandTotalRow(grandAggregation);
  rows.push(grandTotalRow);

  return rows;
};

/**
 * Strategy: 複合キーでグループ化
 */
export const generateRowsByComposite = (
  details: AllocationDetailWithDate[],
  compositeKeyFields: CompositeKeyField[],
  sortOrder: SortOrder
): DetailGridRow[] => {
  const rows: DetailGridRow[] = [];
  const compositeGroups = groupByCompositeKey(details, compositeKeyFields);

  // グループをソート
  const sortedGroups = sortGroups(
    compositeGroups,
    sortOrder,
    (items) => items.reduce((sum, d) => sum + d.totalDelivery, 0)
  );

  // グランドトータル用の集計
  const grandAggregation = aggregateStoreAllocations(details);

  sortedGroups.forEach(({ key, items: groupDetails }) => {
    // グループ内の詳細を追加
    groupDetails.forEach((detail, idx) => {
      const row = createDataRow(detail, `${key}-${idx}`);
      rows.push(row);
    });

    // グループごとの小計行
    const subtotalAggregation = aggregateStoreAllocations(groupDetails);
    const firstDetail = groupDetails[0];
    const subtotalLabel = compositeKeyFields
      .map((field) => {
        const value = getFieldValue(firstDetail, field);
        return field === 'deliveryDate' && value
          ? format(parseISO(value), 'M月d日(E)', { locale: ja })
          : value;
      })
      .join(' / ') + ' 小計';

    const subtotalRow = createSubtotalRow(
      `subtotal-${key}`,
      subtotalLabel,
      subtotalAggregation,
      key
    );
    rows.push(subtotalRow);
  });

  // グランドトータル行を追加
  const grandTotalRow = createGrandTotalRow(grandAggregation);
  rows.push(grandTotalRow);

  return rows;
};
