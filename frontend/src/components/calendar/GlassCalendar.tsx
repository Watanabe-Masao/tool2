import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  CalendarToday,
  ViewList,
  Refresh,
  Search,
} from '@mui/icons-material';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday as isDateToday, isSameMonth } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * カレンダーイベントの型
 */
export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type?: 'default' | 'sale' | 'work' | 'delivery' | 'holiday' | 'deadline';
  icon?: string;
  data?: unknown;
}

/**
 * GlassCalendarのProps
 */
interface GlassCalendarProps {
  /** イベントデータ */
  events?: CalendarEvent[];
  /** 日付クリック時のハンドラー */
  onDateClick?: (date: Date) => void;
  /** 日付範囲選択時のハンドラー */
  onDateRangeSelect?: (startDate: Date, endDate: Date) => void;
  /** イベントクリック時のハンドラー */
  onEventClick?: (event: CalendarEvent) => void;
  /** 選択された日付 */
  selectedDates?: Set<string>;
  /** 初期表示月 */
  initialDate?: Date;
  /** 表示モード */
  viewMode?: 'calendar' | 'table';
  /** 表示モード変更ハンドラー */
  onViewModeChange?: (mode: 'calendar' | 'table') => void;
  /** 更新ハンドラー */
  onRefresh?: () => void;
  /** ローディング状態 */
  loading?: boolean;
}

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

const typeColors: Record<string, { bg: string; text: string }> = {
  default: { bg: 'rgba(100, 116, 139, 0.1)', text: '#475569' },
  sale: { bg: 'rgba(52, 211, 153, 0.1)', text: '#059669' },
  work: { bg: 'rgba(96, 165, 250, 0.1)', text: '#3b82f6' },
  delivery: { bg: 'rgba(251, 191, 36, 0.1)', text: '#d97706' },
  holiday: { bg: 'rgba(251, 113, 133, 0.1)', text: '#e11d48' },
  deadline: { bg: 'rgba(248, 113, 113, 0.1)', text: '#dc2626' },
};

/**
 * ガラスモーフィズムカレンダーコンポーネント
 */
export const GlassCalendar: React.FC<GlassCalendarProps> = ({
  events = [],
  onDateClick,
  onDateRangeSelect,
  onEventClick,
  selectedDates: externalSelectedDates,
  initialDate = new Date(),
  viewMode = 'calendar',
  onViewModeChange,
  onRefresh,
  loading = false,
}) => {
  const [currentDate, setCurrentDate] = useState(startOfMonth(initialDate));
  const [internalSelectedDates, setInternalSelectedDates] = useState<Set<string>>(new Set());

  const selectedDates = externalSelectedDates ?? internalSelectedDates;

  // 月のすべての日を取得（前月・次月の日も含む）
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });

    // 月初の曜日に合わせて前月の日を追加
    const firstDayOfWeek = getDay(start);
    const prevMonthDays: Date[] = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(start);
      date.setDate(date.getDate() - (i + 1));
      prevMonthDays.push(date);
    }

    // 6週分になるまで次月の日を追加
    const allDays = [...prevMonthDays, ...days];
    const remainingDays = 42 - allDays.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(end);
      date.setDate(date.getDate() + i);
      allDays.push(date);
    }

    return allDays;
  }, [currentDate]);

  // イベントを日付でグループ化
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const existing = map.get(event.date) || [];
      existing.push(event);
      map.set(event.date, existing);
    });
    return map;
  }, [events]);

  const formatDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

  const navigateMonth = (direction: number) => {
    setCurrentDate((prev) => (direction > 0 ? addMonths(prev, 1) : subMonths(prev, 1)));
  };

  const goToToday = () => {
    setCurrentDate(startOfMonth(new Date()));
  };

  const clearSelection = useCallback(() => {
    if (!externalSelectedDates) {
      setInternalSelectedDates(new Set());
    }
  }, [externalSelectedDates]);

  // 日付タップ処理
  const handleDateTap = useCallback((date: Date, isCurrentMonth: boolean) => {
    const dateKey = formatDateKey(date);

    // 当月以外の日付をタップした場合、その月に移動
    if (!isCurrentMonth) {
      setCurrentDate(startOfMonth(date));
    }

    // 選択状態をトグル
    if (!externalSelectedDates) {
      setInternalSelectedDates((prev) => {
        const newSelected = new Set(prev);
        if (newSelected.has(dateKey)) {
          newSelected.delete(dateKey);
        } else {
          newSelected.add(dateKey);
        }
        return newSelected;
      });
    }

    onDateClick?.(date);
  }, [externalSelectedDates, onDateClick]);

  // 読み込みボタン処理
  const handleLoadSelection = useCallback(() => {
    if (selectedDates.size === 0 || !onDateRangeSelect) return;

    const sortedDates = Array.from(selectedDates).sort();
    const startDate = new Date(sortedDates[0]);
    const endDate = new Date(sortedDates[sortedDates.length - 1]);
    onDateRangeSelect(startDate, endDate);

    // 選択をクリア
    if (!externalSelectedDates) {
      setInternalSelectedDates(new Set());
    }
  }, [selectedDates, onDateRangeSelect, externalSelectedDates]);

  // 隣接する選択日をチェック
  const getAdjacent = (index: number, dateKey: string) => {
    if (!selectedDates.has(dateKey)) return { left: false, right: false };
    const col = index % 7;
    const checkAdjacent = (idx: number, colCheck: number) => {
      if (idx < 0 || idx >= 42 || colCheck < 0 || colCheck > 6) return false;
      const adjDate = calendarDays[idx];
      return selectedDates.has(formatDateKey(adjDate));
    };
    return {
      left: col > 0 && checkAdjacent(index - 1, col - 1),
      right: col < 6 && checkAdjacent(index + 1, col + 1),
    };
  };

  return (
    <Box sx={{ userSelect: 'none' }}>
      {/* コンパクトヘッダー */}
      <Box
        sx={{
          mb: 1,
          px: 1,
          py: 0.75,
          borderRadius: 1.5,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* 月ナビゲーション */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton size="small" onClick={() => navigateMonth(-1)} sx={{ p: 0.25 }}>
              <ChevronLeft fontSize="small" />
            </IconButton>
            <Button
              size="small"
              onClick={goToToday}
              sx={{
                minWidth: 'auto',
                px: 1,
                py: 0,
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'text.primary',
              }}
            >
              {format(currentDate, 'yyyy年M月', { locale: ja })}
            </Button>
            <IconButton size="small" onClick={() => navigateMonth(1)} sx={{ p: 0.25 }}>
              <ChevronRight fontSize="small" />
            </IconButton>
          </Box>

          {/* 選択・アクション */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {selectedDates.size > 0 ? (
              <>
                <Chip
                  label={`${selectedDates.size}日`}
                  size="small"
                  onDelete={clearSelection}
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    bgcolor: 'primary.50',
                    color: 'primary.main',
                    '& .MuiChip-deleteIcon': { fontSize: '0.9rem' },
                  }}
                />
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleLoadSelection}
                  startIcon={<Search sx={{ fontSize: '0.9rem !important' }} />}
                  sx={{
                    minWidth: 'auto',
                    px: 1,
                    py: 0.25,
                    fontSize: '0.7rem',
                  }}
                >
                  読込
                </Button>
              </>
            ) : (
              <>
                {onRefresh && (
                  <IconButton size="small" onClick={onRefresh} disabled={loading} sx={{ p: 0.25 }}>
                    {loading ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
                  </IconButton>
                )}
                {onViewModeChange && (
                  <IconButton
                    size="small"
                    onClick={() => onViewModeChange(viewMode === 'calendar' ? 'table' : 'calendar')}
                    sx={{ p: 0.25 }}
                  >
                    {viewMode === 'calendar' ? <ViewList fontSize="small" /> : <CalendarToday fontSize="small" />}
                  </IconButton>
                )}
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* カレンダー本体 */}
      <Box
        sx={{
          borderRadius: 1.5,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        {/* 曜日ヘッダー */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {weekdays.map((day, idx) => (
            <Box
              key={day}
              sx={{
                py: 0.5,
                textAlign: 'center',
                fontSize: '0.65rem',
                fontWeight: 600,
                color: idx === 0 ? 'error.main' : idx === 6 ? 'primary.main' : 'text.secondary',
                bgcolor: 'grey.50',
              }}
            >
              {day}
            </Box>
          ))}
        </Box>

        {/* 日付グリッド */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {calendarDays.map((date, idx) => {
            const dateKey = formatDateKey(date);
            const isCurrentMonth = isSameMonth(date, currentDate);
            const dayEvents = eventsByDate.get(dateKey) || [];
            const isSelected = selectedDates.has(dateKey);
            const isTodayDate = isDateToday(date);
            const dayOfWeek = idx % 7;
            const row = Math.floor(idx / 7);
            const adj = getAdjacent(idx, dateKey);

            const borderRadius = isSelected
              ? `${adj.left ? 0 : 6}px ${adj.right ? 0 : 6}px ${adj.right ? 0 : 6}px ${adj.left ? 0 : 6}px`
              : '6px';

            return (
              <Box
                key={idx}
                onClick={() => handleDateTap(date, isCurrentMonth)}
                sx={{
                  position: 'relative',
                  minHeight: { xs: 52, sm: 64 },
                  p: 0.25,
                  borderRight: dayOfWeek < 6 ? '1px solid' : 'none',
                  borderBottom: row < 5 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  '&:active': { bgcolor: 'action.selected' },
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    borderRadius: borderRadius,
                    opacity: isCurrentMonth ? 1 : 0.35,
                    bgcolor: isSelected ? 'primary.50' : 'transparent',
                    border: isSelected ? '1.5px solid' : 'none',
                    borderColor: isSelected ? 'primary.300' : 'transparent',
                    transition: 'all 0.1s',
                  }}
                >
                  {/* コンテンツ */}
                  <Box sx={{ p: { xs: 0.25, sm: 0.5 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          fontSize: '0.65rem',
                          fontWeight: isTodayDate || isSelected ? 600 : 400,
                          bgcolor: isTodayDate ? 'primary.main' : 'transparent',
                          color: isTodayDate
                            ? 'white'
                            : isSelected
                              ? 'primary.main'
                              : dayOfWeek === 0
                                ? 'error.main'
                                : dayOfWeek === 6
                                  ? 'primary.main'
                                  : 'text.primary',
                        }}
                      >
                        {date.getDate()}
                      </Box>
                      {dayEvents.length > 0 && (
                        <Box
                          sx={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            bgcolor: isSelected ? 'primary.400' : 'grey.400',
                          }}
                        />
                      )}
                    </Box>

                    {/* イベント表示 */}
                    <Box sx={{ flex: 1, overflow: 'hidden', mt: 0.25 }}>
                      {dayEvents.slice(0, 2).map((event, i) => {
                        const colors = typeColors[event.type || 'default'];
                        return (
                          <Box
                            key={i}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick?.(event);
                            }}
                            sx={{
                              px: 0.25,
                              py: 0,
                              mb: 0.125,
                              borderRadius: 0.5,
                              fontSize: '0.5rem',
                              bgcolor: colors.bg,
                              color: colors.text,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              lineHeight: 1.4,
                            }}
                          >
                            {event.icon && <span style={{ marginRight: 1 }}>{event.icon}</span>}
                            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                              {event.title}
                            </Box>
                          </Box>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <Typography sx={{ fontSize: '0.45rem', color: 'text.secondary' }}>
                          +{dayEvents.length - 2}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default GlassCalendar;
