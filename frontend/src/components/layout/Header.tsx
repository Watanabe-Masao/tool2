import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  useMediaQuery,
  useTheme,
  Chip,
  LinearProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Logout,
  AddCircle,
  CalendarToday,
  Person,
  Settings,
  Keyboard,
  History,
} from '@mui/icons-material';
import { useAuthContext } from '@/context/AuthContext';
import { useDataSync } from '@/hooks/useDataSync';
import { APP_NAME } from '@/utils/constants';
import { BuildInfo } from '@/components/common/BuildInfo';
import { ShortcutsHelpDialog } from '@/components/common/ShortcutsHelpDialog';

/**
 * ヘッダーコンポーネント
 *
 * アプリケーション名、ナビゲーションメニュー、ユーザー情報、ログアウト機能を提供します。
 */
export const Header: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const { isOnline, isSyncing, unsyncedCount } = useDataSync();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const [showClearMessage, setShowClearMessage] = useState(false);
  const [clearMessage, setClearMessage] = useState('');
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);

  const longPressTimer = useRef<number | null>(null);
  const longPressInterval = useRef<number | null>(null);

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
   * キャッシュクリアと再読み込み
   */
  const clearCacheAndReload = useCallback(async () => {
    try {
      setClearMessage('キャッシュをクリア中...');

      // Service Worker登録解除
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }

      // キャッシュクリア（Cache API）
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // localStorage クリア（ログイン情報は保持）
      const authKeys = ['firebase:authUser', 'firebase:host'];
      const authData: Record<string, string> = {};
      authKeys.forEach(key => {
        Object.keys(localStorage).forEach(storageKey => {
          if (storageKey.includes(key)) {
            authData[storageKey] = localStorage.getItem(storageKey) || '';
          }
        });
      });

      localStorage.clear();

      Object.entries(authData).forEach(([key, value]) => {
        if (value) localStorage.setItem(key, value);
      });

      // sessionStorage クリア
      sessionStorage.clear();

      setClearMessage('✅ キャッシュをクリアしました！ リロード中...');

      // 2秒後にリロード
      window.setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('キャッシュクリアエラー:', error);
      setClearMessage('❌ キャッシュクリアに失敗しました');
      window.setTimeout(() => setShowClearMessage(false), 3000);
    }
  }, []);

  /**
   * 長押し開始
   */
  const handleLongPressStart = useCallback(() => {
    setLongPressProgress(0);

    // プログレスバー更新
    longPressInterval.current = window.setInterval(() => {
      setLongPressProgress(prev => {
        if (prev >= 100) {
          if (longPressInterval.current) window.clearInterval(longPressInterval.current);
          return 100;
        }
        return prev + 5; // 2秒で100%（20回 × 100ms）
      });
    }, 100);

    // 2秒後にキャッシュクリア実行
    longPressTimer.current = window.setTimeout(() => {
      if (longPressInterval.current) window.clearInterval(longPressInterval.current);
      setLongPressProgress(100);
      setShowClearMessage(true);
      clearCacheAndReload();
    }, 2000);
  }, [clearCacheAndReload]);

  /**
   * 長押し終了（キャンセル）
   */
  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (longPressInterval.current) {
      window.clearInterval(longPressInterval.current);
      longPressInterval.current = null;
    }
    setLongPressProgress(0);
  }, []);

  /**
   * ナビゲーションアイテムの定義
   */
  const navigationItems = [
    { label: '新規作成', icon: <AddCircle />, path: '/new-order' },
    { label: 'カレンダー', icon: <CalendarToday />, path: '/calendar' },
    { label: '配分履歴', icon: <History />, path: '/allocation-history' },
    { label: 'ユーザー', icon: <Person />, path: '/profile' },
    { label: '各種管理', icon: <Settings />, path: '/store-categories' },
  ];

  /**
   * ナビゲーション変更
   */
  const handleNavigationChange = (path: string) => {
    navigate(path);
  };

  return (
    <>
      <AppBar position="sticky" elevation={1} sx={{ zIndex: 1300 }}>
        <Toolbar>
          {/* アプリケーション名 */}
          <Typography variant="h6" component="div" sx={{ fontWeight: 600, mr: 1.5 }}>
            {APP_NAME}
          </Typography>

          {/* オンライン/オフライン状態・同期状態 */}
          {user && (
            <Box sx={{ display: 'flex', gap: 0.5, mr: 2 }}>
              {/* オンライン/オフライン（長押しでキャッシュクリア） */}
              <Box sx={{ position: 'relative' }}>
                <Chip
                  label={isOnline ? 'オンライン' : 'オフライン'}
                  color={isOnline ? 'success' : 'warning'}
                  size="small"
                  variant="outlined"
                  onClick={() => {}} // クリック無効化
                  onMouseDown={handleLongPressStart}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={handleLongPressStart}
                  onTouchEnd={handleLongPressEnd}
                  sx={{
                    height: 24,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    borderColor: isOnline ? 'success.light' : 'warning.light',
                    color: 'white',
                    cursor: 'pointer',
                    userSelect: 'none',
                    '& .MuiChip-label': {
                      px: 1,
                    },
                  }}
                />
                {/* 長押しプログレスバー */}
                {longPressProgress > 0 && (
                  <LinearProgress
                    variant="determinate"
                    value={longPressProgress}
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      borderRadius: '0 0 4px 4px',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'primary.main',
                      },
                    }}
                  />
                )}
              </Box>

              {/* 同期中 */}
              {isSyncing && (
                <Chip
                  label="同期中"
                  color="info"
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 24,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    borderColor: 'info.light',
                    color: 'white',
                    '& .MuiChip-label': {
                      px: 1,
                    },
                  }}
                />
              )}

              {/* 未同期データ数 */}
              {unsyncedCount > 0 && (
                <Chip
                  label={`未同期${unsyncedCount}`}
                  color="warning"
                  size="small"
                  variant="filled"
                  sx={{
                    height: 24,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    '& .MuiChip-label': {
                      px: 1,
                    },
                  }}
                />
              )}
            </Box>
          )}

          {/* ナビゲーションメニュー（モバイルでは非表示、ボトムナビゲーションを使用） */}
          {user && !isMobile && (
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
              {navigationItems.map((item) => (
                <IconButton
                  key={item.path}
                  onClick={() => handleNavigationChange(item.path)}
                  color="inherit"
                  size="small"
                  sx={{
                    borderRadius: 1,
                    px: 1.5,
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
                </IconButton>
              ))}
            </Box>
          )}

          {/* モバイル時のスペーサー */}
          {user && isMobile && <Box sx={{ flexGrow: 1 }} />}

          {/* 右側アクション */}
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* キーボードショートカットヘルプボタン */}
              {!isMobile && (
                <IconButton
                  size="small"
                  onClick={() => setShortcutsDialogOpen(true)}
                  color="inherit"
                  aria-label="キーボードショートカット"
                  title="キーボードショートカット (Ctrl+/)"
                  sx={{
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  <Keyboard fontSize="small" />
                </IconButton>
              )}

              {/* ビルド情報ボタン */}
              <BuildInfo />

              {/* 設定メニューボタン */}
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                color="inherit"
                aria-label="設定メニューを開く"
                aria-haspopup="true"
                aria-expanded={Boolean(anchorEl)}
                aria-controls={anchorEl ? 'settings-menu' : undefined}
                sx={{
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <Settings fontSize="small" />
              </IconButton>

              {/* 設定メニュー */}
              <Menu
                id="settings-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                MenuListProps={{
                  'aria-labelledby': 'settings-menu',
                  role: 'menu',
                }}
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
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    ログイン中
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {user.displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>

                <Divider />

                {/* プロフィール */}
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate('/profile');
                  }}
                  role="menuitem"
                  aria-label="プロフィール"
                >
                  <Person fontSize="small" sx={{ mr: 1 }} />
                  プロフィール
                </MenuItem>

                {/* 店舗カテゴリー管理 */}
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate('/store-categories');
                  }}
                  role="menuitem"
                  aria-label="店舗カテゴリー管理"
                >
                  <Settings fontSize="small" sx={{ mr: 1 }} />
                  店舗カテゴリー管理
                </MenuItem>

                <Divider />

                {/* ログアウト */}
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    setLogoutDialogOpen(true);
                  }}
                  role="menuitem"
                  aria-label="ログアウトする"
                >
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
              <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
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

      {/* キャッシュクリアメッセージ */}
      <Snackbar
        open={showClearMessage}
        autoHideDuration={6000}
        onClose={() => setShowClearMessage(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowClearMessage(false)}
          severity={clearMessage.includes('✅') ? 'success' : clearMessage.includes('❌') ? 'error' : 'info'}
          sx={{ width: '100%' }}
        >
          {clearMessage}
        </Alert>
      </Snackbar>

      {/* キーボードショートカットヘルプダイアログ */}
      <ShortcutsHelpDialog
        open={shortcutsDialogOpen}
        onClose={() => setShortcutsDialogOpen(false)}
      />
    </>
  );
};
