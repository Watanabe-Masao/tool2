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
} from '@mui/material';
import {
  Visibility,
  Refresh,
  CalendarMonth,
  Delete,
  ViewList,
  CalendarToday,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';
import {
  format,
  subDays,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
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
  [key: string]: string | number;
}

/**
 * 曜日ラベル
 */
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * カレンダー日付セルのProps
 */
interface CalendarDayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  suppliers?: string[];
  batchCount?: number;
  onClick: (date: Date) => void;
}

/**
 * カレンダー日付セル（日めくりカレンダー風）
 */
const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  date,
  isCurrentMonth,
  isSelected,
  suppliers = [],
  batchCount = 0,
  onClick,
}) => {
  const day = date.getDate();
  const dayOfWeek = getDay(date);
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;
  const hasData = suppliers.length > 0;

  return (
    <Paper
      elevation={isSelected ? 4 : hasData ? 2 : 0}
      sx={{
        p: { xs: 0.5, sm: 1 },
        minHeight: { xs: 70, sm: 90, md: 100 },
        cursor: hasData ? 'pointer' : 'default',
        backgroundColor: isSelected
          ? 'primary.light'
          : hasData
          ? 'background.paper'
          : 'grey.50',
        opacity: isCurrentMonth ? 1 : 0.3,
        border: isSelected ? '2px solid' : '1px solid',
        borderColor: isSelected ? 'primary.main' : hasData ? 'primary.light' : 'divider',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': hasData ? {
          backgroundColor: isSelected ? 'primary.light' : 'grey.100',
          elevation: 3,
          borderColor: 'primary.main',
        } : {},
      }}
      onClick={() => hasData && onClick(date)}
    >
      {/* 日付ヘッダー（日めくりカレンダー風） */}
      <Box
        sx={{
          backgroundColor: hasData
            ? isSelected
              ? 'primary.main'
              : isSunday
              ? 'error.main'
              : isSaturday
              ? 'info.main'
              : 'primary.main'
            : 'grey.300',
          color: 'white',
          px: 1,
          py: 0.25,
          borderRadius: '4px 4px 0 0',
          textAlign: 'center',
          mb: 0.5,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontSize: { xs: '0.875rem', sm: '1rem' },
          }}
        >
          {day}
        </Typography>
      </Box>

      {/* 帳合先名表示 */}
      {hasData && (
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          {suppliers.map((supplier, idx) => (
            <Chip
              key={idx}
              label={supplier}
              size="small"
              sx={{
                fontSize: { xs: '0.6rem', sm: '0.7rem' },
                height: { xs: 18, sm: 20 },
                backgroundColor: isSelected ? 'primary.light' : 'grey.200',
                fontWeight: 500,
                '& .MuiChip-label': {
                  px: 0.5,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                },
              }}
            />
          ))}
          {batchCount > suppliers.length && (
            <Typography
              variant="caption"
              sx={{
                fontSize: { xs: '0.55rem', sm: '0.6rem' },
                color: 'text.secondary',
                textAlign: 'center',
                mt: 0.25,
              }}
            >
              他{batchCount - suppliers.length}件
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

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

  // カレンダー月
  const [currentMonth, setCurrentMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  // 詳細モーダル
  const [selectedBatch, setSelectedBatch] = useState<AllocationBatch | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [details, setDetails] = useState<AllocationDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // 削除確認ダイアログ
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<AllocationBatch | null>(null);
  const [deleting, setDeleting] = useState(false);

  /**
   * 日付ごとにバッチをグループ化
   */
  const batchesByDate = useMemo(() => {
    const grouped = batches.reduce((acc, batch) => {
      const dateKey = batch.deliveryDate;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(batch);
      return acc;
    }, {} as Record<string, AllocationBatch[]>);

    console.log('🗂️ batchesByDate が再計算されました:', Object.keys(grouped).length, '日分');
    console.log('🗂️ 各日付のバッチ数:', grouped);

    return grouped;
  }, [batches]);

  /**
   * カレンダー表示用の日付を生成
   */
  const calendarDays = useMemo(() => {
    const monthDate = parseISO(currentMonth + '-01');
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    // 月の日付を取得
    const days = eachDayOfInterval({ start, end });

    // 月の最初の曜日を取得（0=日曜日）
    const startDayOfWeek = getDay(start);

    // 前月の日付を追加（カレンダーグリッドを埋める）
    const prevMonthDays: Date[] = [];
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(start);
      date.setDate(date.getDate() - (i + 1));
      prevMonthDays.push(date);
    }

    // 次月の日付を追加（6行のグリッドにする）
    const totalDays = prevMonthDays.length + days.length;
    const remainingDays = totalDays % 7 === 0 ? 0 : 7 - (totalDays % 7);
    const nextMonthDays: Date[] = [];
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(end);
      date.setDate(date.getDate() + i);
      nextMonthDays.push(date);
    }

    return [...prevMonthDays, ...days, ...nextMonthDays];
  }, [currentMonth]);

  /**
   * 日付別サマリーをMapに変換（帳合先名を含む）
   */
  const summaryMap = useMemo(() => {
    const map = new Map<string, { batchCount: number; suppliers: string[] }>();
    Object.entries(batchesByDate).forEach(([dateKey, dayBatches]) => {
      // 各バッチから帳合先名を収集（重複を除外し、最大3件まで表示）
      const supplierSet = new Set<string>();
      dayBatches.forEach((batch) => {
        batch.suppliers.forEach((supplier) => supplierSet.add(supplier));
      });
      const suppliers = Array.from(supplierSet).slice(0, 3);

      map.set(dateKey, {
        batchCount: dayBatches.length,
        suppliers,
      });
    });
    return map;
  }, [batchesByDate]);

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
    setSelectedDates([]);
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
   * 複数日付の詳細を取得して集計
   */
  const fetchMultipleDateDetails = useCallback(async (dates: Date[]) => {
    console.log('🔵 fetchMultipleDateDetails が呼ばれました');
    console.log('📅 選択された日付オブジェクト:', dates);
    console.log('📊 現在のbatchesByDateのキー:', Object.keys(batchesByDate));

    if (dates.length === 0 || !user?.uid) {
      console.log('⚠️ 日付が0件またはユーザーIDなし');
      return;
    }

    setSelectedDates(dates);
    setSelectedBatch(null);
    setDetailsLoading(true);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      // 選択された日付のすべてのバッチの詳細を取得
      const allDetails: AllocationDetail[] = [];

      console.log('✅ 選択された日付:', dates.length, '日分');

      for (const date of dates) {
        const dateKey = format(date, 'yyyy-MM-dd');
        const dayBatches = batchesByDate[dateKey] || [];

        console.log(`📆 ${dateKey}: ${dayBatches.length}件のバッチ (日付オブジェクト: ${date})`);

        for (const batch of dayBatches) {
          if (batch.id) {
            console.log(`バッチID: ${batch.id} の詳細を取得中...`);
            const details = await firestoreService.getAllocationDetails(user.uid, batch.id);
            console.log(`取得した商品数: ${details.length}品`);
            allDetails.push(...details);
          }
        }
      }

      console.log('合計商品数（集計前）:', allDetails.length);

      // 同一商品（商品名、規格、入数が同じ）をグループ化して集計
      const groupedDetailsMap = new Map<string, AllocationDetail>();

      for (const detail of allDetails) {
        // グループ化キー: 商品名 + 産地 + 規格
        const key = `${detail.productName}|${detail.origin}|${detail.specification}`;

        if (groupedDetailsMap.has(key)) {
          // 既存のグループに加算
          const existing = groupedDetailsMap.get(key)!;
          existing.totalDelivery += detail.totalDelivery;

          // 店舗ごとの配分を加算
          detail.storeAllocations.forEach((qty, idx) => {
            existing.storeAllocations[idx] = (existing.storeAllocations[idx] || 0) + qty;
          });
        } else {
          // 新しいグループを作成（storeAllocationsを複製）
          groupedDetailsMap.set(key, {
            ...detail,
            storeAllocations: [...detail.storeAllocations],
          });
        }
      }

      const groupedDetails = Array.from(groupedDetailsMap.values());
      console.log('グループ化後の商品数:', groupedDetails.length);

      setDetails(groupedDetails);
    } catch (err) {
      console.error('Failed to fetch multiple date details:', err);
      setError(`詳細の取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setDetailsLoading(false);
    }
  }, [user?.uid, batchesByDate]);

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
    setSelectedDates([]);
    setDetails([]);
  };

  /**
   * 月を変更
   */
  const handlePrevMonth = () => {
    const prevMonth = subMonths(parseISO(currentMonth + '-01'), 1);
    setCurrentMonth(format(prevMonth, 'yyyy-MM'));
    setSelectedDates([]);
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(parseISO(currentMonth + '-01'), 1);
    setCurrentMonth(format(nextMonth, 'yyyy-MM'));
    setSelectedDates([]);
  };

  /**
   * 日付をクリック（複数選択対応）
   */
  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // データがない日付はスキップ
    if (!summaryMap.has(dateStr)) return;

    setSelectedDates((prev) => {
      const index = prev.findIndex((d) => format(d, 'yyyy-MM-dd') === dateStr);
      if (index >= 0) {
        // 既に選択されている場合は解除
        return prev.filter((_, i) => i !== index);
      } else {
        // 選択されていない場合は追加
        return [...prev, date];
      }
    });
  };

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
  const detailColumns: GridColDef<DetailGridRow>[] = [
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
  const detailRows: DetailGridRow[] = details.map((detail, idx) => {
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
        /* カレンダー表示 */
        <Card>
          <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            {/* 月ナビゲーション */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <IconButton onClick={handlePrevMonth} size="small">
                <ChevronLeft />
              </IconButton>
              <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {format(parseISO(currentMonth + '-01'), 'yyyy年M月', { locale: ja })}
              </Typography>
              <IconButton onClick={handleNextMonth} size="small">
                <ChevronRight />
              </IconButton>
            </Box>

            {/* 選択ボタン */}
            {selectedDates.length > 0 && (
              <Box sx={{ mb: 2, textAlign: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => fetchMultipleDateDetails(selectedDates)}
                  sx={{ mb: 1 }}
                >
                  詳細を表示 ({selectedDates.length}日分)
                </Button>
                <Typography variant="caption" display="block" color="text.secondary">
                  日付をクリックして選択 • 複数選択可能
                </Typography>
              </Box>
            )}

            {/* 曜日ヘッダー */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: { xs: 0.5, sm: 1 },
                mb: 1,
                backgroundColor: 'grey.100',
                borderRadius: 1,
                p: 1,
              }}
            >
              {WEEKDAY_LABELS.map((label, index) => (
                <Box
                  key={index}
                  sx={{
                    textAlign: 'center',
                    py: 0.5,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      color:
                        index === 0
                          ? 'error.main'
                          : index === 6
                          ? 'info.main'
                          : 'text.primary',
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* カレンダーグリッド */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: { xs: 0.5, sm: 1 },
                  border: '2px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: { xs: 0.5, sm: 1 },
                  backgroundColor: 'background.paper',
                }}
              >
                {calendarDays.map((date, index) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isCurrentMonth = format(date, 'yyyy-MM') === currentMonth;
                  const summary = summaryMap.get(dateStr);
                  const isSelected = selectedDates.some((d) => format(d, 'yyyy-MM-dd') === dateStr);

                  return (
                    <CalendarDayCell
                      key={index}
                      date={date}
                      isCurrentMonth={isCurrentMonth}
                      isSelected={isSelected}
                      suppliers={summary?.suppliers}
                      batchCount={summary?.batchCount}
                      onClick={handleDateClick}
                    />
                  );
                })}
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
        open={Boolean(selectedBatch) || selectedDates.length > 0}
        onClose={handleCloseDetails}
        maxWidth="xl"
        fullWidth
        fullScreen={window.innerWidth < 600}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          配分履歴詳細
          {selectedBatch ? (
            <Typography variant="subtitle2" color="text.secondary">
              納品日: {format(new Date(selectedBatch.deliveryDate), 'yyyy年M月d日(E)', { locale: ja })}
            </Typography>
          ) : selectedDates.length > 0 ? (
            <Typography variant="subtitle2" color="text.secondary">
              期間: {selectedDates.length}日分を集計表示（同一商品をまとめて表示）
            </Typography>
          ) : null}
        </DialogTitle>

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
