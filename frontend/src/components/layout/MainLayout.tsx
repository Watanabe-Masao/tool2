import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { GlobalKeyboardShortcuts } from '@/components/common/GlobalKeyboardShortcuts';
import { NewOrderPage } from '@/pages/NewOrderPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { UserProfilePage } from '@/pages/UserProfilePage';
import { StoreCategoryManagementPage } from '@/pages/StoreCategoryManagementPage';

/**
 * メインレイアウト（認証後）
 *
 * ヘッダーにナビゲーションを統合したシンプルなレイアウト。
 * モバイルデバイスではボトムナビゲーションを表示。
 */
export const MainLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* ヘッダー（ナビゲーション、ユーザー情報、ログアウト） */}
      <Header />

      {/* メインコンテンツエリア */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          // モバイルではボトムナビゲーション分の余白を確保
          paddingBottom: isMobile ? '64px' : 0,
        }}
      >
        <Routes>
          {/* 新規作成 */}
          <Route path="/new-order" element={<NewOrderPage />} />

          {/* カレンダー */}
          <Route path="/calendar" element={<CalendarPage />} />

          {/* ユーザープロフィール */}
          <Route path="/profile" element={<UserProfilePage />} />

          {/* 店舗カテゴリー管理 */}
          <Route path="/store-categories" element={<StoreCategoryManagementPage />} />

          {/* デフォルトリダイレクト */}
          <Route path="/" element={<Navigate to="/new-order" replace />} />
        </Routes>
      </Box>

      {/* モバイル用ボトムナビゲーション */}
      <MobileBottomNav />

      {/* グローバルキーボードショートカット */}
      <GlobalKeyboardShortcuts />
    </Box>
  );
};
