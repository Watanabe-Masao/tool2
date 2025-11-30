import { useMemo, useCallback } from 'react';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useTheme, useMediaQuery, Box, IconButton } from '@mui/material';
import { VisibilityOff } from '@mui/icons-material';
import type { GridColDef } from '@mui/x-data-grid';
import { STORE_DATA } from '@/utils/constants';
import type { AllocationDetail } from '@/types/allocationHistory';
import type { DetailGridRow, AvailableFilterValues } from '../types';
import type { GroupMode, SortOrder, CompositeKeyField, FilterState } from './useAllocationFilters';

/**
 * useAllocationTableData のパラメータ
 */
export interface UseAllocationTableDataParams {
  details: AllocationDetail[];
  selectedDateRange: { start: string; end: string } | null;
  groupMode: GroupMode;
  sortOrder: SortOrder;
  compositeKeyFields: CompositeKeyField[];
  filters: FilterState;
  hiddenColumns: Set<string>;
  hiddenRowIds: Set<string>;
  onHideRow: (rowId: string) => void;
}

/**
 * 店舗カラムのレンダリング（共通化）
 */
const renderStoreCell = (params: { value?: number }) => {
  const value = params.value || 0;
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: value > 0 ? '600' : 'normal',
        color: value > 0 ? '#1565c0' : '#bdbdbd',
        backgroundColor: value > 0 ? '#e3f2fd' : 'transparent',
      }}
    >
      {value > 0 ? value : '-'}
    </Box>
  );
};

/**
 * 店舗カラム定義を生成（共通化）
 */
const createStoreColumns = (isMobile: boolean): GridColDef<DetailGridRow>[] => {
  return STORE_DATA.map((store) => ({
    field: `store_${store.code}`,
    headerName: `${store.code}\n${store.name}`,
    width: isMobile ? 45 : 55,
    sortable: false as const,
    disableColumnMenu: true,
    type: 'number' as const,
    renderCell: renderStoreCell,
  }));
};

/**
 * 配分履歴テーブルデータ生成フック
 *
 * DataGrid用の行データとカラム定義を生成します。
 * グループ化、ソート、フィルタリング、小計・合計計算を含みます。
 *
 * @param params - テーブルデータ生成パラメータ
 * @returns テーブルデータとカラム定義
 *
 * @example
 * ```tsx
 * const { rows, columns, availableFilterValues } = useAllocationTableData({
 *   details,
 *   selectedDateRange,
 *   groupMode,
 *   sortOrder,
 *   filters,
 *   hiddenColumns,
 *   onHideRow,
 * });
 * ```
 */
export const useAllocationTableData = (params: UseAllocationTableDataParams) => {
  const {
    details,
    selectedDateRange,
    groupMode,
    sortOrder,
    compositeKeyFields,
    filters,
    hiddenColumns,
    hiddenRowIds,
    onHideRow,
  } = params;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  /**
   * フィルターを適用
   */
  const applyFilters = useCallback((rows: DetailGridRow[]): DetailGridRow[] => {
    return rows.filter((row) => {
      // 合計行はフィルター対象外
      if (row.rowType === 'subtotal' || row.rowType === 'grandtotal') {
        return true;
      }

      // 商品名フィルター
      if (filters.productNames.length > 0 && !filters.productNames.includes(row.productName)) {
        return false;
      }

      // 産地フィルター
      if (filters.origins.length > 0 && !filters.origins.includes(row.origin)) {
        return false;
      }

      // 規格フィルター
      if (filters.specifications.length > 0 && !filters.specifications.includes(row.specification)) {
        return false;
      }

      // 日付フィルター
      if (filters.dates.length > 0 && row.deliveryDate && !filters.dates.includes(row.deliveryDate)) {
        return false;
      }

      return true;
    });
  }, [filters]);

  /**
   * 詳細モーダル用のDataGrid行データ作成（日付範囲選択時）
   */
  const dateRangeRows: DetailGridRow[] = useMemo(() => {
    if (!selectedDateRange) return [];

    const rows: DetailGridRow[] = [];
    const allDates = eachDayOfInterval({
      start: parseISO(selectedDateRange.start),
      end: parseISO(selectedDateRange.end),
    }).map(date => format(date, 'yyyy-MM-dd'));

    // グランドトータル用の集計
    const grandTotalsByStore: number[] = Array(STORE_DATA.length).fill(0);
    let grandTotalQuantity = 0;

    if (groupMode === 'date') {
      // ========================================
      // 日付ごとにグループ化
      // ========================================
      const dateGroups = new Map<string, AllocationDetail[]>();
      details.forEach(detail => {
        const dateKey = (detail as any).deliveryDate || '';
        if (!dateGroups.has(dateKey)) {
          dateGroups.set(dateKey, []);
        }
        dateGroups.get(dateKey)!.push(detail);
      });

      // 日付順にソート
      const sortedDates = Array.from(dateGroups.keys()).sort();

      sortedDates.forEach(dateStr => {
        const dateDetails = dateGroups.get(dateStr)!;
        const subtotalByStore: number[] = Array(STORE_DATA.length).fill(0);
        let subtotalQuantity = 0;

        // 各商品の行を追加
        dateDetails.forEach((detail, idx) => {
          const row: DetailGridRow = {
            id: `${dateStr}-${idx}`,
            productName: detail.productName,
            origin: detail.origin,
            specification: detail.specification,
            unit: detail.unit,
            quantityPerPackage: detail.quantityPerPackage,
            packageUnit: detail.packageUnit,
            totalDelivery: detail.totalDelivery,
            deliveryDate: dateStr,
            rowType: 'data',
          };

          detail.storeAllocations.forEach((qty, storeIdx) => {
            if (storeIdx < STORE_DATA.length) {
              row[`store_${STORE_DATA[storeIdx].code}`] = qty;
              subtotalByStore[storeIdx] += qty;
              grandTotalsByStore[storeIdx] += qty;
            }
          });

          subtotalQuantity += detail.totalDelivery;
          grandTotalQuantity += detail.totalDelivery;
          rows.push(row);
        });

        // 日付ごとの小計行
        const subtotalRow: DetailGridRow = {
          id: `subtotal-${dateStr}`,
          productName: `${format(parseISO(dateStr), 'M月d日(E)', { locale: ja })} 小計`,
          origin: '',
          specification: '',
          unit: '',
          quantityPerPackage: null,
          packageUnit: '',
          totalDelivery: subtotalQuantity,
          deliveryDate: dateStr,
          rowType: 'subtotal',
          groupKey: dateStr,
        };

        subtotalByStore.forEach((total, storeIdx) => {
          if (storeIdx < STORE_DATA.length) {
            subtotalRow[`store_${STORE_DATA[storeIdx].code}`] = total;
          }
        });

        rows.push(subtotalRow);
      });

    } else if (groupMode === 'product') {
      // ========================================
      // 商品ごとにグループ化
      // ========================================
      const productGroups = new Map<string, AllocationDetail[]>();
      details.forEach(detail => {
        const key = `${detail.productName}|${detail.origin}|${detail.specification}`;
        if (!productGroups.has(key)) {
          productGroups.set(key, []);
        }
        productGroups.get(key)!.push(detail);
      });

      // 商品グループをソート
      const groupsWithTotals = Array.from(productGroups.entries()).map(([key, groupDetails]) => {
        const total = groupDetails.reduce((sum, d) => sum + d.totalDelivery, 0);
        return { key, groupDetails, total };
      });

      if (sortOrder === 'totalDesc') {
        groupsWithTotals.sort((a, b) => b.total - a.total);
      } else if (sortOrder === 'totalAsc') {
        groupsWithTotals.sort((a, b) => a.total - b.total);
      }

      groupsWithTotals.forEach(({ key, groupDetails }) => {
        const [productName, origin, specification] = key.split('|');
        const subtotalByStore: number[] = Array(STORE_DATA.length).fill(0);
        let subtotalQuantity = 0;

        // 各日付の行を追加
        allDates.forEach(dateStr => {
          const detailForDate = groupDetails.find(d => (d as any).deliveryDate === dateStr);
          if (detailForDate) {
            const row: DetailGridRow = {
              id: `${key}-${dateStr}`,
              productName,
              origin,
              specification,
              unit: detailForDate.unit,
              quantityPerPackage: detailForDate.quantityPerPackage,
              packageUnit: detailForDate.packageUnit,
              totalDelivery: detailForDate.totalDelivery,
              deliveryDate: dateStr,
              rowType: 'data',
            };

            detailForDate.storeAllocations.forEach((qty, storeIdx) => {
              if (storeIdx < STORE_DATA.length) {
                row[`store_${STORE_DATA[storeIdx].code}`] = qty;
                subtotalByStore[storeIdx] += qty;
                grandTotalsByStore[storeIdx] += qty;
              }
            });

            subtotalQuantity += detailForDate.totalDelivery;
            grandTotalQuantity += detailForDate.totalDelivery;
            rows.push(row);
          }
        });

        // 商品ごとの小計行
        const subtotalRow: DetailGridRow = {
          id: `subtotal-${key}`,
          productName: `${productName} 小計`,
          origin,
          specification,
          unit: '',
          quantityPerPackage: null,
          packageUnit: '',
          totalDelivery: subtotalQuantity,
          deliveryDate: '小計',
          rowType: 'subtotal',
          groupKey: key,
        };

        subtotalByStore.forEach((total, storeIdx) => {
          if (storeIdx < STORE_DATA.length) {
            subtotalRow[`store_${STORE_DATA[storeIdx].code}`] = total;
          }
        });

        rows.push(subtotalRow);
      });

    } else {
      // ========================================
      // 複合グループ化（動的フィールド対応）
      // ========================================
      // 複合キーの値を取得するヘルパー関数
      const getFieldValue = (detail: AllocationDetail, field: CompositeKeyField): string => {
        switch (field) {
          case 'productName':
            return detail.productName;
          case 'origin':
            return detail.origin;
          case 'specification':
            return detail.specification;
          case 'deliveryDate':
            return (detail as any).deliveryDate || '';
        }
      };

      // 第1階層のグループキーを生成
      const primaryGroups = new Map<string, AllocationDetail[]>();
      details.forEach(detail => {
        const keyParts = compositeKeyFields.map(field => getFieldValue(detail, field));
        const key = keyParts.join('|');
        if (!primaryGroups.has(key)) {
          primaryGroups.set(key, []);
        }
        primaryGroups.get(key)!.push(detail);
      });

      const groupsWithTotals = Array.from(primaryGroups.entries()).map(([key, groupDetails]) => {
        const total = groupDetails.reduce((sum, d) => sum + d.totalDelivery, 0);
        return { key, groupDetails, total };
      });

      if (sortOrder === 'totalDesc') {
        groupsWithTotals.sort((a, b) => b.total - a.total);
      } else {
        groupsWithTotals.sort((a, b) => a.total - b.total);
      }

      groupsWithTotals.forEach(({ key, groupDetails }) => {
        const groupSubtotalByStore: number[] = Array(STORE_DATA.length).fill(0);
        let groupSubtotalQuantity = 0;

        // グループ内の詳細を追加
        groupDetails.forEach((detail, idx) => {
          const row: DetailGridRow = {
            id: `${key}-${idx}`,
            productName: detail.productName,
            origin: detail.origin,
            specification: detail.specification,
            unit: detail.unit,
            quantityPerPackage: detail.quantityPerPackage,
            packageUnit: detail.packageUnit,
            totalDelivery: detail.totalDelivery,
            deliveryDate: (detail as any).deliveryDate,
            rowType: 'data',
          };

          detail.storeAllocations.forEach((qty, storeIdx) => {
            if (storeIdx < STORE_DATA.length) {
              row[`store_${STORE_DATA[storeIdx].code}`] = qty;
              groupSubtotalByStore[storeIdx] += qty;
              grandTotalsByStore[storeIdx] += qty;
            }
          });

          groupSubtotalQuantity += detail.totalDelivery;
          grandTotalQuantity += detail.totalDelivery;
          rows.push(row);
        });

        // グループごとの小計行（第1フィールドで表示）
        const firstDetail = groupDetails[0];
        const subtotalLabel = compositeKeyFields
          .map((field) => {
            const value = getFieldValue(firstDetail, field);
            return field === 'deliveryDate' && value
              ? format(parseISO(value), 'M月d日(E)', { locale: ja })
              : value;
          })
          .join(' / ') + ' 小計';

        const subtotalRow: DetailGridRow = {
          id: `subtotal-${key}`,
          productName: subtotalLabel,
          origin: '',
          specification: '',
          unit: '',
          quantityPerPackage: null,
          packageUnit: '',
          totalDelivery: groupSubtotalQuantity,
          deliveryDate: '小計',
          rowType: 'subtotal',
          groupKey: key,
        };

        groupSubtotalByStore.forEach((total, storeIdx) => {
          if (storeIdx < STORE_DATA.length) {
            subtotalRow[`store_${STORE_DATA[storeIdx].code}`] = total;
          }
        });

        rows.push(subtotalRow);
      });
    }

    // グランドトータル行を追加
    const grandTotalRow: DetailGridRow = {
      id: 'grandtotal',
      productName: '総合計',
      origin: '',
      specification: '',
      unit: '',
      quantityPerPackage: null,
      packageUnit: '',
      totalDelivery: grandTotalQuantity,
      deliveryDate: '総合計',
      rowType: 'grandtotal',
    };

    grandTotalsByStore.forEach((total, storeIdx) => {
      if (storeIdx < STORE_DATA.length) {
        grandTotalRow[`store_${STORE_DATA[storeIdx].code}`] = total;
      }
    });

    rows.push(grandTotalRow);

    console.log('📋 Generated rows:', rows.length, 'Group mode:', groupMode);
    return rows;
  }, [selectedDateRange, details, groupMode, sortOrder, compositeKeyFields]);

  /**
   * 単一バッチ選択時の行データ
   */
  const singleBatchRows: DetailGridRow[] = useMemo(() => {
    if (selectedDateRange) return [];

    return details.map((detail, idx) => {
      const row: DetailGridRow = {
        id: detail.id || `row-${idx}`,
        productName: detail.productName,
        origin: detail.origin,
        specification: detail.specification,
        unit: detail.unit,
        quantityPerPackage: detail.quantityPerPackage,
        packageUnit: detail.packageUnit,
        totalDelivery: detail.totalDelivery,
      };

      // 各店舗の配分数量を追加
      detail.storeAllocations.forEach((qty, storeIdx) => {
        if (storeIdx < STORE_DATA.length) {
          row[`store_${STORE_DATA[storeIdx].code}`] = qty;
        }
      });

      return row;
    });
  }, [selectedDateRange, details]);

  /**
   * フィルター用の利用可能な値を計算（最適化版: O(n) 単一パス）
   */
  const availableFilterValues: AvailableFilterValues = useMemo(() => {
    const baseRows = selectedDateRange ? dateRangeRows : singleBatchRows;

    // 単一パスで全フィルター値を収集（O(4n) → O(n)）
    const sets = baseRows.reduce(
      (acc, row) => {
        // 合計行をスキップ
        if (row.rowType === 'subtotal' || row.rowType === 'grandtotal') return acc;

        // 各フィルター値に対して、他のフィルターのみを適用して収集
        const passesOriginFilter = filters.origins.length === 0 || filters.origins.includes(row.origin);
        const passesSpecFilter = filters.specifications.length === 0 || filters.specifications.includes(row.specification);
        const passesDateFilter = filters.dates.length === 0 || (row.deliveryDate && filters.dates.includes(row.deliveryDate));
        const passesProductFilter = filters.productNames.length === 0 || filters.productNames.includes(row.productName);

        // 商品名: 他の3フィルター適用
        if (passesOriginFilter && passesSpecFilter && passesDateFilter) {
          acc.productNames.add(row.productName);
        }

        // 産地: 他の3フィルター適用
        if (passesProductFilter && passesSpecFilter && passesDateFilter) {
          acc.origins.add(row.origin);
        }

        // 規格: 他の3フィルター適用
        if (passesProductFilter && passesOriginFilter && passesDateFilter) {
          acc.specifications.add(row.specification);
        }

        // 日付: 他の3フィルター適用
        if (passesProductFilter && passesOriginFilter && passesSpecFilter && row.deliveryDate) {
          acc.dates.add(row.deliveryDate);
        }

        return acc;
      },
      {
        productNames: new Set<string>(),
        origins: new Set<string>(),
        specifications: new Set<string>(),
        dates: new Set<string>(),
      }
    );

    return {
      productNames: Array.from(sets.productNames).sort(),
      origins: Array.from(sets.origins).sort(),
      specifications: Array.from(sets.specifications).sort(),
      dates: Array.from(sets.dates).sort(),
    };
  }, [selectedDateRange, dateRangeRows, singleBatchRows, filters]);

  /**
   * 日付範囲選択時のカラム定義
   */
  const dateRangeColumns: GridColDef<DetailGridRow>[] = useMemo(() => [
    {
      field: 'actions',
      headerName: '',
      width: 40,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const row = params.row as DetailGridRow;
        // 合計行は非表示ボタンを表示しない
        if (row.rowType === 'subtotal' || row.rowType === 'grandtotal') return null;

        return (
          <IconButton
            size="small"
            onClick={() => onHideRow(row.id)}
            sx={{ p: 0.5 }}
          >
            <VisibilityOff fontSize="small" />
          </IconButton>
        );
      },
    },
    {
      field: 'deliveryDate',
      headerName: '日付',
      width: isMobile ? 100 : 120,
      sortable: true,
      disableColumnMenu: true,
      renderCell: (params) => {
        const dateStr = params.value as string;
        if (!dateStr) return '-';
        if (dateStr === '小計' || dateStr === '総合計') {
          return (
            <Box sx={{ fontWeight: 700 }}>
              {dateStr}
            </Box>
          );
        }
        return format(parseISO(dateStr), 'M月d日(E)', { locale: ja });
      },
    },
    {
      field: 'productName',
      headerName: '品名',
      width: isMobile ? 100 : 150,
      sortable: true,
      disableColumnMenu: true,
    },
    {
      field: 'origin',
      headerName: '産地',
      width: isMobile ? 80 : 100,
      sortable: true,
      disableColumnMenu: true,
    },
    {
      field: 'specification',
      headerName: '規格',
      width: isMobile ? 100 : 120,
      sortable: true,
      disableColumnMenu: true,
      renderCell: (params) => {
        const row = params.row as DetailGridRow;
        if (row.rowType === 'subtotal' || row.rowType === 'grandtotal') {
          return row.specification || '';
        }
        return row.unit ? `${row.specification} ${row.unit}` : row.specification;
      },
    },
    {
      field: 'quantityPerPackage',
      headerName: '入数',
      width: isMobile ? 80 : 100,
      sortable: true,
      disableColumnMenu: true,
      renderCell: (params) => {
        const row = params.row as DetailGridRow;
        if (row.rowType === 'subtotal' || row.rowType === 'grandtotal') {
          return '';
        }
        if (row.quantityPerPackage === null || row.quantityPerPackage === undefined) {
          return '-';
        }
        return row.packageUnit ? `${row.quantityPerPackage} ${row.packageUnit}` : row.quantityPerPackage;
      },
    },
    {
      field: 'totalDelivery',
      headerName: '合計',
      width: isMobile ? 60 : 80,
      sortable: true,
      disableColumnMenu: true,
      type: 'number',
    },
    // 店舗カラムを追加（共通化された定義を使用）
    ...createStoreColumns(isMobile),
  ], [isMobile, onHideRow]);

  /**
   * 単一バッチ選択時のカラム定義
   */
  const singleBatchColumns: GridColDef<DetailGridRow>[] = useMemo(() => [
    {
      field: 'actions',
      headerName: '',
      width: 40,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const row = params.row as DetailGridRow;
        return (
          <IconButton
            size="small"
            onClick={() => onHideRow(row.id)}
            sx={{ p: 0.5 }}
          >
            <VisibilityOff fontSize="small" />
          </IconButton>
        );
      },
    },
    {
      field: 'productName',
      headerName: '品名',
      width: isMobile ? 100 : 150,
      sortable: false,
      disableColumnMenu: true,
    },
    {
      field: 'origin',
      headerName: '産地',
      width: isMobile ? 80 : 100,
      sortable: false,
      disableColumnMenu: true,
    },
    {
      field: 'specification',
      headerName: '規格',
      width: isMobile ? 100 : 120,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const row = params.row as DetailGridRow;
        return row.unit ? `${row.specification} ${row.unit}` : row.specification;
      },
    },
    {
      field: 'quantityPerPackage',
      headerName: '入数',
      width: isMobile ? 80 : 100,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const row = params.row as DetailGridRow;
        if (row.quantityPerPackage === null || row.quantityPerPackage === undefined) {
          return '-';
        }
        return row.packageUnit ? `${row.quantityPerPackage} ${row.packageUnit}` : row.quantityPerPackage;
      },
    },
    {
      field: 'totalDelivery',
      headerName: '合計',
      width: isMobile ? 60 : 80,
      sortable: false,
      disableColumnMenu: true,
      type: 'number',
    },
    // 店舗カラムを追加（共通化された定義を使用）
    ...createStoreColumns(isMobile),
  ], [isMobile, onHideRow]);

  /**
   * アクティブなカラム（hiddenColumns適用後）
   */
  const visibleColumns = useMemo(() => {
    const columns = selectedDateRange ? dateRangeColumns : singleBatchColumns;
    return columns.filter(col => !hiddenColumns.has(col.field));
  }, [selectedDateRange, dateRangeColumns, singleBatchColumns, hiddenColumns]);

  /**
   * フィルター適用後の行データ
   */
  const filteredRows = useMemo(() => {
    const rows = selectedDateRange ? dateRangeRows : singleBatchRows;
    return applyFilters(rows);
  }, [selectedDateRange, dateRangeRows, singleBatchRows, applyFilters]);

  return {
    // 行データ
    rows: filteredRows,
    rawRows: selectedDateRange ? dateRangeRows : singleBatchRows,

    // カラム定義
    columns: visibleColumns,
    allColumns: selectedDateRange ? dateRangeColumns : singleBatchColumns,

    // フィルター用データ
    availableFilterValues,

    // メタデータ
    isSingleBatch: !selectedDateRange,
    isDateRange: !!selectedDateRange,
  };
};

/**
 * useAllocationTableData の戻り値型
 */
export type UseAllocationTableDataReturn = ReturnType<typeof useAllocationTableData>;
