import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  ViewList,
  Refresh,
  Search,
} from '@mui/icons-material';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday as isDateToday, isSameMonth } from 'date-fns';

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
  events?: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onDateRangeSelect?: (startDate: Date, endDate: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  selectedDates?: Set<string>;
  initialDate?: Date;
  viewMode?: 'calendar' | 'table';
  onViewModeChange?: (mode: 'calendar' | 'table') => void;
  onRefresh?: () => void;
  loading?: boolean;
}

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

const typeConfig: Record<string, { color: string; bg: string; text: string }> = {
  default: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', text: '#475569' },
  sale: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', text: '#059669' },
  work: { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)', text: '#4f46e5' },
  delivery: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706' },
  holiday: { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)', text: '#e11d48' },
  deadline: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626' },
};

/**
 * モダンカレンダーコンポーネント
 */
export const GlassCalendar: React.FC<GlassCalendarProps> = ({
  events = [],
  onDateClick,
  onDateRangeSelect,
  onEventClick,
  selectedDates: externalSelectedDates,
  initialDate = new Date(),
  viewMode: _viewMode = 'calendar',
  onViewModeChange,
  onRefresh,
  loading = false,
}) => {
  const [currentDate, setCurrentDate] = useState(startOfMonth(initialDate));
  const [internalSelectedDates, setInternalSelectedDates] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const selectedDates = externalSelectedDates ?? internalSelectedDates;

  // 月のすべての日を取得
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });

    const firstDayOfWeek = getDay(start);
    const prevMonthDays: Date[] = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(start);
      date.setDate(date.getDate() - (i + 1));
      prevMonthDays.push(date);
    }

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

  // 隣接日かどうかをチェック
  const isAdjacentToSelection = useCallback((dateKey: string): boolean => {
    if (selectedDates.size === 0) return true;

    const sortedDates = Array.from(selectedDates).sort();
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];

    // 1日前または1日後かチェック
    const targetDate = new Date(dateKey);
    const firstDateObj = new Date(firstDate);
    const lastDateObj = new Date(lastDate);

    const dayBefore = new Date(firstDateObj);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayAfter = new Date(lastDateObj);
    dayAfter.setDate(dayAfter.getDate() + 1);

    return formatDateKey(targetDate) === formatDateKey(dayBefore) ||
           formatDateKey(targetDate) === formatDateKey(dayAfter);
  }, [selectedDates]);

  const navigateMonth = (direction: number) => {
    setCurrentDate((prev) => (direction > 0 ? addMonths(prev, 1) : subMonths(prev, 1)));
    if (!externalSelectedDates) {
      setInternalSelectedDates(new Set());
    }
  };

  const goToToday = () => {
    setCurrentDate(startOfMonth(new Date()));
  };

  const clearSelection = useCallback(() => {
    if (!externalSelectedDates) {
      setInternalSelectedDates(new Set());
    }
  }, [externalSelectedDates]);

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) {
      clearSelection();
    }
  };

  // 日付クリック処理
  const handleDateClick = useCallback((date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) {
      setCurrentDate(startOfMonth(date));
      return;
    }

    const dateKey = formatDateKey(date);

    if (isSelectMode) {
      // 複数選択モード - 連続日付のみ許可
      if (!externalSelectedDates) {
        setInternalSelectedDates((prev) => {
          // すでに選択されている場合は解除
          if (prev.has(dateKey)) {
            // 端の日付のみ解除可能
            const sortedDates = Array.from(prev).sort();
            if (dateKey === sortedDates[0] || dateKey === sortedDates[sortedDates.length - 1]) {
              const newSelected = new Set(prev);
              newSelected.delete(dateKey);
              return newSelected;
            }
            return prev; // 中間の日付は解除不可
          }

          // 新規選択 - 隣接しているかチェック
          if (prev.size === 0) {
            // 最初の選択
            return new Set([dateKey]);
          }

          // 隣接しているかチェック
          const sortedDates = Array.from(prev).sort();
          const firstDate = sortedDates[0];
          const lastDate = sortedDates[sortedDates.length - 1];

          const targetDate = new Date(dateKey);
          const firstDateObj = new Date(firstDate);
          const lastDateObj = new Date(lastDate);

          const dayBefore = new Date(firstDateObj);
          dayBefore.setDate(dayBefore.getDate() - 1);
          const dayAfter = new Date(lastDateObj);
          dayAfter.setDate(dayAfter.getDate() + 1);

          if (formatDateKey(targetDate) === formatDateKey(dayBefore) ||
              formatDateKey(targetDate) === formatDateKey(dayAfter)) {
            // 隣接している - 追加
            const newSelected = new Set(prev);
            newSelected.add(dateKey);
            return newSelected;
          }

          // 隣接していない - 選択をリセットして新しく開始
          return new Set([dateKey]);
        });
      }
    } else {
      // 単一選択モード
      if (!externalSelectedDates) {
        setInternalSelectedDates((prev) => {
          if (prev.has(dateKey) && prev.size === 1) {
            return new Set();
          }
          return new Set([dateKey]);
        });
      }
    }

    onDateClick?.(date);
  }, [isSelectMode, externalSelectedDates, onDateClick]);

  // 読み込みボタン処理
  const handleLoadSelection = useCallback(() => {
    if (selectedDates.size === 0 || !onDateRangeSelect) return;

    const sortedDates = Array.from(selectedDates).sort();
    const startDate = new Date(sortedDates[0]);
    const endDate = new Date(sortedDates[sortedDates.length - 1]);
    onDateRangeSelect(startDate, endDate);

    if (!externalSelectedDates) {
      setInternalSelectedDates(new Set());
    }
    setIsSelectMode(false);
  }, [selectedDates, onDateRangeSelect, externalSelectedDates]);

  // 隣接する選択日をチェック（UI表示用）
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

  // 選択範囲のテキスト表示
  const selectionRangeText = useMemo(() => {
    if (selectedDates.size === 0) return '';
    const sortedDates = Array.from(selectedDates).sort();
    const first = new Date(sortedDates[0]);
    const last = new Date(sortedDates[sortedDates.length - 1]);

    if (sortedDates.length === 1) {
      return `${first.getMonth() + 1}/${first.getDate()}`;
    }
    return `${first.getMonth() + 1}/${first.getDate()} - ${last.getMonth() + 1}/${last.getDate()}`;
  }, [selectedDates]);

  return (
    <Box sx={{ userSelect: 'none', position: 'relative' }}>
      {/* コンパクトヘッダー */}
      <Box
        sx={{
          mb: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          minHeight: 40,
        }}
      >
        {/* 左側: ナビゲーション + 年月 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flex: '0 1 auto' }}>
          <IconButton
            size="small"
            onClick={() => navigateMonth(-1)}
            sx={{
              p: 0.75,
              color: 'grey.600',
              '&:hover': { bgcolor: 'grey.100' },
            }}
          >
            <ChevronLeft sx={{ fontSize: 22 }} />
          </IconButton>

          <Box
            onClick={goToToday}
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 0.25,
              cursor: 'pointer',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              '&:hover': { bgcolor: 'grey.50' },
              '&:active': { bgcolor: 'grey.100' },
            }}
          >
            <Typography
              component="span"
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.4rem' },
                fontWeight: 400,
                color: 'grey.600',
              }}
            >
              {currentDate.getFullYear()}
            </Typography>
            <Typography
              component="span"
              sx={{ fontSize: { xs: '1.25rem', sm: '1.4rem' }, color: 'grey.300', mx: 0.25 }}
            >
              /
            </Typography>
            <Typography
              component="span"
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.4rem' },
                fontWeight: 700,
                color: 'text.primary',
              }}
            >
              {String(currentDate.getMonth() + 1).padStart(2, '0')}
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={() => navigateMonth(1)}
            sx={{
              p: 0.75,
              color: 'grey.600',
              '&:hover': { bgcolor: 'grey.100' },
            }}
          >
            <ChevronRight sx={{ fontSize: 22 }} />
          </IconButton>
        </Box>

        {/* 右側: コントロール */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {/* 複数選択ボタン */}
          <Button
            size="small"
            onClick={toggleSelectMode}
            variant={isSelectMode ? 'contained' : 'text'}
            color={isSelectMode ? 'primary' : 'inherit'}
            sx={{
              px: 1.5,
              py: 0.5,
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: 1.5,
              textTransform: 'none',
              minWidth: 'auto',
              color: isSelectMode ? 'white' : 'grey.600',
              bgcolor: isSelectMode ? 'primary.main' : 'transparent',
              '&:hover': {
                bgcolor: isSelectMode ? 'primary.dark' : 'grey.100',
              },
            }}
          >
            {isSelectMode ? '選択中' : '複数選択'}
          </Button>

          {/* 更新ボタン */}
          {onRefresh && (
            <IconButton
              size="small"
              onClick={onRefresh}
              disabled={loading}
              sx={{
                p: 0.75,
                color: 'grey.600',
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              {loading ? <CircularProgress size={18} /> : <Refresh sx={{ fontSize: 20 }} />}
            </IconButton>
          )}

          {/* リスト表示ボタン */}
          {onViewModeChange && (
            <IconButton
              size="small"
              onClick={() => onViewModeChange('table')}
              sx={{
                p: 0.75,
                color: 'grey.600',
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              <ViewList sx={{ fontSize: 20 }} />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* カレンダー本体 */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'grey.200',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {/* 曜日ヘッダー */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            bgcolor: 'grey.50',
            borderBottom: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          {weekdays.map((day, idx) => (
            <Box
              key={day}
              sx={{
                py: 1,
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: idx === 0 ? '#e11d48' : idx === 6 ? '#0284c7' : 'grey.500',
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
            const isHovered = hoveredDate === dateKey && isCurrentMonth && !isSelected;
            const isTodayDate = isDateToday(date);
            const dayOfWeek = idx % 7;
            const row = Math.floor(idx / 7);
            const adj = getAdjacent(idx, dateKey);

            // 複数選択モード時、隣接していない日付を薄く表示
            const canSelect = !isSelectMode || selectedDates.size === 0 || isSelected || isAdjacentToSelection(dateKey);

            const gap = 3;
            const ml = isSelected ? (adj.left ? 0 : gap) : gap;
            const borderRadius = isSelected
              ? `${adj.left ? 0 : 8}px ${adj.right ? 0 : 8}px ${adj.right ? 0 : 8}px ${adj.left ? 0 : 8}px`
              : '8px';

            return (
              <Box
                key={idx}
                onClick={() => handleDateClick(date, isCurrentMonth)}
                onMouseEnter={() => setHoveredDate(dateKey)}
                onMouseLeave={() => setHoveredDate(null)}
                sx={{
                  position: 'relative',
                  minHeight: { xs: 68, sm: 84 },
                  py: `${gap}px`,
                  borderRight: dayOfWeek < 6 ? '1px solid' : 'none',
                  borderBottom: row < 5 ? '1px solid' : 'none',
                  borderColor: 'grey.100',
                  bgcolor: !isCurrentMonth ? 'rgba(0,0,0,0.02)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s ease',
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    height: '100%',
                    mx: `${ml}px`,
                    borderRadius: borderRadius,
                    opacity: isCurrentMonth ? (canSelect ? 1 : 0.4) : 0.3,
                    transition: 'all 0.1s ease-out',
                    background: isSelected
                      ? 'linear-gradient(to bottom, #eff6ff, #dbeafe)'
                      : isHovered
                        ? '#f8fafc'
                        : 'transparent',
                    boxShadow: isSelected
                      ? '0 2px 8px -2px rgba(59, 130, 246, 0.3)'
                      : 'none',
                  }}
                >
                  {/* 選択ボーダー */}
                  {isSelected && (
                    <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: borderRadius }}>
                      <Box sx={{ position: 'absolute', insetX: 0, top: 0, height: '2px', bgcolor: 'primary.400' }} />
                      <Box sx={{ position: 'absolute', insetX: 0, bottom: 0, height: '2px', bgcolor: 'primary.400' }} />
                      {!adj.left && <Box sx={{ position: 'absolute', left: 0, insetY: 0, width: '2px', bgcolor: 'primary.400' }} />}
                      {!adj.right && <Box sx={{ position: 'absolute', right: 0, insetY: 0, width: '2px', bgcolor: 'primary.400' }} />}
                    </Box>
                  )}

                  {/* コンテンツ */}
                  <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 0.5, sm: 1 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* 日付行 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          fontSize: '0.8rem',
                          fontWeight: isTodayDate ? 700 : isSelected ? 700 : 500,
                          bgcolor: isTodayDate ? 'grey.800' : 'transparent',
                          color: isTodayDate
                            ? 'white'
                            : isSelected
                              ? 'primary.700'
                              : dayOfWeek === 0
                                ? '#e11d48'
                                : dayOfWeek === 6
                                  ? '#0284c7'
                                  : 'grey.700',
                          boxShadow: isTodayDate ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                        }}
                      >
                        {date.getDate()}
                      </Box>
                      {dayEvents.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.25 }}>
                          {dayEvents.slice(0, 3).map((ev, i) => (
                            <Box
                              key={i}
                              sx={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                bgcolor: typeConfig[ev.type || 'default'].color,
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>

                    {/* イベント - 複数選択モード時はクリック無効 */}
                    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      {dayEvents.slice(0, 2).map((event, i) => {
                        const config = typeConfig[event.type || 'default'];
                        return (
                          <Box
                            key={i}
                            onClick={(e) => {
                              // 複数選択モード時はイベントクリックを無効化
                              if (isSelectMode) {
                                e.stopPropagation();
                                // 日付選択として処理するため、何もしない（親のonClickが発火する）
                                return;
                              }
                              e.stopPropagation();
                              onEventClick?.(event);
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              px: 0.75,
                              py: 0.25,
                              borderRadius: 0.75,
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              bgcolor: config.bg,
                              color: config.text,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              cursor: isSelectMode ? 'default' : 'pointer',
                              transition: 'all 0.1s',
                              // 複数選択モード時はホバーエフェクトなし
                              '&:hover': isSelectMode ? {} : {
                                opacity: 0.85,
                                transform: 'scale(1.02)',
                              },
                              // 複数選択モード時は薄く表示
                              opacity: isSelectMode ? 0.6 : 1,
                            }}
                          >
                            {event.icon && <span style={{ fontSize: '0.7rem', lineHeight: 1 }}>{event.icon}</span>}
                            <Box
                              component="span"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: { xs: 'none', sm: 'block' },
                              }}
                            >
                              {event.title}
                            </Box>
                          </Box>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <Typography sx={{ fontSize: '0.55rem', color: 'grey.500', fontWeight: 600, pl: 0.5 }}>
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

      {/* フッターエリア - 選択情報と読込ボタン */}
      <Box
        sx={{
          mt: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 44,
        }}
      >
        {/* 左側: 凡例 */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, flex: 1 }}>
          {Object.entries(typeConfig).slice(1).map(([key, config]) => (
            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: config.color }} />
              <Typography sx={{ fontSize: '0.65rem', color: 'grey.600', fontWeight: 500 }}>
                {key === 'sale' ? 'セール' : key === 'work' ? '業務' : key === 'delivery' ? '入荷' : key === 'holiday' ? '祝日' : '締切'}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* 右側: 選択情報と読込ボタン */}
        {selectedDates.size > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              pl: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'primary.main',
                }}
              >
                {selectionRangeText}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: 'grey.500',
                }}
              >
                ({selectedDates.size}日)
              </Typography>
            </Box>
            <Button
              size="small"
              variant="contained"
              onClick={handleLoadSelection}
              startIcon={<Search sx={{ fontSize: '1rem !important' }} />}
              sx={{
                px: 2,
                py: 0.5,
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 1.5,
                boxShadow: 2,
              }}
            >
              読み込む
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default GlassCalendar;
