import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  CircularProgress,
  Card,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  ViewList,
  Refresh,
  Search,
} from '@mui/icons-material';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday as isDateToday, isSameMonth } from 'date-fns';
import { getSupplierColorByName, SUPPLIER_COLOR_OVERFLOW } from '@/constants/supplierColors';

/**
 * 帳合先プリセット（カラー用）
 */
export interface SupplierPreset {
  supplier: string;
  displayOrder?: number;
}

/**
 * カレンダーイベントの型
 */
export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  suppliers?: string[]; // 帳合先リスト
  data?: unknown;
}

/**
 * プレビュー用の商品データ
 */
export interface PreviewProduct {
  productName: string;
  origin: string;
  specification: string;
  unit: string; // 規格の単位
  quantityPerPackage: number | null;
  packageUnit: string; // 入数の単位
  totalDelivery: number | null; // 総納品数 - 未入力時null、0の場合0として区別
  supplier: string;
  deliveryDate: string; // 日付 (YYYY-MM-DD)
}

/**
 * GlassCalendarのProps
 */
interface GlassCalendarProps {
  events?: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onDateRangeSelect?: (startDate: Date, endDate: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onSelectedDatesChange?: (dates: string[]) => void; // 選択日付変更時のコールバック
  selectedDates?: Set<string>;
  initialDate?: Date;
  viewMode?: 'calendar' | 'table';
  onViewModeChange?: (mode: 'calendar' | 'table') => void;
  onRefresh?: () => void;
  loading?: boolean;
  supplierPresets?: SupplierPreset[];
  previewProducts?: PreviewProduct[];
  previewLoading?: boolean;
}

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * モダンカレンダーコンポーネント
 */
export const GlassCalendar: React.FC<GlassCalendarProps> = ({
  events = [],
  onDateClick,
  onDateRangeSelect,
  onEventClick,
  onSelectedDatesChange,
  selectedDates: externalSelectedDates,
  initialDate = new Date(),
  viewMode: _viewMode = 'calendar',
  onViewModeChange,
  onRefresh,
  loading = false,
  supplierPresets = [],
  previewProducts = [],
  previewLoading = false,
}) => {
  const [currentDate, setCurrentDate] = useState(startOfMonth(initialDate));
  const [internalSelectedDates, setInternalSelectedDates] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const selectedDates = externalSelectedDates ?? internalSelectedDates;

  // 選択日付が変更されたら親に通知
  useEffect(() => {
    if (onSelectedDatesChange) {
      const sortedDates = Array.from(selectedDates).sort();
      onSelectedDatesChange(sortedDates);
    }
  }, [selectedDates, onSelectedDatesChange]);

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

  // 日付ごとの帳合先（ユニーク）を取得
  const suppliersByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    events.forEach((event) => {
      if (event.suppliers && event.suppliers.length > 0) {
        const existing = map.get(event.date) || [];
        event.suppliers.forEach(supplier => {
          if (!existing.includes(supplier)) {
            existing.push(supplier);
          }
        });
        map.set(event.date, existing);
      }
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
          if (prev.has(dateKey)) {
            const sortedDates = Array.from(prev).sort();
            if (dateKey === sortedDates[0] || dateKey === sortedDates[sortedDates.length - 1]) {
              const newSelected = new Set(prev);
              newSelected.delete(dateKey);
              return newSelected;
            }
            return prev;
          }

          if (prev.size === 0) {
            return new Set([dateKey]);
          }

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
            const newSelected = new Set(prev);
            newSelected.add(dateKey);
            return newSelected;
          }

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

  // 帳合先カラーを取得
  const getSupplierDotColor = (supplier: string) => {
    return getSupplierColorByName(supplier, supplierPresets);
  };

  // プレビューデータを日付ごとにグループ化
  const groupedPreviewByDate = useMemo(() => {
    const groups = new Map<string, PreviewProduct[]>();
    previewProducts.forEach(product => {
      const key = product.deliveryDate;
      const existing = groups.get(key) || [];
      existing.push(product);
      groups.set(key, existing);
    });
    // 日付でソート
    return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [previewProducts]);

  // 選択中の日付を表示用にフォーマット
  const selectedDateDisplay = useMemo(() => {
    if (selectedDates.size === 0) return '';
    const sortedDates = Array.from(selectedDates).sort();
    return sortedDates.map(d => {
      const date = new Date(d);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }).join(', ');
  }, [selectedDates]);

  return (
    <Box sx={{ userSelect: 'none', position: 'relative' }}>
      {/* コンパクトヘッダー */}
      <Box
        sx={{
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.5,
          minHeight: 36,
        }}
      >
        {/* 左側: ナビゲーション + 年月 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <IconButton
            size="small"
            onClick={() => navigateMonth(-1)}
            sx={{ p: 0.5, color: 'grey.600' }}
          >
            <ChevronLeft sx={{ fontSize: 20 }} />
          </IconButton>

          <Box
            onClick={goToToday}
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 0.25,
              cursor: 'pointer',
              px: 0.5,
              borderRadius: 1,
              '&:hover': { bgcolor: 'grey.50' },
            }}
          >
            <Typography
              component="span"
              sx={{ fontSize: '1rem', fontWeight: 400, color: 'grey.500' }}
            >
              {currentDate.getFullYear()}
            </Typography>
            <Typography component="span" sx={{ fontSize: '1rem', color: 'grey.300' }}>
              /
            </Typography>
            <Typography
              component="span"
              sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.primary' }}
            >
              {String(currentDate.getMonth() + 1).padStart(2, '0')}
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={() => navigateMonth(1)}
            sx={{ p: 0.5, color: 'grey.600' }}
          >
            <ChevronRight sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* 右側: コントロール */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Button
            size="small"
            onClick={toggleSelectMode}
            variant={isSelectMode ? 'contained' : 'text'}
            color={isSelectMode ? 'primary' : 'inherit'}
            sx={{
              px: 1,
              py: 0.25,
              fontSize: '0.7rem',
              fontWeight: 600,
              borderRadius: 1,
              textTransform: 'none',
              minWidth: 'auto',
              color: isSelectMode ? 'white' : 'grey.600',
            }}
          >
            {isSelectMode ? '選択中' : '複数'}
          </Button>

          {onRefresh && (
            <IconButton
              size="small"
              onClick={onRefresh}
              disabled={loading}
              sx={{ p: 0.5, color: 'grey.600' }}
            >
              {loading ? <CircularProgress size={16} /> : <Refresh sx={{ fontSize: 18 }} />}
            </IconButton>
          )}

          {onViewModeChange && (
            <IconButton
              size="small"
              onClick={() => onViewModeChange('table')}
              sx={{ p: 0.5, color: 'grey.600' }}
            >
              <ViewList sx={{ fontSize: 18 }} />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* カレンダー本体 */}
      <Box
        sx={{
          borderRadius: 1.5,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'grey.200',
          overflow: 'hidden',
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
                py: 0.5,
                textAlign: 'center',
                fontSize: '0.65rem',
                fontWeight: 700,
                color: idx === 0 ? '#e11d48' : idx === 6 ? '#0284c7' : 'grey.500',
              }}
            >
              {day}
            </Box>
          ))}
        </Box>

        {/* 日付グリッド - コンパクト */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {calendarDays.map((date, idx) => {
            const dateKey = formatDateKey(date);
            const isCurrentMonth = isSameMonth(date, currentDate);
            const dayEvents = eventsByDate.get(dateKey) || [];
            const daySuppliers = suppliersByDate.get(dateKey) || [];
            const isSelected = selectedDates.has(dateKey);
            const isHovered = hoveredDate === dateKey && isCurrentMonth && !isSelected;
            const isTodayDate = isDateToday(date);
            const dayOfWeek = idx % 7;
            const row = Math.floor(idx / 7);
            const adj = getAdjacent(idx, dateKey);
            const canSelect = !isSelectMode || selectedDates.size === 0 || isSelected || isAdjacentToSelection(dateKey);

            const gap = 2;
            const ml = isSelected ? (adj.left ? 0 : gap) : gap;
            const borderRadius = isSelected
              ? `${adj.left ? 0 : 6}px ${adj.right ? 0 : 6}px ${adj.right ? 0 : 6}px ${adj.left ? 0 : 6}px`
              : '6px';

            return (
              <Box
                key={idx}
                onClick={() => handleDateClick(date, isCurrentMonth)}
                onMouseEnter={() => setHoveredDate(dateKey)}
                onMouseLeave={() => setHoveredDate(null)}
                sx={{
                  position: 'relative',
                  minHeight: { xs: 44, sm: 52 },
                  py: `${gap}px`,
                  borderRight: dayOfWeek < 6 ? '1px solid' : 'none',
                  borderBottom: row < 5 ? '1px solid' : 'none',
                  borderColor: 'grey.100',
                  bgcolor: !isCurrentMonth ? 'rgba(0,0,0,0.02)' : 'transparent',
                  cursor: 'pointer',
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
                  <Box
                    sx={{
                      position: 'relative',
                      zIndex: 1,
                      p: 0.5,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    {/* 日付 */}
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        fontSize: '0.7rem',
                        fontWeight: isTodayDate ? 700 : isSelected ? 600 : 500,
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
                      }}
                    >
                      {date.getDate()}
                    </Box>

                    {/* 帳合先ドット - イベントがある場合のみ */}
                    {dayEvents.length > 0 && (
                      <Box
                        sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 0.25,
                          justifyContent: 'center',
                          mt: 0.25,
                          maxWidth: '100%',
                        }}
                        onClick={(e) => {
                          if (!isSelectMode && dayEvents.length === 1) {
                            e.stopPropagation();
                            onEventClick?.(dayEvents[0]);
                          }
                        }}
                      >
                        {daySuppliers.slice(0, 4).map((supplier, i) => (
                          <Box
                            key={i}
                            sx={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              bgcolor: getSupplierDotColor(supplier),
                              flexShrink: 0,
                            }}
                          />
                        ))}
                        {daySuppliers.length > 4 && (
                          <Box
                            sx={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              bgcolor: SUPPLIER_COLOR_OVERFLOW,
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* フッター - 選択アクション */}
      {selectedDates.size > 0 && (
        <Box
          sx={{
            mt: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1,
          }}
        >
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'primary.main' }}>
            {selectionRangeText}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'grey.500' }}>
            ({selectedDates.size}日)
          </Typography>
          <Button
            size="small"
            variant="contained"
            onClick={handleLoadSelection}
            startIcon={<Search sx={{ fontSize: '0.9rem !important' }} />}
            sx={{
              px: 1.5,
              py: 0.25,
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 1,
            }}
          >
            読み込む
          </Button>
        </Box>
      )}

      {/* プレビューカード */}
      <Card
        sx={{
          mt: 1.5,
          bgcolor: 'grey.50',
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 2,
          minHeight: 140,
          maxHeight: 280,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ヘッダー */}
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderBottom: previewProducts.length > 0 ? '1px solid' : 'none',
            borderColor: 'grey.200',
            bgcolor: 'white',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'grey.700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>配分プレビュー</span>
            {previewProducts.length > 0 && (
              <Typography component="span" sx={{ fontSize: '0.65rem', color: 'grey.500' }}>
                {selectedDateDisplay} ({previewProducts.length}品)
              </Typography>
            )}
          </Typography>
        </Box>

        {/* コンテンツ */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
          {previewLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : previewProducts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                日付をタップすると配分内容のプレビューが表示されます
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* 日付ごとにグループ表示 */}
              {Array.from(groupedPreviewByDate.entries()).map(([dateKey, products]) => {
                const dateObj = new Date(dateKey);
                const dateDisplay = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

                return (
                  <Box key={dateKey}>
                    {/* 日付ヘッダー - 複数日選択時のみ表示 */}
                    {groupedPreviewByDate.size > 1 && (
                      <Typography
                        sx={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: 'primary.main',
                          mb: 0.75,
                          pb: 0.5,
                          borderBottom: '1px solid',
                          borderColor: 'primary.100',
                        }}
                      >
                        {dateDisplay}
                      </Typography>
                    )}

                    {/* 商品リスト */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {products.map((product, idx) => {
                        const supplierColor = getSupplierDotColor(product.supplier);
                        return (
                          <Box
                            key={idx}
                            sx={{
                              bgcolor: 'white',
                              px: 1.25,
                              py: 1,
                              borderRadius: 1.5,
                              border: '1px solid',
                              borderColor: 'grey.200',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            }}
                          >
                            {/* 帳合先 + 品名 */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: supplierColor,
                                  flexShrink: 0,
                                }}
                              />
                              <Typography
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: 500,
                                  color: supplierColor,
                                  flexShrink: 0,
                                }}
                              >
                                {product.supplier}
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  color: 'text.primary',
                                  flex: 1,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {product.productName}
                              </Typography>
                            </Box>

                            {/* 詳細情報 */}
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                pl: 2,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: '0.65rem',
                                  color: 'grey.600',
                                  flex: 1,
                                }}
                              >
                                {product.origin} / {product.specification}{product.unit}
                                {product.quantityPerPackage && ` / ${product.quantityPerPackage}${product.packageUnit}`}
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  color: 'primary.main',
                                  ml: 1,
                                  flexShrink: 0,
                                }}
                              >
                                {product.totalDelivery !== null ? product.totalDelivery.toLocaleString() : "-"}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Card>
    </Box>
  );
};

export default GlassCalendar;
