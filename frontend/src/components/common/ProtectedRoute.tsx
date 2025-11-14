import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import type { RouteProps } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuthContext } from '@/context/AuthContext';

/**
 * 保護されたルートのProps
 */
interface ProtectedRouteProps extends RouteProps {
  /** レンダリングするコンポーネント */
  component: React.ComponentType<any>;
}

/**
 * 保護されたルート
 *
 * 認証済みユーザーのみアクセス可能なルートを定義します。
 * 未認証の場合はログインページにリダイレクトします。
 *
 * 使用例:
 * ```tsx
 * <ProtectedRoute path="/new-order" component={NewOrderPage} />
 * ```
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  component: Component,
  ...rest
}) => {
  const { user, loading } = useAuthContext();

  return (
    <Route
      {...rest}
      render={(props) => {
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

        // 認証済み: コンポーネントをレンダリング
        if (user) {
          return <Component {...props} />;
        }

        // 未認証: ログインページにリダイレクト
        return (
          <Redirect
            to={{
              pathname: '/login',
              state: { from: props.location },
            }}
          />
        );
      }}
    />
  );
};
