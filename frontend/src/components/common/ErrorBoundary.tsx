import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { ErrorOutline, Refresh, Home } from '@mui/icons-material';

/**
 * ErrorBoundary Props
 */
interface ErrorBoundaryProps {
  /** 子要素 */
  children: ReactNode;
  /** カスタムフォールバックUI */
  fallback?: ReactNode;
  /** エラー発生時のコールバック */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** コンパクト表示（ページ全体ではなく一部のエラー用） */
  compact?: boolean;
}

/**
 * ErrorBoundary State
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary
 *
 * Reactコンポーネントツリー内で発生したJavaScriptエラーをキャッチし、
 * クラッシュしたコンポーネントツリーの代わりにフォールバックUIを表示します。
 *
 * @example
 * ```tsx
 * // 基本的な使用法
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // カスタムフォールバック
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // エラーログ送信
 * <ErrorBoundary onError={(error, info) => logErrorToService(error, info)}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught an error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    this.setState({ errorInfo });

    // エラーコールバックを呼び出し
    this.props.onError?.(error, errorInfo);
  }

  /**
   * エラー状態をリセットして再試行
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * ページを再読み込み
   */
  handleReload = () => {
    window.location.reload();
  };

  /**
   * ホームに戻る
   */
  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックが指定されている場合
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // コンパクト表示
      if (this.props.compact) {
        return (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              textAlign: 'center',
              bgcolor: 'error.50',
              border: '1px solid',
              borderColor: 'error.200',
              borderRadius: 2,
            }}
          >
            <ErrorOutline sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
            <Typography variant="body1" color="error.main" gutterBottom>
              このセクションでエラーが発生しました
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={this.handleReset}
              startIcon={<Refresh />}
            >
              再試行
            </Button>
          </Paper>
        );
      }

      // フルページ表示（デフォルト）
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          bgcolor="grey.100"
          p={3}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 480,
              textAlign: 'center',
              borderRadius: 2,
            }}
          >
            <ErrorOutline
              sx={{
                fontSize: 72,
                color: 'error.main',
                mb: 2,
              }}
            />
            <Typography variant="h5" gutterBottom fontWeight="bold">
              エラーが発生しました
            </Typography>
            <Typography color="text.secondary" paragraph sx={{ mb: 3 }}>
              申し訳ありませんが、予期しないエラーが発生しました。
              ページを再読み込みするか、ホームに戻ってください。
            </Typography>

            {/* 開発環境でのみエラー詳細を表示 */}
            {import.meta.env.DEV && this.state.error && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 3,
                  textAlign: 'left',
                  bgcolor: 'grey.50',
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'error.dark',
                    m: 0,
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Paper>
            )}

            <Box display="flex" gap={1} justifyContent="center" flexWrap="wrap">
              <Button
                variant="contained"
                color="primary"
                onClick={this.handleReload}
                startIcon={<Refresh />}
              >
                ページを再読み込み
              </Button>
              <Button
                variant="outlined"
                onClick={this.handleGoHome}
                startIcon={<Home />}
              >
                ホームに戻る
              </Button>
              <Button
                variant="text"
                color="inherit"
                onClick={this.handleReset}
              >
                再試行
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * 関数コンポーネント用のErrorBoundaryラッパー
 *
 * @example
 * ```tsx
 * const MyComponentWithErrorBoundary = withErrorBoundary(MyComponent, {
 *   fallback: <CustomFallback />,
 *   onError: (error) => console.error(error),
 * });
 * ```
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}
