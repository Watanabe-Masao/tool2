import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  DarkMode,
  LightMode,
  Assessment,
} from '@mui/icons-material';
import { haptic } from '@/utils/hapticFeedback';
import { useThemeContext } from '@/context/ThemeContext';
import { useNavigationContext } from '@/context/NavigationContext';
import { useOrderFormStore } from '@/stores/orderFormStore';

/**
 * ナビゲーションアイテムの定義
 */
const navigationItems = [
  {
    label: '進捗',
    value: 'progress',
    // アイコンは固定
  },
  {
    label: '新規作成',
    icon: <AddCircle />,
    path: '/new-order',
    value: 'new-order',
  },
  {
    label: '配分履歴',
    icon: <CalendarToday />,
    path: '/allocation-history',
    value: 'allocation-history',
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
 * - FloatingProgressSummary表示切り替え
 */
export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { mode: themeMode, toggleTheme } = useThemeContext();
  const { toggleProgressSummary } = useNavigationContext();

  // モーダル状態（Zustand）
  const setShowAllocationHistoryModal = useOrderFormStore((state) => state.setShowAllocationHistoryModal);

  // モバイル以外では表示しない
  if (!isMobile) {
    return null;
  }

  // 現在のパスから値を取得（進捗ボタンはハイライトしない）
  const currentValue = navigationItems.find((item) =>
    item.path && location.pathname.startsWith(item.path)
  )?.value || 'new-order';

  /**
   * ナビゲーション変更ハンドラー（モーダル表示）
   */
  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    // ハプティックフィードバック
    haptic('light');

    // 進捗表示切り替えの場合
    if (newValue === 'progress') {
      toggleProgressSummary();
      return;
    }

    // テーマ切り替えの場合
    if (newValue === 'theme') {
      toggleTheme();
      return;
    }

    // 配分履歴はモーダル表示
    if (newValue === 'allocation-history') {
      setShowAllocationHistoryModal(true);
      return;
    }

    // その他はページ遷移
    const item = navigationItems.find((item) => item.value === newValue);
    if (item && item.path) {
      navigate(item.path);
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
          // 進捗ボタン
          if (item.value === 'progress') {
            return (
              <BottomNavigationAction
                key={item.value}
                label={item.label}
                value={item.value}
                icon={<Assessment />}
                showLabel
              />
            );
          }

          // テーマ切り替えボタンは動的にアイコンを変更
          if (item.value === 'theme') {
            return (
              <BottomNavigationAction
                key={item.value}
                label={themeMode === 'dark' ? 'ライト' : 'ダーク'}
                value={item.value}
                icon={themeMode === 'dark' ? <LightMode /> : <DarkMode />}
                showLabel
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
              showLabel
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
};
