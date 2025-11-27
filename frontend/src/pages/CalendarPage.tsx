import React, { useMemo, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  IconButton,
  Grid,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CalendarMonth,
  ChevronLeft,
  ChevronRight,
  Close,
} from '@mui/icons-material';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAllocationHistory } from '@/hooks/useAllocationHistory';
import { STORE_DATA } from '@/utils/constants';
import type { AllocationBatch, AllocationHistoryView } from '@/types/allocationHistory';

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
  batchCount?: number;
  totalProducts?: number;
  onClick: (date: string) => void;
}

/**
 * カレンダー日付セル
 */
const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  date,
  isCurrentMonth,
  isSelected,
  batchCount = 0,
  totalProducts = 0,
  onClick,
}) => {
  const day = date.getDate();
  const dayOfWeek = getDay(date);
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;
  const hasData = batchCount > 0;

  return (
    <Paper
      elevation={isSelected ? 4 : hasData ? 2 : 0}
      sx={{
        p: 1,
        minHeight: 80,
        cursor: 'pointer',
        backgroundColor: isSelected
          ? 'primary.light'
          : hasData
          ? 'action.hover'
          : 'background.paper',
        opacity: isCurrentMonth ? 1 : 0.4,
        border: isSelected ? '2px solid' : '1px solid',
        borderColor: isSelected ? 'primary.main' : 'divider',
        transition: 'all 0.2s',
        '&:hover': {
          backgroundColor: isSelected ? 'primary.light' : 'action.selected',
          elevation: 2,
        },
      }}
      onClick={() => onClick(format(date, 'yyyy-MM-dd'))}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: isSelected ? 700 : 400,
          color: isSelected
            ? 'primary.contrastText'
            : isSunday
            ? 'error.main'
            : isSaturday
            ? 'info.main'
            : 'text.primary',
        }}
      >
        {day}
      </Typography>

      {hasData && (
        <Box sx={{ mt: 0.5 }}>
          <Chip
            label={`${batchCount}件`}
            size="small"
            color={isSelected ? 'primary' : 'default'}
            sx={{ fontSize: '0.65rem', height: 18 }}
          />
          {totalProducts > 0 && (
            <Typography
              variant="caption"
              display="block"
              color={isSelected ? 'primary.contrastText' : 'text.secondary'}
              sx={{ fontSize: '0.6rem', mt: 0.25 }}
            >
              {totalProducts}商品
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

/**
 * 配分詳細パネル
 */
interface AllocationDetailPanelProps {
  selectedDate: string | null;
  batches: AllocationBatch[];
  selectedBatchView: AllocationHistoryView | null;
  loading: boolean;
  onSelectBatch: (batchId: string) => void;
  onClose: () => void;
}

const AllocationDetailPanel: React.FC<AllocationDetailPanelProps> = ({
  selectedDate,
  batches,
  selectedBatchView,
  loading,
  onSelectBatch,
  onClose,
}) => {
  if (!selectedDate) return null;

  const formattedDate = format(parseISO(selectedDate), 'M月d日(E)', { locale: ja });

  return (
    <Card elevation={3} sx={{ height: '100%' }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* ヘッダー */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {formattedDate}
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : batches.length === 0 ? (
          <Alert severity="info">この日の配分履歴はありません</Alert>
        ) : selectedBatchView ? (
          /* バッチ詳細表示 */
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Box sx={{ mb: 2 }}>
              <Chip
                label={`${selectedBatchView.batch.suppliers.join(', ')}`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                作成: {selectedBatchView.batch.createdAt && format(selectedBatchView.batch.createdAt, 'HH:mm')}
              </Typography>
            </Box>

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              商品一覧 ({selectedBatchView.details.length}件)
            </Typography>

            <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
              {selectedBatchView.details.map((detail, index) => (
                <ListItem key={detail.id || index} disablePadding sx={{ mb: 1 }}>
                  <Paper
                    variant="outlined"
                    sx={{ width: '100%', p: 1 }}
                  >
                    <Typography variant="body2" fontWeight={500}>
                      {detail.productName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {detail.origin} {detail.specification}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption">
                        総納品: {detail.totalDelivery}
                      </Typography>
                      <Typography variant="caption" color="primary">
                        配分: {detail.storeAllocations.reduce((a, b) => a + b, 0)}
                      </Typography>
                    </Box>

                    {/* 店舗別配分（折りたたみ可能にしても良い） */}
                    <Box
                      sx={{
                        mt: 1,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                      }}
                    >
                      {detail.storeAllocations.map((qty, storeIndex) => {
                        if (qty === 0) return null;
                        const store = STORE_DATA[storeIndex];
                        return (
                          <Chip
                            key={storeIndex}
                            label={`${store?.code || storeIndex}: ${qty}`}
                            size="small"
                            sx={{
                              fontSize: '0.6rem',
                              height: 18,
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Paper>
                </ListItem>
              ))}
            </List>
          </Box>
        ) : (
          /* バッチリスト */
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              配分履歴 ({batches.length}件)
            </Typography>
            <List>
              {batches.map((batch) => (
                <ListItem key={batch.id} disablePadding>
                  <ListItemButton onClick={() => batch.id && onSelectBatch(batch.id)}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">
                            {batch.suppliers.join(', ')}
                          </Typography>
                          <Typography variant="body2" color="primary">
                            {batch.productCount}商品
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {batch.createdAt && format(batch.createdAt, 'HH:mm')} 作成 / 合計{batch.totalQuantity}個
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * カレンダービューページ
 *
 * 過去の配分履歴をカレンダー形式で表示します。
 */
export const CalendarPage: React.FC = () => {
  const {
    daySummaries,
    selectedDateBatches,
    selectedBatchView,
    loading,
    currentMonth,
    setCurrentMonth,
    selectDate,
    selectBatch,
    clearSelection,
  } = useAllocationHistory();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 現在の月の日付を生成
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

  // 日付別サマリーをMapに変換
  const summaryMap = useMemo(() => {
    const map = new Map<string, { batchCount: number; totalProducts: number }>();
    daySummaries.forEach((summary) => {
      map.set(summary.date, {
        batchCount: summary.batchCount,
        totalProducts: summary.totalProducts,
      });
    });
    return map;
  }, [daySummaries]);

  // 月を変更
  const handlePrevMonth = () => {
    const prevMonth = subMonths(parseISO(currentMonth + '-01'), 1);
    setCurrentMonth(format(prevMonth, 'yyyy-MM'));
    clearSelection();
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(parseISO(currentMonth + '-01'), 1);
    setCurrentMonth(format(nextMonth, 'yyyy-MM'));
    clearSelection();
    setSelectedDate(null);
  };

  // 日付をクリック
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    selectDate(date);
  };

  // パネルを閉じる
  const handleClosePanel = () => {
    setSelectedDate(null);
    clearSelection();
  };

  // 現在の月のラベル
  const monthLabel = format(parseISO(currentMonth + '-01'), 'yyyy年M月', { locale: ja });

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* ページヘッダー */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <CalendarMonth sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            配分履歴カレンダー
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* カレンダー */}
          <Grid item xs={12} md={selectedDate ? 8 : 12}>
            <Card>
              <CardContent>
                {/* 月ナビゲーション */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                  }}
                >
                  <IconButton onClick={handlePrevMonth}>
                    <ChevronLeft />
                  </IconButton>
                  <Typography variant="h5" fontWeight={600}>
                    {monthLabel}
                  </Typography>
                  <IconButton onClick={handleNextMonth}>
                    <ChevronRight />
                  </IconButton>
                </Box>

                {/* 曜日ヘッダー */}
                <Grid container spacing={1} sx={{ mb: 1 }}>
                  {WEEKDAY_LABELS.map((label, index) => (
                    <Grid item xs key={index}>
                      <Typography
                        variant="body2"
                        align="center"
                        sx={{
                          fontWeight: 600,
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
                    </Grid>
                  ))}
                </Grid>

                {/* カレンダーグリッド */}
                {loading && !selectedDate ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Grid container spacing={1}>
                    {calendarDays.map((date, index) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const isCurrentMonth =
                        format(date, 'yyyy-MM') === currentMonth;
                      const summary = summaryMap.get(dateStr);

                      return (
                        <Grid item xs key={index} sx={{ minWidth: 0 }}>
                          <CalendarDayCell
                            date={date}
                            isCurrentMonth={isCurrentMonth}
                            isSelected={selectedDate === dateStr}
                            batchCount={summary?.batchCount}
                            totalProducts={summary?.totalProducts}
                            onClick={handleDateClick}
                          />
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* 詳細パネル */}
          {selectedDate && (
            <Grid item xs={12} md={4}>
              <AllocationDetailPanel
                selectedDate={selectedDate}
                batches={selectedDateBatches}
                selectedBatchView={selectedBatchView}
                loading={loading}
                onSelectBatch={selectBatch}
                onClose={handleClosePanel}
              />
            </Grid>
          )}
        </Grid>
      </Box>
    </Container>
  );
};
