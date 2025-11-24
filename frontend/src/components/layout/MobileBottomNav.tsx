import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  AddCircle,
  CalendarToday,
  Person,
  Settings,
} from '@mui/icons-material';
import { haptic } from '@/utils/hapticFeedback';

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
    label: 'プロフィール',
    icon: <Person />,
    path: '/profile',
    value: 'profile',
  },
  {
    label: '設定',
    icon: <Settings />,
    path: '/store-categories',
    value: 'settings',
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
 */
export const MobileBottomNav: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // モバイル以外では表示しない
  if (!isMobile) {
    return null;
  }

  // 現在のパスから値を取得
  const currentValue = navigationItems.find((item) =>
    location.pathname.startsWith(item.path)
  )?.value || 'new-order';

  /**
   * ナビゲーション変更ハンドラー
   */
  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    const item = navigationItems.find((item) => item.value === newValue);
    if (item) {
      // ハプティックフィードバック
      haptic('light');
      // ページ遷移
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
        {navigationItems.map((item) => (
          <BottomNavigationAction
            key={item.value}
            label={item.label}
            value={item.value}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
};
