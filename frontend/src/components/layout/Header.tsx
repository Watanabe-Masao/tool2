import React, { useState } from 'react';
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
} from '@mui/material';
import { Logout, AccountCircle } from '@mui/icons-material';
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
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        {/* アプリケーション名 */}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
          {APP_NAME}
        </Typography>

        {/* ユーザー情報 */}
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* ユーザー名（デスクトップのみ） */}
            <Typography
              variant="body2"
              sx={{
                display: { xs: 'none', sm: 'block' },
                mr: 1,
              }}
            >
              {user.displayName || user.email}
            </Typography>

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
  );
};
