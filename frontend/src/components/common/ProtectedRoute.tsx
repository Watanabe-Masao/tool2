import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuthContext } from '@/context/AuthContext';

/**
 * 保護されたルートのProps
 */
interface ProtectedRouteProps {
  /** レンダリングする子要素 */
  children: React.ReactNode;
}

/**
 * 保護されたルート
 *
 * 認証済みユーザーのみアクセス可能なルートを定義します。
 * 未認証の場合はログインページにリダイレクトします。
 *
 * 使用例 (React Router v6):
 * ```tsx
 * <Route
 *   path="/new-order"
 *   element={
 *     <ProtectedRoute>
 *       <NewOrderPage />
 *     </ProtectedRoute>
 *   }
 * />
 * ```
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuthContext();
  const location = useLocation();

  // 認証状態を確認中
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // 認証済み: 子要素をレンダリング
  if (user) {
    return <>{children}</>;
  }

  // 未認証: ログインページにリダイレクト（元のパスを保存）
  return <Navigate to="/login" state={{ from: location }} replace />;
};
