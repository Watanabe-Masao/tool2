import React from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';
import { Box } from '@mui/material';
import { Header } from '@/components/layout/Header';
import { NewOrderPage } from '@/pages/NewOrderPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { UserProfilePage } from '@/pages/UserProfilePage';
import { StoreCategoryManagementPage } from '@/pages/StoreCategoryManagementPage';

/**
 * メインレイアウト（認証後）
 *
 * ヘッダーにナビゲーションを統合したシンプルなレイアウト。
 */
export const MainLayout: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* ヘッダー（ナビゲーション、ユーザー情報、ログアウト） */}
      <Header />

      {/* メインコンテンツエリア */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Switch>
          {/* 新規作成 */}
          <Route exact path="/new-order" component={NewOrderPage} />

          {/* カレンダー */}
          <Route exact path="/calendar" component={CalendarPage} />

          {/* ユーザープロフィール */}
          <Route exact path="/profile" component={UserProfilePage} />

          {/* 店舗カテゴリー管理 */}
          <Route exact path="/store-categories" component={StoreCategoryManagementPage} />

          {/* デフォルトリダイレクト */}
          <Route exact path="/">
            <Redirect to="/new-order" />
          </Route>
        </Switch>
      </Box>
    </Box>
  );
};
