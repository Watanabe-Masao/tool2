import React from 'react';
import { Snackbar, Alert, AlertTitle, Box, LinearProgress, Chip } from '@mui/material';
import { CloudOff, CloudDone, Sync } from '@mui/icons-material';
import { useDataSync } from '@/hooks/useDataSync';

/**
 * NetworkStatusコンポーネント
 *
 * アプリ全体のネットワーク状態と同期状態を表示するグローバルコンポーネントです。
 * 画面下部に固定表示され、状態変化時に自動的にSnackbarで通知します。
 *
 * 機能:
 * - オンライン/オフライン状態の表示
 * - 同期中のインジケーター
 * - 未同期データ数の表示
 * - オフライン時の警告メッセージ
 * - オンライン復帰時の成功メッセージ
 *
 * 使用例:
 * ```tsx
 * // App.tsxなどでグローバルに配置
 * <NetworkStatus />
 * ```
 */
export const NetworkStatus: React.FC = () => {
  const { isOnline, isSyncing, unsyncedCount } = useDataSync();
  const [showOfflineAlert, setShowOfflineAlert] = React.useState(false);
  const [showOnlineAlert, setShowOnlineAlert] = React.useState(false);
  const [wasOffline, setWasOffline] = React.useState(false);

  /**
   * オンライン/オフライン状態の変化を監視
   */
  React.useEffect(() => {
    if (!isOnline) {
      // オフラインになった
      setShowOfflineAlert(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // オンラインに復帰した
      setShowOfflineAlert(false);
      setShowOnlineAlert(true);
      setWasOffline(false);
    }
  }, [isOnline, wasOffline]);

  /**
   * Snackbarを閉じる
   */
  const handleCloseOfflineAlert = () => {
    setShowOfflineAlert(false);
  };

  const handleCloseOnlineAlert = () => {
    setShowOnlineAlert(false);
  };

  return (
    <>
      {/* オフライン警告Snackbar */}
      <Snackbar
        open={showOfflineAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        onClose={handleCloseOfflineAlert}
      >
        <Alert
          severity="warning"
          onClose={handleCloseOfflineAlert}
          icon={<CloudOff />}
          sx={{ width: '100%', alignItems: 'center' }}
        >
          <AlertTitle>オフラインモード</AlertTitle>
          インターネット接続がありません。データはローカルに保存され、オンライン復帰時に自動同期されます。
        </Alert>
      </Snackbar>

      {/* オンライン復帰Snackbar */}
      <Snackbar
        open={showOnlineAlert}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        onClose={handleCloseOnlineAlert}
      >
        <Alert
          severity="success"
          onClose={handleCloseOnlineAlert}
          icon={<CloudDone />}
          sx={{ width: '100%', alignItems: 'center' }}
        >
          <AlertTitle>オンラインに復帰しました</AlertTitle>
          {unsyncedCount > 0
            ? `${unsyncedCount}件のデータを同期しています...`
            : 'すべてのデータが同期されています。'}
        </Alert>
      </Snackbar>

      {/* 同期中Snackbar（控えめな表示） */}
      {isSyncing && (
        <Snackbar
          open={isSyncing}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            severity="info"
            icon={<Sync />}
            sx={{ width: '100%', alignItems: 'center' }}
          >
            データを同期中...
            {unsyncedCount > 0 && ` (${unsyncedCount}件)`}
          </Alert>
        </Snackbar>
      )}
    </>
  );
};
