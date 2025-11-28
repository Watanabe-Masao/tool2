import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { GlobalKeyboardShortcuts } from '@/components/common/GlobalKeyboardShortcuts';
import { NewOrderPage } from '@/pages/NewOrderPage';
import { UserProfilePage } from '@/pages/UserProfilePage';
import { StoreCategoryManagementPage } from '@/pages/StoreCategoryManagementPage';
import { AllocationHistoryPage } from '@/pages/AllocationHistoryPage';

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

          {/* カレンダー（配分履歴にリダイレクト） */}
          <Route path="/calendar" element={<Navigate to="/allocation-history" replace />} />

          {/* ユーザープロフィール */}
          <Route path="/profile" element={<UserProfilePage />} />

          {/* 店舗カテゴリー管理 */}
          <Route path="/store-categories" element={<StoreCategoryManagementPage />} />

          {/* 配分履歴 */}
          <Route path="/allocation-history" element={<AllocationHistoryPage />} />

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
