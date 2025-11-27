import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Snackbar, Alert, Backdrop, CircularProgress } from '@mui/material';
import type { AlertColor } from '@mui/material';
import { NOTIFICATION_DURATION } from '@/utils/constants';

/**
 * 通知コンテキストの型
 */
interface NotificationContextType {
  /** 成功メッセージを表示 */
  showSuccess: (message: string, duration?: number) => void;
  /** エラーメッセージを表示 */
  showError: (message: string, duration?: number) => void;
  /** 警告メッセージを表示 */
  showWarning: (message: string, duration?: number) => void;
  /** 情報メッセージを表示 */
  showInfo: (message: string, duration?: number) => void;
  /** ローディング表示を開始 */
  showLoading: () => void;
  /** ローディング表示を終了 */
  hideLoading: () => void;
}

/**
 * 通知の状態
 */
interface NotificationState {
  open: boolean;
  message: string;
  severity: AlertColor;
  duration: number;
}

/**
 * 通知コンテキスト
 */
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * 通知プロバイダーのProps
 */
interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * 通知プロバイダー
 *
 * アプリケーション全体で通知（スナックバー）とローディング表示を管理します。
 *
 * 使用例:
 * ```tsx
 * <NotificationProvider>
 *   <App />
 * </NotificationProvider>
 * ```
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    severity: 'info',
    duration: NOTIFICATION_DURATION.INFO,
  });
  const [loading, setLoading] = useState(false);

  /**
   * 通知を表示
   */
  const showNotification = useCallback(
    (message: string, severity: AlertColor, duration?: number) => {
      const defaultDuration =
        severity === 'success'
          ? NOTIFICATION_DURATION.SUCCESS
          : severity === 'error'
          ? NOTIFICATION_DURATION.ERROR
          : severity === 'warning'
          ? NOTIFICATION_DURATION.WARNING
          : NOTIFICATION_DURATION.INFO;

      setNotification({
        open: true,
        message,
        severity,
        duration: duration ?? defaultDuration,
      });
    },
    []
  );

  /**
   * 成功メッセージを表示
   */
  const showSuccess = useCallback(
    (message: string, duration?: number) => {
      showNotification(message, 'success', duration);
    },
    [showNotification]
  );

  /**
   * エラーメッセージを表示
   */
  const showError = useCallback(
    (message: string, duration?: number) => {
      showNotification(message, 'error', duration);
    },
    [showNotification]
  );

  /**
   * 警告メッセージを表示
   */
  const showWarning = useCallback(
    (message: string, duration?: number) => {
      showNotification(message, 'warning', duration);
    },
    [showNotification]
  );

  /**
   * 情報メッセージを表示
   */
  const showInfo = useCallback(
    (message: string, duration?: number) => {
      showNotification(message, 'info', duration);
    },
    [showNotification]
  );

  /**
   * ローディング表示を開始
   */
  const showLoading = useCallback(() => {
    setLoading(true);
  }, []);

  /**
   * ローディング表示を終了
   */
  const hideLoading = useCallback(() => {
    setLoading(false);
  }, []);

  /**
   * 通知を閉じる
   */
  const handleClose = useCallback((_event?: React.SyntheticEvent | Event, reason?: string) => {
    // クリックアウェイでは閉じない
    if (reason === 'clickaway') {
      return;
    }
    setNotification((prev) => ({ ...prev, open: false }));
  }, []);

  // Context valueをメモ化して安定した参照を維持（無限ループ防止）
  const value = useMemo<NotificationContextType>(
    () => ({
      showSuccess,
      showError,
      showWarning,
      showInfo,
      showLoading,
      hideLoading,
    }),
    [showSuccess, showError, showWarning, showInfo, showLoading, hideLoading]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* スナックバー（通知） */}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* ローディングオーバーレイ */}
      <Backdrop
        open={loading}
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }}
      >
        <CircularProgress color="inherit" size={60} />
      </Backdrop>
    </NotificationContext.Provider>
  );
};

/**
 * 通知コンテキストを使用するカスタムフック
 *
 * 使用例:
 * ```tsx
 * const { showSuccess, showError, showLoading, hideLoading } = useNotification();
 *
 * const handleSubmit = async () => {
 *   try {
 *     showLoading();
 *     await api.submit(data);
 *     showSuccess('保存しました');
 *   } catch (error) {
 *     showError('エラーが発生しました');
 *   } finally {
 *     hideLoading();
 *   }
 * };
 * ```
 */
export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
