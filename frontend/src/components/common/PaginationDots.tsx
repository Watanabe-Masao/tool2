import React from 'react';
import { Box } from '@mui/material';

/**
 * ドットの状態
 */
export type DotStatus = 'complete' | 'incomplete' | 'empty';

/**
 * PaginationDotsのProps
 */
interface PaginationDotsProps {
  /** ドットの総数 */
  count: number;
  /** 現在アクティブなインデックス */
  activeIndex: number;
  /** インデックス変更時のコールバック */
  onIndexChange: (index: number) => void;
  /** 各ドットの状態を返す関数 */
  getStatus: (index: number) => DotStatus;
  /** 長押し開始時のコールバック（オプション） */
  onLongPressStart?: () => void;
  /** 長押し終了時のコールバック（オプション） */
  onLongPressEnd?: () => void;
}

/**
 * ページネーションドットコンポーネント
 *
 * 複数ページ/アイテム間のナビゲーションを提供する共通コンポーネント。
 * ドットの色で各アイテムの状態を表示します。
 *
 * - 青: 完了（complete）
 * - 黄色: 不完全（incomplete）
 * - 赤（破線）: 空（empty）
 */
export const PaginationDots: React.FC<PaginationDotsProps> = ({
  count,
  activeIndex,
  onIndexChange,
  getStatus,
  onLongPressStart,
  onLongPressEnd,
}) => {
  if (count <= 1) {
    return null;
  }

  return (
    <Box
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 0.5,
        mt: 2.5,
        py: 1.5,
        px: 2,
        mx: 'auto',
        maxWidth: 'fit-content',
        borderRadius: 3,
        bgcolor: 'rgba(0, 0, 0, 0.02)',
        userSelect: 'none',
      }}
    >
      {Array.from({ length: count }).map((_, index) => {
        const isActive = activeIndex === index;
        const status = getStatus(index);
        const isEmpty = status === 'empty';
        const isComplete = status === 'complete';

        // 非アクティブ時の色: 完了→青、不完全→黄色、空→赤
        const inactiveDotColor = isEmpty
          ? 'rgba(239, 83, 80, 0.4)'
          : isComplete
            ? 'rgba(25, 118, 210, 0.6)'
            : 'rgba(255, 193, 7, 0.7)';

        const inactiveHoverColor = isEmpty
          ? 'rgba(239, 83, 80, 0.5)'
          : isComplete
            ? 'rgba(25, 118, 210, 0.8)'
            : 'rgba(255, 193, 7, 0.9)';

        // アクティブ時のボーダー色
        const activeBorderColor = isEmpty
          ? 'rgba(239, 83, 80, 0.8)'
          : isComplete
            ? 'rgba(25, 118, 210, 0.8)'
            : 'rgba(255, 193, 7, 0.9)';

        return (
          <Box
            key={index}
            onClick={() => onIndexChange(index)}
            sx={{
              width: isActive ? 24 : 10,
              height: 10,
              borderRadius: isActive ? '5px' : '50%',
              bgcolor: isActive ? 'grey.800' : inactiveDotColor,
              border: isActive
                ? `2px solid ${activeBorderColor}`
                : isEmpty
                  ? '1px dashed rgba(239, 83, 80, 0.6)'
                  : 'none',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isActive
                ? '0 2px 8px rgba(0, 0, 0, 0.25)'
                : isComplete
                  ? '0 1px 4px rgba(25, 118, 210, 0.25)'
                  : 'none',
              '&:hover': {
                bgcolor: isActive ? 'grey.900' : inactiveHoverColor,
                transform: 'scale(1.15)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          />
        );
      })}
    </Box>
  );
};
