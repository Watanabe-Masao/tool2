import React, { useState, useEffect } from 'react';
import { Box, Typography, Fade } from '@mui/material';
import {
  TouchApp,
  SwipeLeft,
  SwipeRight,
  SwipeUp,
  SwipeDown,
} from '@mui/icons-material';

/**
 * ジェスチャーヒントのタイプ
 */
export type GestureType =
  | 'swipe-horizontal'
  | 'swipe-vertical'
  | 'swipe-left'
  | 'swipe-right'
  | 'swipe-up'
  | 'swipe-down'
  | 'long-press'
  | 'tap';

/**
 * GestureHintのProps
 */
interface GestureHintProps {
  /** 表示するメッセージ */
  message: string;
  /** ジェスチャーのタイプ */
  type?: GestureType;
  /** 表示時間（ミリ秒、デフォルト: 3000ms） */
  duration?: number;
  /** 表示位置（デフォルト: 'top-right'） */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  /** 手動で表示を制御する場合のフラグ */
  show?: boolean;
  /** 閉じた時のコールバック */
  onClose?: () => void;
}

/**
 * ジェスチャーヒントコンポーネント
 *
 * タッチ操作のヒントを一時的に表示するコンポーネント。
 * 初回表示時や、新しいジェスチャーを説明する際に使用します。
 *
 * @example
 * ```tsx
 * <GestureHint
 *   message="左スワイプで削除、右スワイプでピン留め"
 *   type="swipe-horizontal"
 * />
 * ```
 */
export const GestureHint: React.FC<GestureHintProps> = ({
  message,
  type = 'tap',
  duration = 3000,
  position = 'top-right',
  show: controlledShow,
  onClose,
}) => {
  const [show, setShow] = useState(true);

  // 自動非表示タイマー
  useEffect(() => {
    if (controlledShow === undefined && duration > 0) {
      const timer = setTimeout(() => {
        setShow(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, controlledShow, onClose]);

  // 表示状態の決定
  const isVisible = controlledShow !== undefined ? controlledShow : show;

  // アイコンの選択
  const getIcon = () => {
    switch (type) {
      case 'swipe-horizontal':
        return <SwipeLeft sx={{ fontSize: '16px' }} />;
      case 'swipe-vertical':
        return <SwipeUp sx={{ fontSize: '16px' }} />;
      case 'swipe-left':
        return <SwipeLeft sx={{ fontSize: '16px' }} />;
      case 'swipe-right':
        return <SwipeRight sx={{ fontSize: '16px' }} />;
      case 'swipe-up':
        return <SwipeUp sx={{ fontSize: '16px' }} />;
      case 'swipe-down':
        return <SwipeDown sx={{ fontSize: '16px' }} />;
      case 'long-press':
        return <TouchApp sx={{ fontSize: '16px' }} />;
      case 'tap':
      default:
        return <TouchApp sx={{ fontSize: '16px' }} />;
    }
  };

  // 位置スタイルの計算
  const getPositionStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 1000,
    };

    switch (position) {
      case 'top-left':
        return { ...baseStyle, top: 8, left: 8 };
      case 'top-right':
        return { ...baseStyle, top: 8, right: 8 };
      case 'bottom-left':
        return { ...baseStyle, bottom: 8, left: 8 };
      case 'bottom-right':
        return { ...baseStyle, bottom: 8, right: 8 };
      case 'center':
        return {
          ...baseStyle,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
      default:
        return { ...baseStyle, top: 8, right: 8 };
    }
  };

  return (
    <Fade in={isVisible} timeout={300}>
      <Box
        sx={{
          ...getPositionStyle(),
          bgcolor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          px: 1.5,
          py: 0.75,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          fontSize: '0.75rem',
          maxWidth: '280px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none', // ユーザー操作を妨げない
        }}
      >
        {getIcon()}
        <Typography
          variant="caption"
          sx={{
            color: 'white',
            lineHeight: 1.4,
            fontSize: '0.75rem',
          }}
        >
          {message}
        </Typography>
      </Box>
    </Fade>
  );
};

/**
 * モバイル専用ジェスチャーヒント
 *
 * タッチデバイスでのみ表示されるジェスチャーヒント
 */
export const MobileGestureHint: React.FC<GestureHintProps> = (props) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // タッチデバイスの検出
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsMobile(hasTouchScreen);
  }, []);

  if (!isMobile) {
    return null;
  }

  return <GestureHint {...props} />;
};
