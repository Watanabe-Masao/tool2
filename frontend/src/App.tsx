import React from 'react';
import { Route, Switch, Redirect } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { IonApp, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { CircularProgress, Box } from '@mui/material';
import { theme } from './theme';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { NetworkStatus } from './components/common/NetworkStatus';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/LoginPage';

/**
 * メインアプリケーション（内部）
 */
const AppContent: React.FC = () => {
  const { user, loading } = useAuthContext();

  // 認証状態確認中
  if (loading) {
    return (
      <IonApp>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress />
        </Box>
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Switch>
            {/* ログインページ（未認証のみ） */}
            <Route exact path="/login">
              {user ? <Redirect to="/new-order" /> : <LoginPage />}
            </Route>

            {/* メインレイアウト（認証済みのみ） */}
            <Route path="/">
              {user ? <MainLayout /> : <Redirect to="/login" />}
            </Route>
          </Switch>
        </IonRouterOutlet>
      </IonReactRouter>

      {/* ネットワークステータス表示（認証後のみ） */}
      {user && <NetworkStatus />}
    </IonApp>
  );
};

/**
 * メインアプリケーション
 */
const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;
