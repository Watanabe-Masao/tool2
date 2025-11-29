import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  CalendarToday,
  ViewList,
  Refresh,
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

const typeColors: Record<string, { gradient: string; bg: string; text: string }> = {
  default: { gradient: 'linear-gradient(135deg, #64748b, #475569)', bg: 'rgba(100, 116, 139, 0.1)', text: '#475569' },
  sale: { gradient: 'linear-gradient(135deg, #34d399, #14b8a6)', bg: 'rgba(52, 211, 153, 0.1)', text: '#059669' },
  work: { gradient: 'linear-gradient(135deg, #60a5fa, #6366f1)', bg: 'rgba(96, 165, 250, 0.1)', text: '#3b82f6' },
  delivery: { gradient: 'linear-gradient(135deg, #fbbf24, #f97316)', bg: 'rgba(251, 191, 36, 0.1)', text: '#d97706' },
  holiday: { gradient: 'linear-gradient(135deg, #fb7185, #ec4899)', bg: 'rgba(251, 113, 133, 0.1)', text: '#e11d48' },
  deadline: { gradient: 'linear-gradient(135deg, #f87171, #fb7185)', bg: 'rgba(248, 113, 113, 0.1)', text: '#dc2626' },
};

// タッチ操作の設定
const TOUCH_CONFIG = {
  LONG_PRESS_DURATION: 400, // 長押し判定時間（ms）
  SCROLL_THRESHOLD: 10, // スクロールと判定する移動距離（px）
  SELECTION_HOLD_TIME: 1500, // 選択保持時間（ms）
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
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pressedDate, setPressedDate] = useState<string | null>(null);
  const [newlySelected, setNewlySelected] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartDate = useRef<string | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);

  const selectedDates = externalSelectedDates ?? internalSelectedDates;

  // 選択モード終了時に自動的に日付範囲選択を実行
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (selectionHoldTimer.current) clearTimeout(selectionHoldTimer.current);
    };
  }, []);

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
    clearSelectionAndMode();
  };

  const goToToday = () => {
    setCurrentDate(startOfMonth(new Date()));
  };

  const triggerSelectAnimation = (dateKey: string) => {
    setNewlySelected((prev) => new Set(prev).add(dateKey));
    setTimeout(() => {
      setNewlySelected((prev) => {
        const newSet = new Set(prev);
        newSet.delete(dateKey);
        return newSet;
      });
    }, 400);
  };

  const clearSelectionAndMode = () => {
    setInternalSelectedDates(new Set());
    setIsSelectionMode(false);
    setIsDragging(false);
    if (selectionHoldTimer.current) {
      clearTimeout(selectionHoldTimer.current);
      selectionHoldTimer.current = null;
    }
  };

  // 選択保持タイマーを開始
  const startSelectionHoldTimer = useCallback(() => {
    if (selectionHoldTimer.current) {
      clearTimeout(selectionHoldTimer.current);
    }

    selectionHoldTimer.current = setTimeout(() => {
      // 選択された日付がある場合、日付範囲選択を実行
      const currentSelected = externalSelectedDates ?? internalSelectedDates;
      if (currentSelected.size >= 1 && onDateRangeSelect) {
        const sortedDates = Array.from(currentSelected).sort();
        const startDate = new Date(sortedDates[0]);
        const endDate = new Date(sortedDates[sortedDates.length - 1]);
        onDateRangeSelect(startDate, endDate);
      }
      setIsSelectionMode(false);
      setInternalSelectedDates(new Set());
    }, TOUCH_CONFIG.SELECTION_HOLD_TIME);
  }, [externalSelectedDates, internalSelectedDates, onDateRangeSelect]);

  const toggleSelection = (dateKey: string, date: Date) => {
    if (!externalSelectedDates) {
      setInternalSelectedDates((prev) => {
        const newSelected = new Set(prev);
        if (newSelected.has(dateKey)) {
          newSelected.delete(dateKey);
        } else {
          newSelected.add(dateKey);
          triggerSelectAnimation(dateKey);
        }
        return newSelected;
      });
    }
    onDateClick?.(date);
  };

  const startDrag = (dateKey: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    setPressedDate(dateKey);
    dragStartDate.current = dateKey;
    hasMoved.current = false;

    longPressTimer.current = setTimeout(() => {
      setIsDragging(true);
      setIsSelectionMode(true);
      if (!externalSelectedDates) {
        setInternalSelectedDates((prev) => {
          const newSelected = new Set(prev);
          if (!newSelected.has(dateKey)) {
            newSelected.add(dateKey);
            triggerSelectAnimation(dateKey);
          }
          return newSelected;
        });
      }
    }, TOUCH_CONFIG.LONG_PRESS_DURATION);
  };

  const continueDrag = (dateKey: string, isCurrentMonth: boolean) => {
    setHoveredDate(dateKey);
    if (isDragging && isCurrentMonth && !selectedDates.has(dateKey)) {
      if (!externalSelectedDates) {
        setInternalSelectedDates((prev) => {
          const newSelected = new Set(prev);
          newSelected.add(dateKey);
          triggerSelectAnimation(dateKey);
          return newSelected;
        });
      }
    }
  };

  const endDrag = (dateKey: string, date: Date, isCurrentMonth: boolean) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setPressedDate(null);

    // スクロール操作だった場合は何もしない
    if (hasMoved.current && !isDragging) {
      hasMoved.current = false;
      return;
    }

    if (!isDragging && isCurrentMonth && !hasMoved.current) {
      // 通常のタップ
      toggleSelection(dateKey, date);
    } else if (isDragging) {
      // ドラッグ終了 - 選択保持タイマーを開始
      startSelectionHoldTimer();
    }

    setIsDragging(false);
    dragStartDate.current = null;
    hasMoved.current = false;
  };

  const handleTouchStart = useCallback((e: React.TouchEvent, dateKey: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    hasMoved.current = false;
    startDrag(dateKey, isCurrentMonth);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];

    // スクロール判定
    if (touchStartPos.current) {
      const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);

      if (deltaX > TOUCH_CONFIG.SCROLL_THRESHOLD || deltaY > TOUCH_CONFIG.SCROLL_THRESHOLD) {
        hasMoved.current = true;

        // 長押し前にスクロールした場合はキャンセル
        if (!isDragging && longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
          setPressedDate(null);
          return;
        }
      }
    }

    if (!isDragging) return;

    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const dateKey = element?.closest('[data-datekey]')?.getAttribute('data-datekey');
    const isCurrentMonthEl = element?.closest('[data-iscurrent="true"]');
    if (dateKey && isCurrentMonthEl) {
      continueDrag(dateKey, true);
    }
  }, [isDragging, selectedDates]);

  const handleTouchEnd = useCallback((dateKey: string, date: Date, isCurrentMonth: boolean) => {
    touchStartPos.current = null;
    endDrag(dateKey, date, isCurrentMonth);
  }, [isDragging, startSelectionHoldTimer]);

  // 隣接する選択日をチェック
  const getAdjacent = (index: number, dateKey: string) => {
    if (!selectedDates.has(dateKey)) return { left: false, right: false };
    const col = index % 7;
    const checkAdjacent = (idx: number, colCheck: number) => {
      if (idx < 0 || idx >= 42 || colCheck < 0 || colCheck > 6) return false;
      const adjDate = calendarDays[idx];
      return isSameMonth(adjDate, currentDate) && selectedDates.has(formatDateKey(adjDate));
    };
    return {
      left: col > 0 && checkAdjacent(index - 1, col - 1),
      right: col < 6 && checkAdjacent(index + 1, col + 1),
    };
  };

  return (
    <Box
      sx={{
        userSelect: 'none',
        position: 'relative',
      }}
      onMouseLeave={() => {
        setIsDragging(false);
        setPressedDate(null);
      }}
      onTouchMove={handleTouchMove}
    >
      {/* コンパクトヘッダー */}
      <Box
        sx={{
          mb: 1.5,
          px: 1.5,
          py: 1,
          borderRadius: 2,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(59, 130, 246, 0.1)',
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          {/* 月ナビゲーション */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => navigateMonth(-1)}
              sx={{ p: 0.5, color: 'grey.600' }}
            >
              <ChevronLeft fontSize="small" />
            </IconButton>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: 'grey.800',
                minWidth: 80,
                textAlign: 'center',
                fontSize: '0.875rem',
              }}
            >
              {format(currentDate, 'yyyy年M月', { locale: ja })}
            </Typography>
            <IconButton
              size="small"
              onClick={() => navigateMonth(1)}
              sx={{ p: 0.5, color: 'grey.600' }}
            >
              <ChevronRight fontSize="small" />
            </IconButton>
            <Button
              size="small"
              onClick={goToToday}
              sx={{
                minWidth: 'auto',
                px: 1,
                py: 0.25,
                fontSize: '0.7rem',
                color: 'primary.main',
                bgcolor: 'primary.50',
                borderRadius: 1,
                '&:hover': { bgcolor: 'primary.100' },
              }}
            >
              今日
            </Button>
          </Box>

          {/* 選択解除ボタン */}
          {selectedDates.size > 0 && (
            <Chip
              label={`${selectedDates.size}件選択`}
              size="small"
              onDelete={clearSelectionAndMode}
              sx={{
                height: 24,
                fontSize: '0.7rem',
                bgcolor: 'primary.50',
                color: 'primary.main',
                '& .MuiChip-deleteIcon': {
                  color: 'primary.main',
                  fontSize: '1rem',
                },
              }}
            />
          )}

          {/* 表示切替・更新 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {onViewModeChange && (
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, newMode) => newMode && onViewModeChange(newMode)}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    py: 0.25,
                    px: 0.75,
                    border: '1px solid',
                    borderColor: 'grey.200',
                  },
                }}
              >
                <ToggleButton value="calendar" sx={{ p: 0.5 }}>
                  <CalendarToday sx={{ fontSize: 16 }} />
                </ToggleButton>
                <ToggleButton value="table" sx={{ p: 0.5 }}>
                  <ViewList sx={{ fontSize: 16 }} />
                </ToggleButton>
              </ToggleButtonGroup>
            )}
            {onRefresh && (
              <IconButton
                size="small"
                onClick={onRefresh}
                disabled={loading}
                sx={{ p: 0.5, color: 'grey.600' }}
              >
                {loading ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
              </IconButton>
            )}
          </Box>
        </Box>

        {/* 選択モードインジケーター */}
        {isSelectionMode && (
          <Box
            sx={{
              mt: 0.5,
              py: 0.5,
              px: 1,
              borderRadius: 1,
              bgcolor: 'primary.50',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                animation: 'pulse 1s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
            <Typography variant="caption" sx={{ color: 'primary.main', fontSize: '0.7rem' }}>
              複数選択中... 指を離すと1.5秒後に詳細表示
            </Typography>
          </Box>
        )}
      </Box>

      {/* カレンダー本体 */}
      <Box
        sx={{
          borderRadius: 2,
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(59, 130, 246, 0.08)',
          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.06)',
          overflow: 'hidden',
        }}
      >
        {/* 曜日ヘッダー */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid rgba(59, 130, 246, 0.08)',
          }}
        >
          {weekdays.map((day, idx) => (
            <Box
              key={day}
              sx={{
                py: 0.75,
                textAlign: 'center',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: idx === 0 ? 'error.light' : idx === 6 ? 'primary.main' : 'grey.500',
                bgcolor: 'rgba(248, 250, 252, 0.8)',
                borderRight: idx < 6 ? '1px solid rgba(59, 130, 246, 0.05)' : 'none',
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
            const dayEvents = isCurrentMonth ? eventsByDate.get(dateKey) || [] : [];
            const isSelected = selectedDates.has(dateKey) && isCurrentMonth;
            const isHovered = hoveredDate === dateKey && isCurrentMonth && !isSelected;
            const isPressed = pressedDate === dateKey;
            const isNew = newlySelected.has(dateKey);
            const isTodayDate = isDateToday(date);
            const dayOfWeek = idx % 7;
            const row = Math.floor(idx / 7);
            const adj = getAdjacent(idx, dateKey);

            const borderRadius = isSelected
              ? `${adj.left ? 0 : 8}px ${adj.right ? 0 : 8}px ${adj.right ? 0 : 8}px ${adj.left ? 0 : 8}px`
              : '8px';

            return (
              <Box
                key={idx}
                data-datekey={dateKey}
                data-iscurrent={isCurrentMonth}
                onMouseDown={() => startDrag(dateKey, isCurrentMonth)}
                onMouseEnter={() => continueDrag(dateKey, isCurrentMonth)}
                onMouseUp={() => endDrag(dateKey, date, isCurrentMonth)}
                onMouseLeave={() => !isDragging && setHoveredDate(null)}
                onTouchStart={(e) => handleTouchStart(e, dateKey, isCurrentMonth)}
                onTouchEnd={() => handleTouchEnd(dateKey, date, isCurrentMonth)}
                sx={{
                  position: 'relative',
                  minHeight: { xs: 64, sm: 80 },
                  p: 0.25,
                  borderRight: dayOfWeek < 6 ? '1px solid rgba(59, 130, 246, 0.05)' : 'none',
                  borderBottom: row < 5 ? '1px solid rgba(59, 130, 246, 0.05)' : 'none',
                  bgcolor: !isCurrentMonth ? 'rgba(107, 114, 128, 0.02)' : 'transparent',
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    height: '100%',
                    width: '100%',
                    overflow: 'hidden',
                    borderRadius: borderRadius,
                    opacity: !isCurrentMonth ? 0.25 : 1,
                    cursor: isCurrentMonth ? 'pointer' : 'default',
                    transition: 'all 0.15s ease-out',
                    transform: isPressed ? 'scale(0.96)' : isNew ? 'scale(1.02)' : 'scale(1)',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(219,234,254,0.95) 0%, rgba(224,242,254,0.98) 100%)'
                      : isPressed
                        ? 'rgba(219,234,254,0.5)'
                        : isHovered
                          ? 'rgba(239,246,255,0.6)'
                          : 'transparent',
                    boxShadow: isSelected
                      ? 'inset 0 1px 2px rgba(59,130,246,0.1)'
                      : 'none',
                  }}
                >
                  {/* 選択ボーダー */}
                  {isSelected && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        borderRadius: borderRadius,
                      }}
                    >
                      <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, bgcolor: 'primary.300' }} />
                      <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, bgcolor: 'primary.300' }} />
                      {!adj.left && <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, bgcolor: 'primary.300' }} />}
                      {!adj.right && <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, bgcolor: 'primary.300' }} />}
                    </Box>
                  )}

                  {/* ポップアニメーション */}
                  {isNew && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        overflow: 'hidden',
                        borderRadius: borderRadius,
                        bgcolor: 'rgba(96, 165, 250, 0.2)',
                        animation: 'popIn 0.3s ease-out',
                        '@keyframes popIn': {
                          '0%': { opacity: 0, transform: 'scale(0.9)' },
                          '50%': { opacity: 1 },
                          '100%': { opacity: 0, transform: 'scale(1.05)' },
                        },
                      }}
                    />
                  )}

                  {/* コンテンツ */}
                  <Box sx={{ position: 'relative', zIndex: 10, p: { xs: 0.5, sm: 0.75 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          fontSize: '0.7rem',
                          fontWeight: isTodayDate ? 600 : isSelected ? 600 : 500,
                          bgcolor: isTodayDate ? 'primary.main' : 'transparent',
                          color: isTodayDate
                            ? 'white'
                            : isSelected
                              ? 'primary.main'
                              : dayOfWeek === 0
                                ? 'error.light'
                                : dayOfWeek === 6
                                  ? 'primary.main'
                                  : 'grey.700',
                          boxShadow: isTodayDate ? '0 2px 6px rgba(59, 130, 246, 0.35)' : 'none',
                        }}
                      >
                        {date.getDate()}
                      </Box>
                      {dayEvents.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.25 }}>
                          {dayEvents.slice(0, 3).map((_, i) => (
                            <Box
                              key={i}
                              sx={{
                                width: 3,
                                height: 3,
                                borderRadius: '50%',
                                bgcolor: isSelected ? 'primary.400' : 'grey.400',
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
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
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.25,
                              px: 0.5,
                              py: 0.125,
                              borderRadius: 0.5,
                              fontSize: '0.6rem',
                              bgcolor: colors.bg,
                              color: colors.text,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              '&:hover': { opacity: 0.8 },
                            }}
                          >
                            {event.icon && <span style={{ fontSize: '0.55rem' }}>{event.icon}</span>}
                            <Typography
                              sx={{
                                fontSize: '0.55rem',
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: { xs: 'none', sm: 'block' },
                              }}
                            >
                              {event.title}
                            </Typography>
                          </Box>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <Typography sx={{ fontSize: '0.55rem', color: 'grey.500' }}>
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
