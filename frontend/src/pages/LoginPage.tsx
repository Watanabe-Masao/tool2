import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuthContext } from '@/context/AuthContext';
import { APP_NAME, APP_DESCRIPTION } from '@/utils/constants';

/**
 * ログインページ
 *
 * Googleアカウントでのログイン機能を提供します。
 */
export const LoginPage: React.FC = () => {
  const { signInWithGoogle } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Googleログインボタンクリック時の処理
   */
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
      // ログイン成功時は自動的にリダイレクトされる
    } catch (err) {
      console.error('ログインエラー:', err);
      setError('ログインに失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            textAlign: 'center',
            borderRadius: 2,
          }}
        >
          {/* アプリケーションタイトル */}
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: 'primary.main',
              mb: 2,
            }}
          >
            {APP_NAME}
          </Typography>

          {/* アプリケーション説明 */}
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            {APP_DESCRIPTION}
          </Typography>

          {/* エラーメッセージ */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Googleログインボタン */}
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
            onClick={handleGoogleSignIn}
            disabled={loading}
            sx={{
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 500,
              textTransform: 'none',
            }}
          >
            {loading ? 'ログイン中...' : 'Googleでログイン'}
          </Button>

          {/* 補足情報 */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 3, display: 'block' }}
          >
            Googleアカウントでログインすることで、
            <br />
            配分表の作成とデータの保存ができます。
          </Typography>
        </Paper>

        {/* フッター */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 4 }}
        >
          © 2025 配分表作成ツール
        </Typography>
      </Box>
    </Container>
  );
};
