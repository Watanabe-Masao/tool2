import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  Drawer,
  ListItemText,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import {
  Visibility,
  Refresh,
  CalendarMonth,
  Delete,
  ViewList,
  CalendarToday,
  Fullscreen,
  FullscreenExit,
  VisibilityOff,
  Settings,
  FilterList,
  Close,
  DateRange,
} from '@mui/icons-material';
import {
  format,
  subDays,
  parseISO,
  startOfWeek,
  endOfWeek,
  addMonths,
  eachDayOfInterval,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventInput, DateSelectArg } from '@fullcalendar/core';
import { useAuthContext } from '@/context/AuthContext';
import { getFirebaseFirestore } from '@/services/firebase/config';
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';
import { StoreCategoryService } from '@/services/firebase/storeCategoryService';
import { STORE_DATA } from '@/utils/constants';
import type { AllocationBatch, AllocationDetail } from '@/types/allocationHistory';
import type { StoreCategory } from '@/types/storeCategory';
import { MODAL_Z_INDEX, ELEMENT_OFFSET } from '@/constants/zIndex';

/**
 * グリッド行データの型（詳細モーダル用）
 */
interface DetailGridRow {
  id: string;
  productName: string;
  origin: string;
  specification: string;
  unit: string; // 規格の単位
  quantityPerPackage: number | null; // 入数
  packageUnit: string; // 入数の単位
  totalDelivery: number;
  deliveryDate?: string; // 日付範囲選択時に使用
  rowType?: 'data' | 'subtotal' | 'grandtotal'; // 行のタイプ
  groupKey?: string; // グループキー
  [key: string]: string | number | null | undefined;
}


/**
 * 配分履歴一覧ページ
 *
 * 過去の配分履歴を一覧表示し、詳細を確認できます。
 */
export const AllocationHistoryPage: React.FC = () => {
  const { user } = useAuthContext();

  const [batches, setBatches] = useState<AllocationBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);

  // 表示モード
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');

  // 詳細モーダル
  const [selectedBatch, setSelectedBatch] = useState<AllocationBatch | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: string; end: string } | null>(null);
  const [details, setDetails] = useState<AllocationDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // グループ化モード
  type GroupMode = 'date' | 'product' | 'composite';
  const [groupMode, setGroupMode] = useState<GroupMode>('product');
  const [sortOrder, setSortOrder] = useState<'totalDesc' | 'totalAsc'>('totalDesc');

  // 行の表示/非表示
  const [hiddenRowIds, setHiddenRowIds] = useState<Set<string>>(new Set());

  // フルスクリーンモード
  const [isFullScreen, setIsFullScreen] = useState(false);

  // 設定ドロワー
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 日付範囲ピッカー
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ start: string; end: string } | null>(null);

  // 列の表示/非表示
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // フィルター
  const [filters, setFilters] = useState<{
    productNames: string[];
    origins: string[];
    specifications: string[];
    dates: string[];
  }>({
    productNames: [],
    origins: [],
    specifications: [],
    dates: [],
  });

  // 複合キー設定
  type CompositeKeyField = 'productName' | 'origin' | 'specification' | 'deliveryDate';
  const [compositeKeyFields, setCompositeKeyFields] = useState<CompositeKeyField[]>(['productName', 'deliveryDate']);

  // 削除確認ダイアログ
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<AllocationBatch | null>(null);
  const [deleting, setDeleting] = useState(false);


  /**
   * FullCalendar用のイベントデータを生成
   */
  const calendarEvents: EventInput[] = useMemo(() => {
    const events: EventInput[] = [];

    batches.forEach((batch) => {
      // ファイル名がある場合はそれを使用、なければ帳合先名を使用
      const fileName = (batch as any).fileName;
      const displayTitle = fileName || batch.suppliers.join(', ');
      const productCount = batch.productCount || 0;

      events.push({
        id: batch.id || '',
        title: displayTitle,
        date: batch.deliveryDate,
        extendedProps: {
          batch,
          productCount,
          totalQuantity: batch.totalQuantity,
          fileName,
        },
        backgroundColor: '#1976d2',
        borderColor: '#1565c0',
        textColor: '#ffffff',
      });
    });

    return events;
  }, [batches]);

  /**
   * 履歴を取得（過去90日間）
   */
  const fetchHistory = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      const endDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');

      const fetchedBatches = await firestoreService.getAllocationBatchesByDateRange(
        user.uid,
        startDate,
        endDate
      );

      console.log('📦 取得したバッチ数:', fetchedBatches.length);
      console.log('📦 バッチ一覧:', fetchedBatches.map(b => ({ id: b.id, date: b.deliveryDate })));

      setBatches(fetchedBatches);
    } catch (err) {
      console.error('Failed to fetch allocation history:', err);
      setError('履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  /**
   * バッチの詳細を取得
   */
  const fetchBatchDetails = useCallback(async (batch: AllocationBatch) => {
    if (!batch.id || !user?.uid) return;

    setSelectedBatch(batch);
    setDetailsLoading(true);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      const fetchedDetails = await firestoreService.getAllocationDetails(user.uid, batch.id);
      setDetails(fetchedDetails);
    } catch (err) {
      console.error('Failed to fetch batch details:', err);
      setError(`詳細の取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setDetailsLoading(false);
    }
  }, [user?.uid]);


  /**
   * 店舗カテゴリーを取得
   */
  const fetchStoreCategories = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const categories = await StoreCategoryService.getAll(user.uid);
      setStoreCategories(categories);
    } catch (err) {
      console.error('Failed to fetch store categories:', err);
    }
  }, [user?.uid]);

  /**
   * 初回読み込み
   */
  useEffect(() => {
    fetchHistory();
    fetchStoreCategories();
  }, [fetchHistory, fetchStoreCategories]);

  /**
   * 詳細モーダルを閉じる
   */
  const handleCloseDetails = () => {
    setSelectedBatch(null);
    setSelectedDateRange(null);
    setDetails([]);
  };

  /**
   * FullCalendarのイベントクリックハンドラー
   */
  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const batch = clickInfo.event.extendedProps.batch as AllocationBatch;
    if (batch) {
      fetchBatchDetails(batch);
    }
  }, [fetchBatchDetails]);

  /**
   * FullCalendarの日付範囲選択ハンドラー
   */
  const handleDateSelect = useCallback(async (selectInfo: DateSelectArg) => {
    if (!user?.uid) return;

    // FullCalendar の end は排他的なので1日引く
    const startDate = format(selectInfo.start, 'yyyy-MM-dd');
    const endDate = format(subDays(selectInfo.end, 1), 'yyyy-MM-dd');

    console.log('📅 Date range selected:', { startDate, endDate });

    setSelectedDateRange({ start: startDate, end: endDate });
    setSelectedBatch(null); // 単一バッチ選択をクリア
    setDetailsLoading(true);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      // 選択範囲のバッチを取得
      const rangeBatches = await firestoreService.getAllocationBatchesByDateRange(
        user.uid,
        startDate,
        endDate
      );

      console.log('📦 Found batches in range:', rangeBatches.length);

      // 各バッチの詳細を取得
      const allDetails: AllocationDetail[] = [];
      for (const batch of rangeBatches) {
        if (batch.id) {
          const batchDetails = await firestoreService.getAllocationDetails(user.uid, batch.id);
          // 各詳細に日付情報を追加
          batchDetails.forEach(detail => {
            (detail as any).deliveryDate = batch.deliveryDate;
          });
          allDetails.push(...batchDetails);
        }
      }

      console.log('📋 Total details fetched:', allDetails.length);
      setDetails(allDetails);
    } catch (err) {
      console.error('Failed to fetch date range details:', err);
      setError(`詳細の取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setDetailsLoading(false);
    }
  }, [user?.uid]);

  /**
   * 削除確認ダイアログを開く
   */
  const handleOpenDeleteDialog = (batch: AllocationBatch) => {
    setBatchToDelete(batch);
    setDeleteDialogOpen(true);
  };

  /**
   * 削除確認ダイアログを閉じる
   */
  const handleCloseDeleteDialog = () => {
    setBatchToDelete(null);
    setDeleteDialogOpen(false);
  };

  /**
   * 配分履歴を削除
   */
  const handleDelete = async () => {
    if (!batchToDelete?.id || !user?.uid) return;

    setDeleting(true);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      const success = await firestoreService.deleteAllocationBatch(user.uid, batchToDelete.id);

      if (success) {
        // 一覧から削除
        setBatches((prev) => prev.filter((b) => b.id !== batchToDelete.id));
        handleCloseDeleteDialog();
      } else {
        setError('削除に失敗しました');
      }
    } catch (err) {
      console.error('Failed to delete batch:', err);
      setError(`削除に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setDeleting(false);
    }
  };

  /**
   * バッチを週ごとにグループ化
   */
  const batchesByWeek = batches.reduce((acc, batch) => {
    const batchDate = parseISO(batch.deliveryDate);
    const weekStart = startOfWeek(batchDate, { locale: ja, weekStartsOn: 0 }); // 日曜始まり
    const weekKey = format(weekStart, 'yyyy-MM-dd');

    if (!acc[weekKey]) {
      acc[weekKey] = {
        weekStart,
        weekEnd: endOfWeek(batchDate, { locale: ja, weekStartsOn: 0 }),
        batches: [],
      };
    }
    acc[weekKey].batches.push(batch);
    return acc;
  }, {} as Record<string, { weekStart: Date; weekEnd: Date; batches: AllocationBatch[] }>);

  // 週を新しい順にソート
  const sortedWeeks = Object.values(batchesByWeek).sort((a, b) =>
    b.weekStart.getTime() - a.weekStart.getTime()
  );

  /**
   * フィルター適用関数
   */
  const applyFilters = useCallback((rows: DetailGridRow[]) => {
    return rows.filter(row => {
      // 合計行は常に表示
      if (row.rowType === 'subtotal' || row.rowType === 'grandtotal') return true;

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
   * 詳細モーダル用のDataGridカラム定義
   */
  const isMobile = window.innerWidth < 600;

  // 日付範囲選択時のカラム定義
  const dateRangeColumns: GridColDef<DetailGridRow>[] = [
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
            onClick={() => {
              const newHidden = new Set(hiddenRowIds);
              newHidden.add(row.id);
              setHiddenRowIds(newHidden);
            }}
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
    // 店舗カラムを追加
    ...STORE_DATA.map((store) => ({
      field: `store_${store.code}`,
      headerName: `${store.code}\n${store.name}`,
      width: isMobile ? 45 : 55,
      sortable: false as const,
      disableColumnMenu: true,
      type: 'number' as const,
      renderCell: (params: { value?: number }) => {
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
      },
    })),
  ];

  // 単一バッチ選択時のカラム定義（店舗別）
  const singleBatchColumns: GridColDef<DetailGridRow>[] = [
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
            onClick={() => {
              const newHidden = new Set(hiddenRowIds);
              newHidden.add(row.id);
              setHiddenRowIds(newHidden);
            }}
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
    // 店舗カラムを追加
    ...STORE_DATA.map((store) => ({
      field: `store_${store.code}`,
      headerName: `${store.code}\n${store.name}`,
      width: isMobile ? 45 : 55,
      sortable: false as const,
      disableColumnMenu: true,
      type: 'number' as const,
      renderCell: (params: { value?: number }) => {
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
      },
    })),
  ];

  /**
   * 詳細モーダル用のDataGrid行データ作成（動的グループ化対応）
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

  // 単一バッチ選択時の行データ
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
   * アクティブなフィルター値を取得（他のフィルターを考慮）
   * 各フィルターは、他のフィルター条件を適用した結果で利用可能な値のみを表示
   */
  const availableFilterValues = useMemo(() => {
    // ベースとなる行データ
    const baseRows = selectedDateRange ? dateRangeRows : singleBatchRows;

    // 商品名: 産地、規格、日付フィルターのみを適用
    const productNameRows = baseRows.filter(row => {
      if (row.rowType === 'subtotal' || row.rowType === 'grandtotal') return false;
      if (filters.origins.length > 0 && !filters.origins.includes(row.origin)) return false;
      if (filters.specifications.length > 0 && !filters.specifications.includes(row.specification)) return false;
      if (filters.dates.length > 0 && row.deliveryDate && !filters.dates.includes(row.deliveryDate)) return false;
      return true;
    });
    const productNames = Array.from(new Set(productNameRows.map(r => r.productName))).sort();

    // 産地: 商品名、規格、日付フィルターのみを適用
    const originRows = baseRows.filter(row => {
      if (row.rowType === 'subtotal' || row.rowType === 'grandtotal') return false;
      if (filters.productNames.length > 0 && !filters.productNames.includes(row.productName)) return false;
      if (filters.specifications.length > 0 && !filters.specifications.includes(row.specification)) return false;
      if (filters.dates.length > 0 && row.deliveryDate && !filters.dates.includes(row.deliveryDate)) return false;
      return true;
    });
    const origins = Array.from(new Set(originRows.map(r => r.origin))).sort();

    // 規格: 商品名、産地、日付フィルターのみを適用
    const specRows = baseRows.filter(row => {
      if (row.rowType === 'subtotal' || row.rowType === 'grandtotal') return false;
      if (filters.productNames.length > 0 && !filters.productNames.includes(row.productName)) return false;
      if (filters.origins.length > 0 && !filters.origins.includes(row.origin)) return false;
      if (filters.dates.length > 0 && row.deliveryDate && !filters.dates.includes(row.deliveryDate)) return false;
      return true;
    });
    const specifications = Array.from(new Set(specRows.map(r => r.specification))).sort();

    // 日付: 商品名、産地、規格フィルターのみを適用
    const dateRows = baseRows.filter(row => {
      if (row.rowType === 'subtotal' || row.rowType === 'grandtotal') return false;
      if (filters.productNames.length > 0 && !filters.productNames.includes(row.productName)) return false;
      if (filters.origins.length > 0 && !filters.origins.includes(row.origin)) return false;
      if (filters.specifications.length > 0 && !filters.specifications.includes(row.specification)) return false;
      return true;
    });
    const dates = Array.from(new Set(dateRows.map(r => r.deliveryDate).filter((d): d is string => !!d))).sort();

    return {
      productNames,
      origins,
      specifications,
      dates,
    };
  }, [selectedDateRange, dateRangeRows, singleBatchRows, filters]);

  // 使用するカラムと行を選択（フィルター適用 + 列の非表示適用）
  const detailColumns = useMemo(() => {
    const columns = selectedDateRange ? dateRangeColumns : singleBatchColumns;
    return columns.filter(col => !hiddenColumns.has(col.field));
  }, [selectedDateRange, dateRangeColumns, singleBatchColumns, hiddenColumns]);

  const detailRows = useMemo(() => {
    const rows = selectedDateRange ? dateRangeRows : singleBatchRows;
    return applyFilters(rows);
  }, [selectedDateRange, dateRangeRows, singleBatchRows, applyFilters]);



  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* ヘッダー */}
      <Box sx={{
        mb: 3,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2
      }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              mb: 1,
              fontSize: { xs: '1.5rem', sm: '2rem' }
            }}
          >
            配分履歴
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            過去90日間の配分履歴を表示しています
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="calendar">
              <CalendarToday fontSize="small" sx={{ mr: 0.5 }} />
              カレンダー
            </ToggleButton>
            <ToggleButton value="table">
              <ViewList fontSize="small" sx={{ mr: 0.5 }} />
              リスト
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchHistory}
            disabled={loading}
          >
            更新
          </Button>
        </Stack>
      </Box>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 読み込み中 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : batches.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: 'center' }}>
          <CalendarMonth sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            配分履歴がありません
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            配分表を生成して「履歴を保存」すると、ここに表示されます
          </Typography>
        </Paper>
      ) : viewMode === 'calendar' ? (
        /* カレンダー表示 (FullCalendar) */
        <Card>
          <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box
                sx={{
                  '& .fc': {
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  },
                  '& .fc .fc-toolbar-title': {
                    fontSize: { xs: '1rem', sm: '1.5rem' },
                    fontWeight: 600,
                  },
                  '& .fc-button': {
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  },
                  '& .fc-daygrid-day-number': {
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                  },
                  '& .fc-event': {
                    cursor: 'pointer',
                    fontSize: { xs: '0.65rem', sm: '0.75rem' },
                  },
                  '& .fc-col-header-cell': {
                    backgroundColor: 'grey.100',
                    fontWeight: 600,
                  },
                  '& .fc-daygrid-day.fc-day-sun .fc-daygrid-day-number': {
                    color: 'error.main',
                  },
                  '& .fc-daygrid-day.fc-day-sat .fc-daygrid-day-number': {
                    color: 'info.main',
                  },
                }}
              >
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  locale="ja"
                  events={calendarEvents}
                  eventClick={handleEventClick}
                  selectable={true}
                  select={handleDateSelect}
                  selectMirror={true}
                  unselectAuto={true}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: '',
                  }}
                  buttonText={{
                    today: '今日',
                    month: '月',
                    week: '週',
                    day: '日',
                  }}
                  height="auto"
                  dayMaxEvents={3}
                  moreLinkText="他"
                  eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      ) : (
        /* テーブル表示（週単位） */
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>納品日</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>帳合先</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">
                  商品数
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">
                  合計数量
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>保存日時</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                  操作
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedWeeks.map((week, weekIdx) => (
                <React.Fragment key={weekIdx}>
                  {/* 週ヘッダー */}
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      sx={{
                        backgroundColor: 'grey.100',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        py: 1.5,
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarToday fontSize="small" color="primary" />
                        <Typography variant="subtitle2" fontWeight={700}>
                          {format(week.weekStart, 'M月d日', { locale: ja })} 〜{' '}
                          {format(week.weekEnd, 'M月d日(E)', { locale: ja })}
                        </Typography>
                        <Chip
                          label={`${week.batches.length}件`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Stack>
                    </TableCell>
                  </TableRow>
                  {/* 週内のバッチ */}
                  {week.batches.map((batch) => (
                    <TableRow
                      key={batch.id}
                      hover
                      sx={{
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <TableCell>
                        <Chip
                          icon={<CalendarMonth />}
                          label={format(new Date(batch.deliveryDate), 'M月d日(E)', { locale: ja })}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {batch.suppliers.map((supplier, idx) => (
                            <Chip key={idx} label={supplier} size="small" />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {batch.productCount}品
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} color="primary">
                          {batch.totalQuantity.toLocaleString()}個
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {batch.createdAt
                            ? format(batch.createdAt, 'yyyy/MM/dd HH:mm')
                            : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => fetchBatchDetails(batch)}
                          title="詳細を表示"
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleOpenDeleteDialog(batch)}
                          title="削除"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 詳細モーダル */}
      <Dialog
        open={Boolean(selectedBatch) || Boolean(selectedDateRange)}
        onClose={handleCloseDetails}
        maxWidth="xl"
        fullWidth
        fullScreen={isFullScreen || window.innerWidth < 600}
        sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            py: { xs: 1, sm: 2 },
            px: { xs: 1.5, sm: 3 },
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600}>
              {selectedDateRange ? '配分履歴' : '配分詳細'}
            </Typography>
            {selectedBatch && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                {format(new Date(selectedBatch.deliveryDate), 'M月d日(E)', { locale: ja })}
              </Typography>
            )}
            {selectedDateRange && (
              <Typography
                variant="caption"
                color="primary.main"
                sx={{
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
                onClick={() => setDatePickerOpen(true)}
              >
                <DateRange fontSize="small" />
                {format(parseISO(selectedDateRange.start), 'M月d日(E)', { locale: ja })}〜
                {format(parseISO(selectedDateRange.end), 'M月d日(E)', { locale: ja })}
              </Typography>
            )}
          </Box>

          {/* アクションボタン */}
          <Stack direction="row" spacing={0.5}>
            {/* 非表示行の復元ボタン */}
            {hiddenRowIds.size > 0 && (
              <Chip
                label={`${hiddenRowIds.size}件非表示`}
                size="small"
                color="warning"
                onDelete={() => setHiddenRowIds(new Set())}
                deleteIcon={<Visibility fontSize="small" />}
                sx={{ height: 24, fontSize: '0.7rem' }}
              />
            )}
            <IconButton onClick={() => setIsFullScreen(!isFullScreen)} size="small">
              {isFullScreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
            </IconButton>
            {selectedDateRange && (
              <IconButton
                onClick={() => setSettingsOpen(true)}
                size="small"
                color={settingsOpen ? 'primary' : 'default'}
              >
                <Settings fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </DialogTitle>

        {/* コンパクトなグループ化コントロール（モバイル用） */}
        {selectedDateRange && !settingsOpen && (
          <Box sx={{
            px: { xs: 1, sm: 2 },
            py: 0.5,
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: 'grey.50',
          }}>
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                グループ:
              </Typography>
              <ToggleButtonGroup
                value={groupMode}
                exclusive
                onChange={(_, newMode) => newMode && setGroupMode(newMode)}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    py: { xs: 0.25, sm: 0.5 },
                    px: { xs: 0.75, sm: 1 },
                    fontSize: { xs: '0.65rem', sm: '0.75rem' },
                    minWidth: { xs: 40, sm: 60 },
                  },
                }}
              >
                <ToggleButton value="date">日付</ToggleButton>
                <ToggleButton value="product">商品</ToggleButton>
                <ToggleButton value="composite">複合</ToggleButton>
              </ToggleButtonGroup>

              {(filters.productNames.length > 0 || filters.origins.length > 0 ||
                filters.specifications.length > 0 || filters.dates.length > 0) && (
                <Chip
                  label={`フィルター ${filters.productNames.length + filters.origins.length +
                    filters.specifications.length + filters.dates.length}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
              )}

              {(hiddenRowIds.size > 0 || hiddenColumns.size > 0) && (
                <Chip
                  label={`非表示 ${hiddenRowIds.size + hiddenColumns.size}`}
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
              )}
            </Stack>
          </Box>
        )}

        <DialogContent dividers sx={{ p: 0 }}>
          {detailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : details.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">詳細データがありません</Typography>
            </Box>
          ) : (
            /* データグリッド表示 */
            <Box sx={{ height: isFullScreen ? 'calc(100vh - 250px)' : { xs: 400, sm: 500, md: 600 }, width: '100%' }}>
              <DataGrid
                rows={detailRows.filter(row => !hiddenRowIds.has(row.id))}
                columns={detailColumns}
                disableRowSelectionOnClick
                disableColumnFilter
                disableColumnSelector
                disableDensitySelector
                hideFooter
                getRowClassName={(params) => {
                  const row = params.row as DetailGridRow;
                  if (row.rowType === 'grandtotal') return 'row-grandtotal';
                  if (row.rowType === 'subtotal') return 'row-subtotal';
                  return '';
                }}
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-main': {
                    fontSize: { xs: '0.65rem', sm: '0.875rem' }, // モバイルでより小さく
                  },
                  '& .MuiDataGrid-cell': {
                    borderColor: '#e0e0e0',
                    fontSize: { xs: '0.65rem', sm: '0.875rem' }, // さらに小さく
                    padding: { xs: '2px 3px', sm: '8px' }, // パディングを削減
                    lineHeight: { xs: 1.2, sm: 1.43 }, // 行間を狭く
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: '#f5f5f5',
                    fontWeight: 600,
                    minHeight: { xs: '36px !important', sm: '56px !important' }, // ヘッダー高さを削減
                  },
                  '& .MuiDataGrid-columnHeader': {
                    padding: { xs: '2px 4px', sm: '8px' },
                  },
                  '& .MuiDataGrid-columnHeaderTitle': {
                    fontWeight: 600,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.1,
                    fontSize: { xs: '0.6rem', sm: '0.875rem' }, // ヘッダーも小さく
                  },
                  '& .MuiDataGrid-row': {
                    minHeight: { xs: '28px !important', sm: '52px !important' }, // 行高を削減
                  },
                  '& .MuiDataGrid-virtualScroller': {
                    // 横スクロールをスムーズに
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                  },
                  // 小計行のスタイル
                  '& .row-subtotal': {
                    backgroundColor: '#e3f2fd !important',
                    fontWeight: 600,
                    '& .MuiDataGrid-cell': {
                      color: '#1565c0',
                      borderTop: '2px solid #1976d2',
                      borderBottom: '1px solid #1976d2',
                      fontSize: { xs: '0.7rem', sm: '0.9rem' },
                    },
                  },
                  // 総合計行のスタイル
                  '& .row-grandtotal': {
                    backgroundColor: '#1976d2 !important',
                    fontWeight: 700,
                    '& .MuiDataGrid-cell': {
                      color: '#ffffff',
                      fontSize: { xs: '0.75rem', sm: '0.95rem' },
                      borderTop: '3px solid #0d47a1',
                      borderBottom: '3px solid #0d47a1',
                    },
                  },
                }}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDetails} variant="contained" color="primary">
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        fullWidth
        sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'error.main' }}>
          配分履歴を削除しますか？
        </DialogTitle>

        <DialogContent>
          {batchToDelete && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                以下の配分履歴を削除します。この操作は取り消せません。
              </Typography>
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>納品日:</strong>{' '}
                  {format(new Date(batchToDelete.deliveryDate), 'yyyy年M月d日(E)', {
                    locale: ja,
                  })}
                </Typography>
                <Typography variant="body2">
                  <strong>帳合先:</strong> {batchToDelete.suppliers.join(', ')}
                </Typography>
                <Typography variant="body2">
                  <strong>商品数:</strong> {batchToDelete.productCount}品
                </Typography>
                <Typography variant="body2">
                  <strong>合計数量:</strong> {batchToDelete.totalQuantity.toLocaleString()}個
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleting} variant="outlined">
            キャンセル
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <Delete />}
          >
            {deleting ? '削除中...' : '削除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 設定ドロワー（詳細設定） */}
      <Drawer
        anchor="bottom"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }} // 配分履歴モーダルより上に表示
        PaperProps={{
          sx: {
            borderRadius: '16px 16px 0 0',
            maxHeight: '90vh',
            overflow: 'auto',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* ヘッダー */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>詳細設定</Typography>
            <IconButton size="small" onClick={() => setSettingsOpen(false)}>
              <Close />
            </IconButton>
          </Stack>

          <Stack spacing={3}>
            {/* フィルター */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterList fontSize="small" />
                フィルター
              </Typography>
              <Stack spacing={2}>
                {/* 商品名フィルター */}
                <FormControl fullWidth size="small">
                  <InputLabel>商品名</InputLabel>
                  <Select
                    multiple
                    value={filters.productNames}
                    onChange={(e) => setFilters({ ...filters, productNames: e.target.value as string[] })}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                    MenuProps={{
                      sx: { zIndex: MODAL_Z_INDEX.NESTED_DIALOG + ELEMENT_OFFSET.SELECT_MENU },
                    }}
                  >
                    {availableFilterValues.productNames.map((name) => (
                      <MenuItem key={name} value={name}>
                        <Checkbox checked={filters.productNames.includes(name)} />
                        <ListItemText primary={name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* 産地フィルター */}
                <FormControl fullWidth size="small">
                  <InputLabel>産地</InputLabel>
                  <Select
                    multiple
                    value={filters.origins}
                    onChange={(e) => setFilters({ ...filters, origins: e.target.value as string[] })}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                    MenuProps={{
                      sx: { zIndex: MODAL_Z_INDEX.NESTED_DIALOG + ELEMENT_OFFSET.SELECT_MENU },
                    }}
                  >
                    {availableFilterValues.origins.map((origin) => (
                      <MenuItem key={origin} value={origin}>
                        <Checkbox checked={filters.origins.includes(origin)} />
                        <ListItemText primary={origin} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* 規格フィルター */}
                <FormControl fullWidth size="small">
                  <InputLabel>規格</InputLabel>
                  <Select
                    multiple
                    value={filters.specifications}
                    onChange={(e) => setFilters({ ...filters, specifications: e.target.value as string[] })}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                    MenuProps={{
                      sx: { zIndex: MODAL_Z_INDEX.NESTED_DIALOG + ELEMENT_OFFSET.SELECT_MENU },
                    }}
                  >
                    {availableFilterValues.specifications.map((spec) => (
                      <MenuItem key={spec} value={spec}>
                        <Checkbox checked={filters.specifications.includes(spec)} />
                        <ListItemText primary={spec} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* 日付フィルター */}
                <FormControl fullWidth size="small">
                  <InputLabel>日付</InputLabel>
                  <Select
                    multiple
                    value={filters.dates}
                    onChange={(e) => setFilters({ ...filters, dates: e.target.value as string[] })}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={format(parseISO(value), 'M/d(E)', { locale: ja })} size="small" />
                        ))}
                      </Box>
                    )}
                    MenuProps={{
                      sx: { zIndex: MODAL_Z_INDEX.NESTED_DIALOG + ELEMENT_OFFSET.SELECT_MENU },
                    }}
                  >
                    {availableFilterValues.dates.map((date) => (
                      <MenuItem key={date} value={date}>
                        <Checkbox checked={filters.dates.includes(date)} />
                        <ListItemText primary={format(parseISO(date), 'M月d日(E)', { locale: ja })} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* フィルタークリアボタン */}
                {(filters.productNames.length > 0 || filters.origins.length > 0 ||
                  filters.specifications.length > 0 || filters.dates.length > 0) && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setFilters({ productNames: [], origins: [], specifications: [], dates: [] })}
                  >
                    フィルターをクリア
                  </Button>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* 列の表示/非表示 */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                列の表示/非表示
              </Typography>

              {/* 基本項目 */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 0.5 }}>
                基本項目
              </Typography>
              <FormGroup>
                {[
                  { field: 'deliveryDate', label: '日付' },
                  { field: 'productName', label: '品名' },
                  { field: 'origin', label: '産地' },
                  { field: 'specification', label: '規格' },
                  { field: 'quantityPerPackage', label: '入数' },
                  { field: 'totalDelivery', label: '合計' },
                ].map(({ field, label }) => (
                  <FormControlLabel
                    key={field}
                    control={
                      <Checkbox
                        checked={!hiddenColumns.has(field)}
                        onChange={(e) => {
                          const newHidden = new Set(hiddenColumns);
                          if (e.target.checked) {
                            newHidden.delete(field);
                          } else {
                            newHidden.add(field);
                          }
                          setHiddenColumns(newHidden);
                        }}
                      />
                    }
                    label={label}
                  />
                ))}
              </FormGroup>

              {/* 店舗カテゴリー選択 */}
              {storeCategories.length > 0 && (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, mb: 1 }}>
                    店舗カテゴリー（一括選択）
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {storeCategories.map((category) => {
                      // カテゴリー内の店舗がすべて表示されているかチェック
                      const categoryStoreFields = category.storeIds.map(id => `store_${id}`);
                      const allVisible = categoryStoreFields.every(field => !hiddenColumns.has(field));
                      const someVisible = categoryStoreFields.some(field => !hiddenColumns.has(field));

                      return (
                        <Chip
                          key={category.id}
                          label={`${category.name} (${category.storeIds.length}店舗)`}
                          size="small"
                          color={allVisible ? 'secondary' : someVisible ? 'default' : 'default'}
                          variant={allVisible ? 'filled' : someVisible ? 'outlined' : 'outlined'}
                          onClick={() => {
                            const newHidden = new Set(hiddenColumns);
                            if (allVisible) {
                              // すべて非表示に
                              categoryStoreFields.forEach(field => newHidden.add(field));
                            } else {
                              // すべて表示に
                              categoryStoreFields.forEach(field => newHidden.delete(field));
                            }
                            setHiddenColumns(newHidden);
                          }}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              opacity: 0.8,
                            },
                            opacity: someVisible && !allVisible ? 0.7 : 1,
                          }}
                        />
                      );
                    })}
                  </Box>
                  <Divider sx={{ my: 1 }} />
                </>
              )}

              {/* 店舗選択（チップスタイル） */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                個別店舗選択
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {STORE_DATA.map((store) => {
                  const fieldName = `store_${store.code}`;
                  const isVisible = !hiddenColumns.has(fieldName);
                  return (
                    <Chip
                      key={store.code}
                      label={`${store.code} ${store.name}`}
                      size="small"
                      color={isVisible ? 'primary' : 'default'}
                      variant={isVisible ? 'filled' : 'outlined'}
                      onClick={() => {
                        const newHidden = new Set(hiddenColumns);
                        if (isVisible) {
                          newHidden.add(fieldName);
                        } else {
                          newHidden.delete(fieldName);
                        }
                        setHiddenColumns(newHidden);
                      }}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          opacity: 0.8,
                        },
                      }}
                    />
                  );
                })}
              </Box>

              {hiddenColumns.size > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ mt: 2 }}
                  onClick={() => setHiddenColumns(new Set())}
                >
                  すべて表示
                </Button>
              )}
            </Box>

            <Divider />

            {/* 非表示行の管理 */}
            {hiddenRowIds.size > 0 && (
              <Box>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Visibility />}
                  onClick={() => setHiddenRowIds(new Set())}
                >
                  非表示の行を再表示 ({hiddenRowIds.size}件)
                </Button>
              </Box>
            )}

            {/* ソート順（商品・複合グループの場合） */}
            {(groupMode === 'product' || groupMode === 'composite') && (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  並び順
                </Typography>
                <ToggleButtonGroup
                  value={sortOrder}
                  exclusive
                  onChange={(_, newOrder) => newOrder && setSortOrder(newOrder)}
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="totalDesc">
                    配分量の多い順
                  </ToggleButton>
                  <ToggleButton value="totalAsc">
                    配分量の少ない順
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}

            {/* 複合キーのカスタマイズ */}
            {groupMode === 'composite' && (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  複合キー設定
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  グループ化に使用するフィールドを選択してください（複数選択可）
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {[
                    { field: 'productName' as CompositeKeyField, label: '品名' },
                    { field: 'origin' as CompositeKeyField, label: '産地' },
                    { field: 'specification' as CompositeKeyField, label: '規格' },
                    { field: 'deliveryDate' as CompositeKeyField, label: '日付' },
                  ].map(({ field, label }) => {
                    const isSelected = compositeKeyFields.includes(field);
                    const position = compositeKeyFields.indexOf(field) + 1;
                    return (
                      <Chip
                        key={field}
                        label={isSelected ? `${position}. ${label}` : label}
                        size="small"
                        color={isSelected ? 'primary' : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        onClick={() => {
                          if (isSelected) {
                            // 削除（最低1つは残す）
                            if (compositeKeyFields.length > 1) {
                              setCompositeKeyFields(compositeKeyFields.filter(f => f !== field));
                            }
                          } else {
                            // 追加
                            setCompositeKeyFields([...compositeKeyFields, field]);
                          }
                        }}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 0.8,
                          },
                        }}
                      />
                    );
                  })}
                </Box>

                <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 1 }}>
                  選択順がグループ化の階層になります（番号順）
                </Typography>

                {compositeKeyFields.length > 0 && (
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ mt: 1 }}
                    onClick={() => setCompositeKeyFields(['productName', 'deliveryDate'])}
                  >
                    デフォルトに戻す
                  </Button>
                )}
              </Box>
            )}
          </Stack>

          {/* 閉じるボタン */}
          <Button
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 3 }}
            onClick={() => setSettingsOpen(false)}
          >
            閉じる
          </Button>
        </Box>
      </Drawer>

      {/* 日付範囲選択ドロワー */}
      <Drawer
        anchor="bottom"
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }}
        PaperProps={{
          sx: {
            borderRadius: '16px 16px 0 0',
            maxHeight: '80vh',
            overflow: 'auto',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* ヘッダー */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>期間選択</Typography>
            <IconButton size="small" onClick={() => setDatePickerOpen(false)}>
              <Close />
            </IconButton>
          </Stack>

          {/* 利用可能な日付リスト（チェックボックス形式） */}
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            日付を選択（複数選択可）
          </Typography>

          <FormGroup sx={{ maxHeight: '50vh', overflow: 'auto' }}>
            {batches
              .map(b => b.deliveryDate)
              .filter((date, index, self) => self.indexOf(date) === index)
              .sort()
              .map((date) => {
                // 範囲内のすべての日付をチェック状態にする
                const isInRange = tempDateRange &&
                  date >= tempDateRange.start &&
                  date <= tempDateRange.end;
                const isEdge = tempDateRange &&
                  (date === tempDateRange.start || date === tempDateRange.end);

                return (
                  <FormControlLabel
                    key={date}
                    control={
                      <Checkbox
                        checked={!!isInRange}
                        indeterminate={!!(isInRange && !isEdge)} // 中間の日付は indeterminate 状態
                        onChange={() => {
                          if (!tempDateRange) {
                            // 初回選択：開始日として設定
                            setTempDateRange({ start: date, end: date });
                          } else {
                            // 範囲の拡張または縮小
                            const currentStart = tempDateRange.start;
                            const currentEnd = tempDateRange.end;

                            if (date < currentStart) {
                              // 開始日を前に拡張
                              setTempDateRange({ start: date, end: currentEnd });
                            } else if (date > currentEnd) {
                              // 終了日を後ろに拡張
                              setTempDateRange({ start: currentStart, end: date });
                            } else if (date === currentStart && currentStart === currentEnd) {
                              // 単一選択をリセット
                              setTempDateRange(null);
                            } else if (date === currentStart) {
                              // 開始日を縮小
                              const sortedDates = batches
                                .map(b => b.deliveryDate)
                                .filter((d, i, self) => self.indexOf(d) === i)
                                .sort();
                              const currentIndex = sortedDates.indexOf(date);
                              const nextDate = sortedDates[currentIndex + 1];
                              if (nextDate && nextDate <= currentEnd) {
                                setTempDateRange({ start: nextDate, end: currentEnd });
                              }
                            } else if (date === currentEnd) {
                              // 終了日を縮小
                              const sortedDates = batches
                                .map(b => b.deliveryDate)
                                .filter((d, i, self) => self.indexOf(d) === i)
                                .sort();
                              const currentIndex = sortedDates.indexOf(date);
                              const prevDate = sortedDates[currentIndex - 1];
                              if (prevDate && prevDate >= currentStart) {
                                setTempDateRange({ start: currentStart, end: prevDate });
                              }
                            } else {
                              // 範囲内の日付をクリック：新しい範囲を開始
                              setTempDateRange({ start: date, end: date });
                            }
                          }
                        }}
                      />
                    }
                    label={format(parseISO(date), 'yyyy年M月d日(E)', { locale: ja })}
                    sx={{
                      backgroundColor: isEdge ? 'primary.50' : isInRange ? 'action.hover' : 'transparent',
                      borderRadius: 1,
                      mx: -1,
                      px: 1,
                    }}
                  />
                );
              })}
          </FormGroup>

          {/* 選択された範囲の表示 */}
          {tempDateRange && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'primary.50', borderRadius: 1 }}>
              <Typography variant="body2" color="primary.main">
                選択範囲: {format(parseISO(tempDateRange.start), 'M月d日(E)', { locale: ja })}
                {tempDateRange.start !== tempDateRange.end && (
                  <> 〜 {format(parseISO(tempDateRange.end), 'M月d日(E)', { locale: ja })}</>
                )}
              </Typography>
            </Box>
          )}

          {/* 適用ボタン */}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              onClick={() => {
                setTempDateRange(null);
                setDatePickerOpen(false);
              }}
            >
              キャンセル
            </Button>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              disabled={!tempDateRange}
              onClick={() => {
                if (tempDateRange) {
                  handleDateSelect({
                    start: parseISO(tempDateRange.start),
                    end: addMonths(parseISO(tempDateRange.end), 0), // Use actual end date
                    allDay: true,
                  } as any);
                  setDatePickerOpen(false);
                  setTempDateRange(null);
                }
              }}
            >
              適用
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </Box>
  );
};
