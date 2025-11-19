import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Typography,
  Alert,
} from '@mui/material';
import { sendEmail } from '@/services/gmail/gmailService';

/**
 * EmailSendModalのProps
 */
interface EmailSendModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** モーダルを閉じる */
  onClose: () => void;
  /** 送信元ユーザー名（バイヤー名など） */
  userName?: string;
  /** 添付ファイル（Excel Blob） */
  attachment?: Blob;
  /** 添付ファイル名 */
  filename?: string;
}

/**
 * メール送信モーダル
 *
 * バックエンド（Resend API）を使用してExcelファイルを添付したメールを送信します。
 */
export const EmailSendModal: React.FC<EmailSendModalProps> = ({
  open,
  onClose,
  userName,
  attachment,
  filename,
}) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('配分表');
  const [body, setBody] = useState('配分表を添付いたします。\n\nよろしくお願いいたします。');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);

      if (!to) {
        throw new Error('宛先メールアドレスを入力してください。');
      }

      await sendEmail({
        to,
        subject,
        body,
        senderName: userName,
        attachment,
        filename,
      });

      alert('メールを送信しました！');
      onClose();
      // フィールドをリセット
      setTo('');
      setSubject('配分表');
      setBody('配分表を添付いたします。\n\nよろしくお願いいたします。');
    } catch (err) {
      console.error('Email send error:', err);
      setError(err instanceof Error ? err.message : 'メール送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>メール送信</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="宛先"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            fullWidth
            required
            placeholder="example@example.com"
            disabled={sending}
          />

          <TextField
            label="件名"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            required
            disabled={sending}
          />

          <TextField
            label="本文"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            fullWidth
            multiline
            rows={6}
            disabled={sending}
          />

          {attachment && filename && (
            <Box sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                添付ファイル:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {filename}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={sending}>
          キャンセル
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={sending || !to}
          startIcon={sending && <CircularProgress size={16} />}
        >
          {sending ? '送信中...' : '送信'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
