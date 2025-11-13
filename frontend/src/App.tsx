import React from 'react';
import { Route, Switch, Redirect } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { IonApp, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { theme } from './theme';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { NewOrderPage } from './pages/NewOrderPage';
import { CalendarPage } from './pages/CalendarPage';

/**
 * メインアプリケーション（内部）
 */
const AppContent: React.FC = () => {
  const { user, loading } = useAuthContext();

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Switch>
            {/* ログインページ */}
            <Route exact path="/login" component={LoginPage} />

            {/* 保護されたルート */}
            <ProtectedRoute path="/new-order" component={NewOrderPage} />
            <ProtectedRoute path="/calendar" component={CalendarPage} />

            {/* ルートパス: 認証状態に応じてリダイレクト */}
            <Route exact path="/">
              {loading ? null : user ? <Redirect to="/new-order" /> : <Redirect to="/login" />}
            </Route>

            {/* 404: ルートにリダイレクト */}
            <Route path="*">
              <Redirect to="/" />
            </Route>
          </Switch>
        </IonRouterOutlet>
      </IonReactRouter>
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
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
