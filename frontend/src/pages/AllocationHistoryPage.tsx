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
  Tabs,
  Tab,
} from '@mui/material';
import {
  Visibility,
  Refresh,
  CalendarMonth,
  Delete,
  ViewList,
  CalendarToday,
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
import { Pivot as WebDataRocksPivot } from '@webdatarocks/react-webdatarocks';
import '@webdatarocks/webdatarocks/webdatarocks.min.css';
import { useAuthContext } from '@/context/AuthContext';
import { getFirebaseFirestore } from '@/services/firebase/config';
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';
import { STORE_DATA } from '@/utils/constants';
import type { AllocationBatch, AllocationDetail } from '@/types/allocationHistory';

/**
 * グリッド行データの型（詳細モーダル用）
 */
interface DetailGridRow {
  id: string;
  productName: string;
  origin: string;
  specification: string;
  totalDelivery: number;
  deliveryDate?: string; // 日付範囲選択時に使用
  [key: string]: string | number | undefined;
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

  // 表示モード
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');

  // 詳細モーダル
  const [selectedBatch, setSelectedBatch] = useState<AllocationBatch | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: string; end: string } | null>(null);
  const [details, setDetails] = useState<AllocationDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<'productName' | 'totalDesc' | 'totalAsc'>('totalDesc');
  const [detailViewTab, setDetailViewTab] = useState<'grid' | 'pivot'>('grid');

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
      // 各バッチから帳合先名を取得
      const suppliers = batch.suppliers.join(', ');
      const productCount = batch.productCount || 0;

      events.push({
        id: batch.id || '',
        title: suppliers,
        date: batch.deliveryDate,
        extendedProps: {
          batch,
          productCount,
          totalQuantity: batch.totalQuantity,
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
   * 初回読み込み
   */
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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
   * 詳細モーダル用のDataGridカラム定義
   */
  const isMobile = window.innerWidth < 600;

  // 日付範囲選択時のカラム定義
  const dateRangeColumns: GridColDef<DetailGridRow>[] = [
    {
      field: 'deliveryDate',
      headerName: '日付',
      width: isMobile ? 100 : 120,
      sortable: true,
      disableColumnMenu: true,
      renderCell: (params) => {
        const dateStr = params.value as string;
        if (!dateStr) return '-';
        if (dateStr === '合計') {
          return (
            <Box sx={{ fontWeight: 700, color: 'primary.main' }}>
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
      width: isMobile ? 80 : 100,
      sortable: true,
      disableColumnMenu: true,
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
      width: isMobile ? 80 : 100,
      sortable: false,
      disableColumnMenu: true,
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
   * 詳細モーダル用のDataGrid行データ作成
   */
  // 日付範囲選択時の行データ（商品ごとにグループ化）
  const dateRangeRows: DetailGridRow[] = useMemo(() => {
    if (!selectedDateRange) return [];

    const rows: DetailGridRow[] = [];

    // 商品ごとにグループ化（productName + origin + specification）
    const productGroups = new Map<string, AllocationDetail[]>();

    details.forEach(detail => {
      const key = `${detail.productName}|${detail.origin}|${detail.specification}`;
      if (!productGroups.has(key)) {
        productGroups.set(key, []);
      }
      productGroups.get(key)!.push(detail);
    });

    console.log('📦 Product groups:', productGroups.size);

    // 選択範囲の全ての日付を生成
    const allDates = eachDayOfInterval({
      start: parseISO(selectedDateRange.start),
      end: parseISO(selectedDateRange.end),
    }).map(date => format(date, 'yyyy-MM-dd'));

    // 商品グループと合計値のペアを作成
    const groupsWithTotals = Array.from(productGroups.entries()).map(([key, groupDetails]) => {
      const grandTotal = groupDetails.reduce((sum, d) => sum + d.totalDelivery, 0);
      return { key, groupDetails, grandTotal };
    });

    // ソート順に応じて商品グループをソート
    if (sortOrder === 'productName') {
      groupsWithTotals.sort((a, b) => {
        const [nameA] = a.key.split('|');
        const [nameB] = b.key.split('|');
        return nameA.localeCompare(nameB, 'ja');
      });
    } else if (sortOrder === 'totalDesc') {
      groupsWithTotals.sort((a, b) => b.grandTotal - a.grandTotal);
    } else if (sortOrder === 'totalAsc') {
      groupsWithTotals.sort((a, b) => a.grandTotal - b.grandTotal);
    }

    // 各商品グループごとに行を生成
    groupsWithTotals.forEach(({ key, groupDetails }) => {
      const [productName, origin, specification] = key.split('|');

      // 合計用の配列を初期化
      const totalsByStore: number[] = Array(STORE_DATA.length).fill(0);
      let grandTotal = 0;

      // 各日付の行を生成
      allDates.forEach(dateStr => {
        const detailForDate = groupDetails.find(d => (d as any).deliveryDate === dateStr);

        if (detailForDate) {
          // データがある日付
          const row: DetailGridRow = {
            id: `${key}-${dateStr}`,
            productName,
            origin,
            specification,
            totalDelivery: detailForDate.totalDelivery,
            deliveryDate: dateStr,
          };

          // 各店舗の配分数量を追加
          detailForDate.storeAllocations.forEach((qty, storeIdx) => {
            if (storeIdx < STORE_DATA.length) {
              row[`store_${STORE_DATA[storeIdx].code}`] = qty;
              totalsByStore[storeIdx] += qty;
            }
          });

          grandTotal += detailForDate.totalDelivery;
          rows.push(row);
        }
      });

      // 合計行を追加
      const totalRow: DetailGridRow = {
        id: `${key}-total`,
        productName,
        origin,
        specification,
        totalDelivery: grandTotal,
        deliveryDate: '合計',
      };

      // 各店舗の合計を追加
      totalsByStore.forEach((total, storeIdx) => {
        if (storeIdx < STORE_DATA.length) {
          totalRow[`store_${STORE_DATA[storeIdx].code}`] = total;
        }
      });

      rows.push(totalRow);
    });

    // データがない日付のみの表示（全商品にデータがない日付）
    allDates.forEach(dateStr => {
      const hasData = details.some(d => (d as any).deliveryDate === dateStr);
      if (!hasData) {
        rows.push({
          id: `empty-${dateStr}`,
          productName: '-',
          origin: '-',
          specification: '-',
          totalDelivery: 0,
          deliveryDate: dateStr,
        });
      }
    });

    console.log('📋 Generated rows:', rows.length);
    return rows;
  }, [selectedDateRange, details, sortOrder]);

  // 単一バッチ選択時の行データ
  const singleBatchRows: DetailGridRow[] = useMemo(() => {
    if (selectedDateRange) return [];

    return details.map((detail, idx) => {
      const row: DetailGridRow = {
        id: detail.id || `row-${idx}`,
        productName: detail.productName,
        origin: detail.origin,
        specification: detail.specification,
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

  // 使用するカラムと行を選択
  const detailColumns = selectedDateRange ? dateRangeColumns : singleBatchColumns;
  const detailRows = selectedDateRange ? dateRangeRows : singleBatchRows;

  /**
   * WebDataRocks用のピボットデータ（フラット形式）
   */
  const pivotData = useMemo(() => {
    if (!selectedDateRange) return [];

    const flatData: any[] = [];

    details.forEach(detail => {
      const deliveryDate = (detail as any).deliveryDate || '';

      // 各店舗ごとに行を作成
      detail.storeAllocations.forEach((quantity, storeIdx) => {
        if (storeIdx < STORE_DATA.length && quantity > 0) {
          flatData.push({
            '日付': deliveryDate ? format(parseISO(deliveryDate), 'yyyy/MM/dd(E)', { locale: ja }) : '-',
            '商品名': detail.productName,
            '産地': detail.origin,
            '規格': detail.specification,
            '店舗': `${STORE_DATA[storeIdx].code} ${STORE_DATA[storeIdx].name}`,
            '店舗コード': STORE_DATA[storeIdx].code,
            '数量': quantity,
          });
        }
      });
    });

    return flatData;
  }, [selectedDateRange, details]);

  /**
   * WebDataRocks用のreportオブジェクト（メモ化して無限レンダリングを防ぐ）
   */
  const pivotReport = useMemo(() => ({
    dataSource: {
      data: pivotData,
    },
    slice: {
      rows: [
        { uniqueName: '商品名' },
        { uniqueName: '産地' },
        { uniqueName: '規格' },
      ],
      columns: [
        { uniqueName: '店舗' },
      ],
      measures: [
        {
          uniqueName: '数量',
          aggregation: 'sum',
        },
      ],
    },
    options: {
      grid: {
        type: 'flat',
        showTotals: true,
        showGrandTotals: 'on',
      },
    },
  }), [pivotData]);

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
        fullScreen={window.innerWidth < 600}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {selectedDateRange ? '複数日付の配分履歴' : '配分履歴詳細'}
          {selectedBatch && (
            <Typography variant="subtitle2" color="text.secondary">
              納品日: {format(new Date(selectedBatch.deliveryDate), 'yyyy年M月d日(E)', { locale: ja })}
            </Typography>
          )}
          {selectedDateRange && (
            <Typography variant="subtitle2" color="text.secondary">
              期間: {format(parseISO(selectedDateRange.start), 'yyyy年M月d日(E)', { locale: ja })} 〜{' '}
              {format(parseISO(selectedDateRange.end), 'yyyy年M月d日(E)', { locale: ja })}
            </Typography>
          )}
        </DialogTitle>

        {/* タブ選択（日付範囲選択時のみ） */}
        {selectedDateRange && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={detailViewTab}
              onChange={(_, newTab) => setDetailViewTab(newTab)}
              aria-label="詳細表示タブ"
            >
              <Tab label="データグリッド" value="grid" />
              <Tab label="ピボット分析" value="pivot" />
            </Tabs>
          </Box>
        )}

        {/* ソート選択（データグリッドタブのみ） */}
        {selectedDateRange && detailViewTab === 'grid' && (
          <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" fontWeight={600} sx={{ mr: 1 }}>
                表示順:
              </Typography>
              <ToggleButtonGroup
                value={sortOrder}
                exclusive
                onChange={(_, newOrder) => newOrder && setSortOrder(newOrder)}
                size="small"
              >
                <ToggleButton value="totalDesc">
                  配分量の多い順
                </ToggleButton>
                <ToggleButton value="totalAsc">
                  配分量の少ない順
                </ToggleButton>
                <ToggleButton value="productName">
                  商品名順
                </ToggleButton>
              </ToggleButtonGroup>
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
          ) : selectedDateRange && detailViewTab === 'pivot' ? (
            /* ピボットテーブル表示 */
            <Box sx={{ height: { xs: 400, sm: 500, md: 600 }, width: '100%', p: 2 }}>
              {pivotData.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color="text.secondary">ピボット分析用のデータがありません</Typography>
                </Box>
              ) : (
                <WebDataRocksPivot
                  toolbar={true}
                  width="100%"
                  height={window.innerWidth < 600 ? 400 : window.innerWidth < 960 ? 500 : 600}
                  report={pivotReport}
                />
              )}
            </Box>
          ) : (
            /* データグリッド表示 */
            <Box sx={{ height: { xs: 400, sm: 500, md: 600 }, width: '100%' }}>
              <DataGrid
                rows={detailRows}
                columns={detailColumns}
                disableRowSelectionOnClick
                disableColumnFilter
                disableColumnSelector
                disableDensitySelector
                hideFooter
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-cell': {
                    borderColor: '#e0e0e0',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    padding: { xs: '4px', sm: '8px' },
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: '#f5f5f5',
                    fontWeight: 600,
                  },
                  '& .MuiDataGrid-columnHeaderTitle': {
                    fontWeight: 600,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.2,
                    fontSize: { xs: '0.7rem', sm: '0.875rem' },
                  },
                }}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDetails}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        fullWidth
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
          <Button onClick={handleCloseDeleteDialog} disabled={deleting}>
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
    </Box>
  );
};
