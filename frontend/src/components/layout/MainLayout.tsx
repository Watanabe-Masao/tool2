import React from 'react';
import { IonRouterOutlet } from '@ionic/react';
import { Route, Redirect } from 'react-router-dom';
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
    <>
      {/* ヘッダー（ナビゲーション、ユーザー情報、ログアウト） */}
      <Header />

      {/* ルーティング */}
      <IonRouterOutlet>
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
      </IonRouterOutlet>
    </>
  );
};
