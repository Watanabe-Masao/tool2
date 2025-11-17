import React, { useState } from 'react';
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Logout,
  Google,
  Email,
  AccountCircle,
  Info,
} from '@mui/icons-material';
import { useAuthContext } from '@/context/AuthContext';
import { useHistory } from 'react-router-dom';

/**
 * ユーザープロフィール・管理ページ
 *
 * ユーザー情報の表示、ログアウト機能を提供します。
 */
export const UserProfilePage: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const history = useHistory();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  /**
   * ログインプロバイダーを判定
   */
  const getLoginProvider = (): 'google' | 'email' => {
    if (user?.providerData && user.providerData.length > 0) {
      const providerId = user.providerData[0].providerId;
      if (providerId === 'google.com') {
        return 'google';
      }
    }
    return 'email';
  };

  const loginProvider = user ? getLoginProvider() : 'email';

  /**
   * ログアウト処理
   */
  const handleLogout = async () => {
    try {
      await signOut();
      setLogoutDialogOpen(false);
      history.push('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="sm">
          <Box sx={{ py: 3 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
              ユーザー情報
            </Typography>

            {/* プロフィールカード */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: 'primary.main',
                      mb: 2,
                      fontSize: '2rem',
                    }}
                  >
                    {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="h6" fontWeight="medium">
                    {user.displayName || 'ユーザー'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* アカウント情報カード */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  アカウント情報
                </Typography>
                <List disablePadding>
                  <ListItem>
                    <ListItemIcon>
                      {loginProvider === 'google' ? (
                        <Google color="primary" />
                      ) : (
                        <Email color="primary" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary="ログイン方法"
                      secondary={loginProvider === 'google' ? 'Googleアカウント' : 'メールアドレス'}
                    />
                  </ListItem>
                  <Divider sx={{ my: 1 }} />
                  <ListItem>
                    <ListItemIcon>
                      <AccountCircle color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="ユーザーID"
                      secondary={user.uid}
                      secondaryTypographyProps={{
                        sx: {
                          fontSize: '0.75rem',
                          wordBreak: 'break-all',
                        },
                      }}
                    />
                  </ListItem>
                  <Divider sx={{ my: 1 }} />
                  <ListItem>
                    <ListItemIcon>
                      <Info color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="表示名"
                      secondary={user.displayName || '未設定'}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* アクションボタン */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="outlined"
                color="error"
                size="large"
                startIcon={<Logout />}
                onClick={() => setLogoutDialogOpen(true)}
                fullWidth
              >
                ログアウト
              </Button>
              <Button
                variant="outlined"
                onClick={() => history.push('/')}
                fullWidth
              >
                ホームに戻る
              </Button>
            </Box>
          </Box>
        </Container>

        {/* ログアウト確認ダイアログ */}
        <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)}>
          <DialogTitle>ログアウト確認</DialogTitle>
          <DialogContent>
            <DialogContentText>
              ログアウトしてもよろしいですか？
            </DialogContentText>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                {loginProvider === 'google' ? (
                  <Google fontSize="small" color="action" />
                ) : (
                  <Email fontSize="small" color="action" />
                )}
                <Typography variant="body2" fontWeight="medium">
                  {loginProvider === 'google' ? 'Googleアカウント' : 'メールアカウント'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {user.displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLogoutDialogOpen(false)} color="inherit">
              キャンセル
            </Button>
            <Button onClick={handleLogout} color="error" variant="contained">
              ログアウト
              </Button>
          </DialogActions>
        </Dialog>
    </Container>
  );
};
