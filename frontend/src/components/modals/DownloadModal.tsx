import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Link,
  Box,
  Alert,
} from '@mui/material';
import { Download, Info, Email } from '@mui/icons-material';

/**
 * DownloadModalのProps
 */
interface DownloadModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** 閉じるハンドラ */
  onClose: () => void;
  /** ダウンロードURL */
  downloadUrl: string;
  /** ファイル名 */
  filename: string;
  /** メール送信ハンドラ（オプション） */
  onSendEmail?: () => void;
}

/**
 * ダウンロードモーダル（iPhone Safari専用）
 *
 * iPhone Safariではプログラマティックダウンロードができないため、
 * ユーザーが手動でダウンロードリンクをタップする必要があります。
 *
 * このモーダルは、ダウンロード手順を案内します。
 *
 * 使用例:
 * ```tsx
 * <DownloadModal
 *   open={showDownload}
 *   onClose={() => setShowDownload(false)}
 *   downloadUrl="/api/download/file.xlsx"
 *   filename="配分表.xlsx"
 * />
 * ```
 */
export const DownloadModal: React.FC<DownloadModalProps> = ({
  open,
  onClose,
  downloadUrl,
  filename,
  onSendEmail,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {/* ヘッダー */}
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Info color="primary" />
          <Typography variant="h6">ファイルのダウンロード</Typography>
        </Box>
      </DialogTitle>

      {/* コンテンツ */}
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          iPhone Safariでは自動ダウンロードができないため、
          <br />
          以下のボタンをタップしてファイルをダウンロードしてください。
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            ファイル名
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {filename}
          </Typography>
        </Box>

        {/* ダウンロード手順 */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            ダウンロード手順
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <ol style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li>下の「ダウンロード」ボタンをタップ</li>
              <li>Safari の共有メニューが表示されます</li>
              <li>「ファイルに保存」または「ダウンロード」を選択</li>
              <li>保存場所を選んで完了</li>
            </ol>
          </Typography>
        </Box>

        {/* ダウンロードボタン */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Link
            href={downloadUrl}
            download={filename}
            underline="none"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<Download />}
              fullWidth
            >
              ダウンロード
            </Button>
          </Link>
        </Box>
      </DialogContent>

      {/* フッター */}
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
        {onSendEmail && (
          <Button
            variant="outlined"
            startIcon={<Email />}
            onClick={onSendEmail}
          >
            メールで送信
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
