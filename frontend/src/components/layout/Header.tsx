import React, { useState, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Logout,
  AccountCircle,
  Google,
  Email,
  AddCircle,
  CalendarToday,
  Person,
  Settings,
} from '@mui/icons-material';
import { useAuthContext } from '@/context/AuthContext';
import { APP_NAME } from '@/utils/constants';

/**
 * ヘッダーコンポーネント
 *
 * アプリケーション名、ナビゲーションメニュー、ユーザー情報、ログアウト機能を提供します。
 */
export const Header: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const history = useHistory();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [reloadDialogOpen, setReloadDialogOpen] = useState(false);

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
   * オンラインチップ長押し開始（ページ更新用）
   */
  const handleChipLongPressStart = () => {
    longPressTimer.current = window.setTimeout(() => {
      setReloadDialogOpen(true);
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
   * ページを更新
   */
  const handleReload = () => {
    window.location.reload();
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

  /**
   * ナビゲーションアイテムの定義
   */
  const navigationItems = [
    { label: '新規作成', icon: <AddCircle />, path: '/new-order' },
    { label: 'カレンダー', icon: <CalendarToday />, path: '/calendar' },
    { label: 'ユーザー', icon: <Person />, path: '/profile' },
    { label: '店舗管理', icon: <Settings />, path: '/store-categories' },
  ];

  /**
   * ナビゲーション変更
   */
  const handleNavigationChange = (path: string) => {
    history.push(path);
  };

  const loginProvider = user ? getLoginProvider() : 'email';

  return (
    <>
      <AppBar position="sticky" elevation={1} sx={{ zIndex: 1300 }}>
        <Toolbar>
          {/* アプリケーション名 */}
          <Typography variant="h6" component="div" sx={{ fontWeight: 600, mr: 2 }}>
            {APP_NAME}
          </Typography>

          {/* ナビゲーションメニュー（モバイルではコンパクト表示） */}
          {user && (
            <Box sx={{ flexGrow: 1, display: 'flex', gap: isMobile ? 0.5 : 1 }}>
              {navigationItems.map((item) => (
                <IconButton
                  key={item.path}
                  onClick={() => handleNavigationChange(item.path)}
                  color="inherit"
                  size="small"
                  sx={{
                    borderRadius: 1,
                    px: isMobile ? 0.5 : 1.5,
                    py: 0.5,
                    color: location.pathname === item.path ? 'primary.main' : 'white',
                    bgcolor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                  title={item.label}
                >
                  {React.cloneElement(item.icon, {
                    fontSize: 'small',
                    sx: { color: location.pathname === item.path ? 'primary.main' : 'white' }
                  })}
                  {!isMobile && (
                    <Typography
                      variant="caption"
                      sx={{
                        ml: 0.5,
                        fontWeight: location.pathname === item.path ? 600 : 400,
                        color: location.pathname === item.path ? 'primary.main' : 'white',
                      }}
                    >
                      {item.label}
                    </Typography>
                  )}
                </IconButton>
              ))}
            </Box>
          )}

          {/* ユーザー情報 */}
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* オンラインチップ（長押しで手動更新） */}
              {!isMobile && (
                <Chip
                  icon={loginProvider === 'google' ? <Google fontSize="small" /> : <Email fontSize="small" />}
                  label="オンライン"
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
                  title="長押しでページを更新"
                />
              )}

              {/* アバター */}
              <IconButton
                size="small"
                edge="end"
                onClick={handleMenuOpen}
                color="inherit"
                aria-label="ユーザーメニュー"
              >
                {user.photoURL ? (
                  <Avatar src={user.photoURL} alt={user.displayName || ''} sx={{ width: 28, height: 28 }} />
                ) : (
                  <AccountCircle fontSize="small" />
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

      {/* ページ更新確認ダイアログ */}
      <Dialog open={reloadDialogOpen} onClose={() => setReloadDialogOpen(false)}>
        <DialogTitle>ページを更新</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ページを更新しますか？
          </DialogContentText>
          <DialogContentText sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
            保存されていない変更は失われる可能性があります。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReloadDialogOpen(false)} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleReload} color="primary" variant="contained">
            更新
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
