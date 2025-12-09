import React from 'react';
import {
  Box,
  Typography,
  Chip,
  ListItemButton,
  Checkbox,
  TextField,
} from '@mui/material';
import { Delete, PushPin, PushPinOutlined } from '@mui/icons-material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ProductHistoryItem } from '@/hooks/useProductHistory';
import { getCategoryName } from '@/utils/categories';

/**
 * スワイプ状態の型定義
 */
export interface SwipeState {
  id: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isSwiping: boolean;
}

/**
 * ソート可能なプリセットアイテムのProps
 */
export interface SortablePresetItemProps {
  preset: ProductHistoryItem;
  onSelect: (preset: ProductHistoryItem) => void;
  onSwipeStart: (e: React.TouchEvent | React.MouseEvent, presetId: string) => void;
  onSwipeMove: (e: React.TouchEvent | React.MouseEvent) => void;
  onSwipeEnd: (preset: ProductHistoryItem) => void;
  swipeState: SwipeState;
  multiSelect?: boolean;
  isSelected?: boolean;
  isDuplicate?: boolean;
  quantity?: number;
  onQuantityChange?: (presetId: string, quantity: number) => void;
}

/**
 * ソート可能なプリセットアイテムコンポーネント
 *
 * ドラッグ&ドロップとスワイプジェスチャーをサポートします。
 */
export const SortablePresetItem: React.FC<SortablePresetItemProps> = ({
  preset,
  onSelect,
  onSwipeStart,
  onSwipeMove,
  onSwipeEnd,
  swipeState,
  multiSelect = false,
  isSelected = false,
  isDuplicate = false,
  quantity = 0,
  onQuantityChange,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: preset.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCurrentSwiping = swipeState.id === preset.id;
  const deltaX = isCurrentSwiping ? swipeState.currentX - swipeState.startX : 0;
  const showDeleteHint = deltaX < -25;
  const showPinHint = deltaX > 25;

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: showDeleteHint
          ? 'error.light'
          : showPinHint
          ? 'primary.light'
          : 'transparent',
        transition: showDeleteHint || showPinHint ? 'none' : 'background-color 0.2s',
        opacity: isDragging ? 0.5 : 1,
        cursor: preset.pinned ? 'grab' : 'pointer',
        '&:active': {
          cursor: preset.pinned ? 'grabbing' : 'pointer',
        },
      }}
    >
      {/* 削除ヒント背景 */}
      {showDeleteHint && (
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'error.contrastText',
          }}
        >
          <Delete />
        </Box>
      )}

      {/* ピン留めヒント背景 */}
      {showPinHint && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.contrastText',
          }}
        >
          {preset.pinned ? <PushPinOutlined /> : <PushPin />}
        </Box>
      )}

      <ListItemButton
        onClick={() => onSelect(preset)}
        onTouchStart={(e) => onSwipeStart(e, preset.id)}
        onTouchMove={onSwipeMove}
        onTouchEnd={() => onSwipeEnd(preset)}
        onMouseDown={(e) => onSwipeStart(e, preset.id)}
        onMouseMove={onSwipeMove}
        onMouseUp={() => onSwipeEnd(preset)}
        onMouseLeave={() => onSwipeEnd(preset)}
        {...(preset.pinned && !multiSelect ? listeners : {})}
        {...(preset.pinned && !multiSelect ? attributes : {})}
        sx={{
          py: 1.5,
          px: 2,
          transform: isCurrentSwiping ? `translateX(${deltaX}px)` : 'translateX(0)',
          transition: isCurrentSwiping ? 'none' : 'transform 0.2s',
          bgcolor: isSelected ? 'primary.50' : 'background.paper',
          cursor: isCurrentSwiping ? 'grabbing' : (preset.pinned && !multiSelect) ? 'grab' : 'pointer',
          touchAction: multiSelect ? 'auto' : 'none',
        }}
      >
        {/* 複数選択モードのチェックボックスと数量入力 */}
        {multiSelect && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
            <Checkbox
              edge="start"
              checked={isSelected}
              tabIndex={-1}
              disableRipple
            />
            {/* 選択時に数量入力欄を表示 */}
            {isSelected && onQuantityChange && (
              <TextField
                type="number"
                size="small"
                value={quantity || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  const val = parseInt(e.target.value) || 0;
                  onQuantityChange(preset.id, val);
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="数量"
                inputProps={{
                  min: 0,
                  style: { textAlign: 'center', width: '60px' }
                }}
                sx={{
                  width: '80px',
                  '& .MuiOutlinedInput-root': {
                    height: '32px',
                  },
                }}
              />
            )}
          </Box>
        )}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* ピン留めアイコン */}
          {preset.pinned && !multiSelect && (
            <PushPin sx={{ fontSize: '1rem', color: 'primary.main' }} />
          )}
          <Box sx={{ flex: 1 }}>
            {/* 1行目: 品名 + カテゴリー */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" fontWeight="medium">
                {preset.name}
              </Typography>
              {preset.categoryCode && (
                <Chip
                  label={getCategoryName(preset.categoryCode)}
                  size="small"
                  color="primary"
                  sx={{ fontSize: '0.65rem', height: 18 }}
                />
              )}
              {isDuplicate && (
                <Chip
                  label="追加済み"
                  size="small"
                  color="warning"
                  sx={{ fontSize: '0.65rem', height: 18 }}
                />
              )}
            </Box>
            {/* 2行目: 産地、規格、入り数を横並び */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary">
                産地: {preset.origin}
              </Typography>
              {preset.specification && (
                <Typography variant="caption" color="text.secondary">
                  規格: {preset.specification}{preset.specificationUnit && `${preset.specificationUnit}`}
                </Typography>
              )}
              {preset.quantityPerPackage && (
                <Typography variant="caption" color="text.secondary">
                  入数: {preset.quantityPerPackage}
                  {preset.packageUnit && `${preset.packageUnit}`}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </ListItemButton>
    </Box>
  );
};
