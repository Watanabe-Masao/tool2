import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme,
  useMediaQuery,
  Box,
  Typography,
} from '@mui/material';
import {
  AddCircle,
  CalendarToday,
  DarkMode,
  LightMode,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { haptic } from '@/utils/hapticFeedback';
import { useThemeContext } from '@/context/ThemeContext';
import { useNavigationContext } from '@/context/NavigationContext';

/**
 * ナビゲーションアイテムの定義
 */
const navigationItems = [
  {
    label: '新規作成',
    icon: <AddCircle />,
    path: '/new-order',
    value: 'new-order',
  },
  {
    label: 'カレンダー',
    icon: <CalendarToday />,
    path: '/calendar',
    value: 'calendar',
  },
  {
    label: 'テーマ',
    value: 'theme',
    // アイコンは動的に変更
  },
];

/**
 * モバイル用ボトムナビゲーション
 *
 * モバイルデバイスで親指操作がしやすい下部ナビゲーションバー。
 * - タッチターゲットサイズ最適化
 * - ハプティックフィードバック対応
 * - アクティブ状態の視覚的強調
 * - スマートフォンのみ表示（タブレット・デスクトップでは非表示）
 * - ダークモード切り替え機能
 */
export const MobileBottomNav: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { mode: themeMode, toggleTheme } = useThemeContext();
  const {
    isStepNavigationActive,
    activeStep,
    totalSteps,
    onPrevStep,
    onNextStep,
  } = useNavigationContext();

  // モバイル以外では表示しない
  if (!isMobile) {
    return null;
  }

  // ステップナビゲーション表示中は専用UIを表示
  if (isStepNavigationActive) {
    return (
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
        }}
        elevation={3}
      >
        <Box
          sx={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
          }}
        >
          {/* 前のステップへ */}
          <BottomNavigationAction
            label="前へ"
            icon={<ChevronLeft />}
            onClick={() => {
              haptic('light');
              onPrevStep?.();
            }}
            disabled={!onPrevStep}
            sx={{
              flex: 1,
              maxWidth: '120px',
              '&.Mui-disabled': {
                opacity: 0.3,
              },
            }}
          />

          {/* 現在のステップ表示 */}
          <Box sx={{ flex: 1, textAlign: 'center', px: 1 }}>
            <Typography variant="body2" fontWeight="600" color="primary">
              ステップ {activeStep + 1} / {totalSteps}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {['店着日・帳合先', '商品情報', '価格・数量', '店舗配分', 'プレビュー'][activeStep] || ''}
            </Typography>
          </Box>

          {/* 次のステップへ */}
          <BottomNavigationAction
            label="次へ"
            icon={<ChevronRight />}
            onClick={() => {
              haptic('light');
              onNextStep?.();
            }}
            disabled={!onNextStep}
            sx={{
              flex: 1,
              maxWidth: '120px',
              '&.Mui-disabled': {
                opacity: 0.3,
              },
            }}
          />
        </Box>
      </Paper>
    );
  }

  // 現在のパスから値を取得
  const currentValue = navigationItems.find((item) =>
    item.path && location.pathname.startsWith(item.path)
  )?.value || 'new-order';

  /**
   * ナビゲーション変更ハンドラー
   */
  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    // ハプティックフィードバック
    haptic('light');

    // テーマ切り替えの場合
    if (newValue === 'theme') {
      toggleTheme();
      return;
    }

    // ページ遷移
    const item = navigationItems.find((item) => item.value === newValue);
    if (item && item.path) {
      history.push(item.path);
    }
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
      }}
      elevation={3}
    >
      <BottomNavigation
        value={currentValue}
        onChange={handleChange}
        showLabels
        sx={{
          height: '64px', // タッチターゲットサイズを確保
          '& .MuiBottomNavigationAction-root': {
            minWidth: '64px',
            padding: '8px 12px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&.Mui-selected': {
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.75rem',
                fontWeight: 600,
              },
              '& .MuiSvgIcon-root': {
                transform: 'scale(1.1)',
              },
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.7rem',
            marginTop: '4px',
          },
        }}
      >
        {navigationItems.map((item) => {
          // テーマ切り替えボタンは動的にアイコンを変更
          if (item.value === 'theme') {
            return (
              <BottomNavigationAction
                key={item.value}
                label={themeMode === 'dark' ? 'ライト' : 'ダーク'}
                value={item.value}
                icon={themeMode === 'dark' ? <LightMode /> : <DarkMode />}
                sx={{
                  '& .MuiSvgIcon-root': {
                    transition: 'transform 0.3s ease',
                  },
                  '&:active .MuiSvgIcon-root': {
                    transform: 'rotate(20deg) scale(1.1)',
                  },
                }}
              />
            );
          }

          return (
            <BottomNavigationAction
              key={item.value}
              label={item.label}
              value={item.value}
              icon={item.icon}
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
};
