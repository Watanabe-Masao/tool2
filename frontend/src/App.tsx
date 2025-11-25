import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box, CssBaseline } from '@mui/material';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { NavigationProvider } from './context/NavigationContext';
import { ServiceProvider } from './context/ServiceContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NetworkStatus } from './components/common/NetworkStatus';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/LoginPage';

// Declare build info from Vite
declare const __BUILD_INFO__: {
  buildTime: string;
  gitCommit: string;
  gitBranch: string;
  gitCommitShort: string;
  gitCommitDate: string;
  gitCommitMessage: string;
};

// Log build information to console
console.log('%c🚀 配分表作成ツール', 'font-size: 20px; font-weight: bold; color: #1976d2');
console.log('%cビルド情報:', 'font-size: 14px; font-weight: bold; color: #666');
console.table({
  'ビルド時刻': __BUILD_INFO__.buildTime,
  'Gitブランチ': __BUILD_INFO__.gitBranch,
  'コミットハッシュ': __BUILD_INFO__.gitCommitShort,
  'コミット日時': __BUILD_INFO__.gitCommitDate,
  'コミットメッセージ': __BUILD_INFO__.gitCommitMessage,
});
console.log('%c完全なコミットハッシュ:', 'color: #999', __BUILD_INFO__.gitCommit);
console.log(`%cGitHub: https://github.com/Watanabe-Masao/tool2/commit/${__BUILD_INFO__.gitCommit}`, 'color: #0366d6');

// Expose build info globally for debugging
(window as any).__BUILD_INFO__ = __BUILD_INFO__;

/**
 * メインアプリケーション（内部）
 */
const AppContent: React.FC = () => {
  const { user, loading } = useAuthContext();

  // 認証状態確認中
  if (loading) {
    return (
      <>
        <CssBaseline />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* ログインページ（未認証のみ） */}
          <Route
            path="/login"
            element={user ? <Navigate to="/new-order" replace /> : <LoginPage />}
          />

          {/* メインレイアウト（認証済みのみ） */}
          <Route
            path="/*"
            element={user ? <MainLayout /> : <Navigate to="/login" replace />}
          />
        </Routes>
      </BrowserRouter>

      {/* ネットワークステータス表示（認証後のみ） */}
      {user && <NetworkStatus />}
    </>
  );
};

/**
 * エラーハンドリングコールバック
 * 本番環境ではエラーログサービスに送信することを想定
 */
const handleGlobalError = (error: Error, errorInfo: React.ErrorInfo) => {
  // 本番環境でのエラーログ送信（将来的にSentry等と連携可能）
  if (import.meta.env.PROD) {
    console.error('[App] Global error caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }
};

/**
 * メインアプリケーション
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary onError={handleGlobalError}>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <ServiceProvider>
              <NavigationProvider>
                <AppContent />
              </NavigationProvider>
            </ServiceProvider>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
