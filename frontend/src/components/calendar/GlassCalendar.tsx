import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  CalendarMonth,
} from '@mui/icons-material';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday as isDateToday, isSameMonth } from 'date-fns';
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
}) => {
  const [currentDate, setCurrentDate] = useState(startOfMonth(initialDate));
  const [internalSelectedDates, setInternalSelectedDates] = useState<Set<string>>(new Set());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pressedDate, setPressedDate] = useState<string | null>(null);
  const [newlySelected, setNewlySelected] = useState<Set<string>>(new Set());
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const dragStartDate = useRef<string | null>(null);

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
    setInternalSelectedDates(new Set());
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

  const startDrag = (dateKey: string, date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    setPressedDate(dateKey);
    dragStartDate.current = dateKey;

    longPressTimer.current = setTimeout(() => {
      setIsDragging(true);
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
    }, 150);
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
    }
    setPressedDate(null);

    if (!isDragging && isCurrentMonth) {
      toggleSelection(dateKey, date);
    } else if (isDragging && dragStartDate.current && onDateRangeSelect) {
      // ドラッグ終了時に日付範囲選択を通知
      const sortedDates = Array.from(selectedDates).sort();
      if (sortedDates.length >= 2) {
        const startDate = new Date(sortedDates[0]);
        const endDate = new Date(sortedDates[sortedDates.length - 1]);
        onDateRangeSelect(startDate, endDate);
      }
    }

    setIsDragging(false);
    dragStartDate.current = null;
  };

  const handleTouchStart = useCallback((e: React.TouchEvent, dateKey: string, date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    startDrag(dateKey, date, isCurrentMonth);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const dateKey = element?.closest('[data-datekey]')?.getAttribute('data-datekey');
    const isCurrentMonth = element?.closest('[data-iscurrent="true"]');
    if (dateKey && isCurrentMonth) {
      continueDrag(dateKey, true);
    }
  }, [isDragging, selectedDates]);

  const clearSelection = () => {
    setInternalSelectedDates(new Set());
  };

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
      {/* ヘッダー */}
      <Box
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              }}
            >
              <CalendarMonth sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
                {format(currentDate, 'yyyy年', { locale: ja })}
                <Box component="span" sx={{ color: 'primary.main', ml: 0.5 }}>
                  {format(currentDate, 'M', { locale: ja })}
                </Box>
                月
              </Typography>
              <Typography variant="caption" sx={{ color: 'grey.500' }}>
                長押し+スワイプで複数選択
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedDates.size > 0 && (
              <Button
                size="small"
                onClick={clearSelection}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: 'primary.50',
                  color: 'primary.main',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  border: '1px solid',
                  borderColor: 'primary.100',
                  '&:hover': { bgcolor: 'primary.100' },
                }}
              >
                解除
                <Chip
                  label={selectedDates.size}
                  size="small"
                  sx={{
                    ml: 0.5,
                    height: 18,
                    fontSize: '0.7rem',
                    bgcolor: 'primary.main',
                    color: 'white',
                  }}
                />
              </Button>
            )}

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'grey.50',
                borderRadius: 2,
                p: 0.25,
                border: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              <IconButton
                size="small"
                onClick={() => navigateMonth(-1)}
                sx={{
                  '&:hover': { bgcolor: 'white' },
                  color: 'grey.500',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <ChevronLeft fontSize="small" />
              </IconButton>
              <Button
                size="small"
                onClick={goToToday}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  mx: 0.25,
                  borderRadius: 1.5,
                  bgcolor: 'primary.main',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  minWidth: 'auto',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                今日
              </Button>
              <IconButton
                size="small"
                onClick={() => navigateMonth(1)}
                sx={{
                  '&:hover': { bgcolor: 'white' },
                  color: 'grey.500',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <ChevronRight fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* カレンダー本体 */}
      <Box
        sx={{
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(59, 130, 246, 0.1)',
          boxShadow: '0 8px 32px rgba(59, 130, 246, 0.08)',
          overflow: 'hidden',
        }}
      >
        {/* 曜日ヘッダー */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
          }}
        >
          {weekdays.map((day, idx) => (
            <Box
              key={day}
              sx={{
                py: 1.5,
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: idx === 0 ? 'error.light' : idx === 6 ? 'primary.main' : 'grey.500',
                bgcolor: idx === 0 ? 'rgba(244, 63, 94, 0.04)' : idx === 6 ? 'rgba(59, 130, 246, 0.04)' : 'rgba(107, 114, 128, 0.04)',
                borderRight: idx < 6 ? '1px solid rgba(59, 130, 246, 0.06)' : 'none',
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
              ? `${adj.left ? 0 : 12}px ${adj.right ? 0 : 12}px ${adj.right ? 0 : 12}px ${adj.left ? 0 : 12}px`
              : '12px';

            return (
              <Box
                key={idx}
                data-datekey={dateKey}
                data-iscurrent={isCurrentMonth}
                onMouseDown={() => startDrag(dateKey, date, isCurrentMonth)}
                onMouseEnter={() => continueDrag(dateKey, isCurrentMonth)}
                onMouseUp={() => endDrag(dateKey, date, isCurrentMonth)}
                onMouseLeave={() => !isDragging && setHoveredDate(null)}
                onTouchStart={(e) => handleTouchStart(e, dateKey, date, isCurrentMonth)}
                onTouchEnd={() => endDrag(dateKey, date, isCurrentMonth)}
                sx={{
                  position: 'relative',
                  minHeight: { xs: 80, sm: 96 },
                  p: 0.25,
                  borderRight: dayOfWeek < 6 ? '1px solid rgba(59, 130, 246, 0.06)' : 'none',
                  borderBottom: row < 5 ? '1px solid rgba(59, 130, 246, 0.06)' : 'none',
                  bgcolor: !isCurrentMonth ? 'rgba(107, 114, 128, 0.03)' : 'transparent',
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
                    transition: 'all 0.2s ease-out',
                    transform: isPressed ? 'scale(0.96)' : isNew ? 'scale(1.02)' : 'scale(1)',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(219,234,254,0.9) 0%, rgba(224,242,254,0.95) 50%, rgba(219,234,254,0.9) 100%)'
                      : isPressed
                        ? 'linear-gradient(180deg, rgba(191,219,254,0.4) 0%, rgba(224,242,254,0.3) 100%)'
                        : isHovered
                          ? 'rgba(239,246,255,0.7)'
                          : 'rgba(255,255,255,0.7)',
                    boxShadow: isSelected
                      ? 'inset 0 1px 2px rgba(59,130,246,0.1), 0 2px 8px rgba(59,130,246,0.12)'
                      : isPressed
                        ? 'inset 0 2px 6px rgba(0,0,0,0.08)'
                        : isHovered
                          ? '0 2px 6px rgba(59,130,246,0.08)'
                          : '0 1px 3px rgba(0,0,0,0.04)',
                    '&:active': isCurrentMonth ? { transform: 'scale(0.97)' } : {},
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
                      <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: 'linear-gradient(to right, rgba(147,197,253,0.8), rgba(96,165,250,1), rgba(147,197,253,0.8))' }} />
                      <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: 'linear-gradient(to right, rgba(147,197,253,0.8), rgba(96,165,250,1), rgba(147,197,253,0.8))' }} />
                      {!adj.left && <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, rgba(147,197,253,0.8), rgba(96,165,250,1), rgba(147,197,253,0.8))' }} />}
                      {!adj.right && <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, rgba(147,197,253,0.8), rgba(96,165,250,1), rgba(147,197,253,0.8))' }} />}
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
                        animation: 'pulse 0.3s ease-out',
                        '@keyframes pulse': {
                          '0%': { opacity: 0, transform: 'scale(0.8)' },
                          '50%': { opacity: 1 },
                          '100%': { opacity: 0, transform: 'scale(1.1)' },
                        },
                      }}
                    />
                  )}

                  {/* コンテンツ */}
                  <Box sx={{ position: 'relative', zIndex: 10, p: { xs: 0.75, sm: 1 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          fontSize: '0.75rem',
                          fontWeight: isTodayDate ? 600 : isSelected ? 700 : 500,
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
                          boxShadow: isTodayDate ? '0 2px 8px rgba(59, 130, 246, 0.4)' : 'none',
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
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                bgcolor: isSelected ? 'primary.light' : 'grey.400',
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
                              gap: 0.5,
                              px: 0.5,
                              py: 0.25,
                              borderRadius: 1,
                              fontSize: '0.65rem',
                              bgcolor: colors.bg,
                              color: colors.text,
                              border: '1px solid',
                              borderColor: `${colors.text}20`,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              '&:hover': { opacity: 0.8 },
                            }}
                          >
                            {event.icon && <span style={{ fontSize: '0.65rem' }}>{event.icon}</span>}
                            <Typography
                              sx={{
                                fontSize: '0.65rem',
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
                        <Typography sx={{ fontSize: '0.6rem', color: 'grey.500' }}>
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

      {/* 凡例 */}
      <Box
        sx={{
          mt: 2,
          px: 2,
          py: 1.5,
          borderRadius: 2,
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(59, 130, 246, 0.08)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, fontSize: '0.75rem' }}>
          {[
            { type: 'sale', label: 'セール' },
            { type: 'work', label: '業務' },
            { type: 'delivery', label: '入荷' },
            { type: 'holiday', label: '祝日' },
            { type: 'deadline', label: '締切' },
          ].map(({ type, label }) => (
            <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: typeColors[type].gradient,
                }}
              />
              <Typography sx={{ fontSize: '0.7rem', color: 'grey.600' }}>{label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default GlassCalendar;
