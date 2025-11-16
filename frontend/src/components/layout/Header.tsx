import React, { useState, useRef } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { Logout, AccountCircle, Google, Email } from '@mui/icons-material';
import { useAuthContext } from '@/context/AuthContext';
import { APP_NAME } from '@/utils/constants';

/**
 * ヘッダーコンポーネント
 *
 * アプリケーション名、ユーザー情報、ログアウト機能を提供します。
 */
export const Header: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // 長押し検出用のタイマー
  const longPressTimer = useRef<number | null>(null);

  /**
   * ユーザーメニューを開く
   */
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  /**
   * ユーザーメニューを閉じる
   */
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  /**
   * ログアウト処理
   */
  const handleLogout = async () => {
    try {
      await signOut();
      handleMenuClose();
      setLogoutDialogOpen(false);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  /**
   * オンラインチップ長押し開始
   */
  const handleChipLongPressStart = () => {
    longPressTimer.current = window.setTimeout(() => {
      setLogoutDialogOpen(true);
    }, 500);
  };

  /**
   * オンラインチップ長押し終了
   */
  const handleChipLongPressEnd = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

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

  return (
    <>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          {/* アプリケーション名 */}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {APP_NAME}
          </Typography>

          {/* ユーザー情報 */}
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* オンラインチップ（長押しでログアウト） */}
              <Chip
                icon={loginProvider === 'google' ? <Google fontSize="small" /> : <Email fontSize="small" />}
                label={user.displayName || user.email}
                color="success"
                size="small"
                onTouchStart={handleChipLongPressStart}
                onTouchEnd={handleChipLongPressEnd}
                onMouseDown={handleChipLongPressStart}
                onMouseUp={handleChipLongPressEnd}
                onMouseLeave={handleChipLongPressEnd}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'success.dark',
                  },
                }}
              />

              {/* アバター */}
              <IconButton
                size="large"
                edge="end"
                onClick={handleMenuOpen}
                color="inherit"
                aria-label="ユーザーメニュー"
              >
                {user.photoURL ? (
                  <Avatar src={user.photoURL} alt={user.displayName || ''} sx={{ width: 32, height: 32 }} />
                ) : (
                  <AccountCircle />
                )}
              </IconButton>

              {/* ユーザーメニュー */}
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                {/* ユーザー情報 */}
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {user.displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>

                <Divider />

                {/* ログアウト */}
                <MenuItem onClick={handleLogout}>
                  <Logout fontSize="small" sx={{ mr: 1 }} />
                  ログアウト
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* ログアウト確認ダイアログ */}
      <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)}>
        <DialogTitle>ログアウト確認</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ログアウトしてもよろしいですか？
          </DialogContentText>
          {user && (
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
          )}
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
    </>
  );
};
