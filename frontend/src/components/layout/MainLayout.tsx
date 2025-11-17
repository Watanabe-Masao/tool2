import React from 'react';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/react';
import { Route, Redirect } from 'react-router-dom';
import { addCircle, calendar, settings } from 'ionicons/icons';
import { Header } from '@/components/layout/Header';
import { NewOrderPage } from '@/pages/NewOrderPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { StoreCategoryManagementPage } from '@/pages/StoreCategoryManagementPage';

/**
 * メインレイアウト（認証後）
 *
 * Ionic Reactのタブナビゲーションを使用したメインレイアウト。
 * ヘッダーとタブバーを含みます。
 */
export const MainLayout: React.FC = () => {
  return (
    <>
      {/* ヘッダー（ユーザー情報、ログアウト） */}
      <Header />

      {/* Ionicタブ */}
      <IonTabs>
        <IonRouterOutlet>
          {/* 新規作成タブ */}
          <Route exact path="/new-order" component={NewOrderPage} />

          {/* カレンダータブ */}
          <Route exact path="/calendar" component={CalendarPage} />

          {/* 店舗カテゴリー管理 */}
          <Route exact path="/store-categories" component={StoreCategoryManagementPage} />

          {/* デフォルトリダイレクト */}
          <Route exact path="/">
            <Redirect to="/new-order" />
          </Route>
        </IonRouterOutlet>

        {/* タブバー */}
        <IonTabBar slot="bottom">
          <IonTabButton tab="new-order" href="/new-order">
            <IonIcon icon={addCircle} />
            <IonLabel>新規作成</IonLabel>
          </IonTabButton>

          <IonTabButton tab="calendar" href="/calendar">
            <IonIcon icon={calendar} />
            <IonLabel>カレンダー</IonLabel>
          </IonTabButton>

          <IonTabButton tab="settings" href="/store-categories">
            <IonIcon icon={settings} />
            <IonLabel>店舗管理</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </>
  );
};
