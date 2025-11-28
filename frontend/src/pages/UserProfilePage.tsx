import React, { useState, useEffect } from 'react';
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
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Logout,
  Google,
  Email,
  AccountCircle,
  Info,
  Edit,
  MailOutline,
  ContactMail,
  ArrowBack,
} from '@mui/icons-material';
import { useAuthContext } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserSettingsService } from '@/services/firebase/userSettingsService';
import type { UserSettings } from '@/types/userSettings';
import { EmailAddressBookManagerModal } from '@/components/modals/EmailAddressBookManagerModal';

/**
 * ユーザープロフィール・管理ページ
 *
 * ユーザー情報の表示、ログアウト機能を提供します。
 */
export const UserProfilePage: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [emailSettingsDialogOpen, setEmailSettingsDialogOpen] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [emailSenderName, setEmailSenderName] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerNameDialogOpen, setBuyerNameDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [buyerNameSaveSuccess, setBuyerNameSaveSuccess] = useState(false);
  const [addressBookModalOpen, setAddressBookModalOpen] = useState(false);

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
   * ユーザー設定を読み込み
   */
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user) return;

      try {
        const settings = await UserSettingsService.getOrCreate(user.uid);
        setUserSettings(settings);
        setEmailSenderName(settings.emailSenderName || user.displayName || user.email || '');
        setBuyerName(settings.buyerName || '');
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };

    loadUserSettings();
  }, [user]);

  /**
   * メール設定を開く
   */
  const handleOpenEmailSettings = () => {
    setEmailSenderName(userSettings?.emailSenderName || user?.displayName || user?.email || '');
    setSaveSuccess(false);
    setEmailSettingsDialogOpen(true);
  };

  /**
   * メール設定を保存
   */
  const handleSaveEmailSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (userSettings) {
        await UserSettingsService.update(user.uid, { emailSenderName });
      } else {
        await UserSettingsService.create({ userId: user.uid, emailSenderName });
      }

      const updatedSettings = await UserSettingsService.get(user.uid);
      setUserSettings(updatedSettings);
      setSaveSuccess(true);

      setTimeout(() => {
        setEmailSettingsDialogOpen(false);
        setSaveSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error saving email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 担当バイヤー名設定を開く
   */
  const handleOpenBuyerNameSettings = () => {
    setBuyerName(userSettings?.buyerName || '');
    setBuyerNameSaveSuccess(false);
    setBuyerNameDialogOpen(true);
  };

  /**
   * 担当バイヤー名設定を保存
   */
  const handleSaveBuyerNameSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (userSettings) {
        await UserSettingsService.update(user.uid, { buyerName });
      } else {
        await UserSettingsService.create({ userId: user.uid, buyerName });
      }

      const updatedSettings = await UserSettingsService.get(user.uid);
      setUserSettings(updatedSettings);
      setBuyerNameSaveSuccess(true);

      setTimeout(() => {
        setBuyerNameDialogOpen(false);
        setBuyerNameSaveSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error saving buyer name settings:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ログアウト処理
   */
  const handleLogout = async () => {
    try {
      await signOut();
      setLogoutDialogOpen(false);
      navigate('/login');
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
            {/* 戻るボタン */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <IconButton
                onClick={() => navigate('/new-order')}
                sx={{ mr: 1 }}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="h5" fontWeight="bold">
                ユーザー情報
              </Typography>
            </Box>

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

            {/* 担当バイヤー名カード */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    担当バイヤー名
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={handleOpenBuyerNameSettings}
                  >
                    編集
                  </Button>
                </Box>
                <List disablePadding>
                  <ListItem>
                    <ListItemIcon>
                      <AccountCircle color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="担当バイヤー名"
                      secondary={userSettings?.buyerName || '未設定'}
                      secondaryTypographyProps={{
                        sx: {
                          wordBreak: 'break-all',
                        },
                      }}
                    />
                  </ListItem>
                </List>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, px: 2 }}>
                  配分表に表示される担当バイヤー名を設定できます
                </Typography>
              </CardContent>
            </Card>

            {/* メール設定カード */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    メール設定
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={handleOpenEmailSettings}
                  >
                    編集
                  </Button>
                </Box>
                <List disablePadding>
                  <ListItem>
                    <ListItemIcon>
                      <MailOutline color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="送信者名"
                      secondary={userSettings?.emailSenderName || user.displayName || user.email || '未設定'}
                      secondaryTypographyProps={{
                        sx: {
                          wordBreak: 'break-all',
                        },
                      }}
                    />
                  </ListItem>
                  <Divider sx={{ my: 1 }} />
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => setAddressBookModalOpen(true)}>
                      <ListItemIcon>
                        <ContactMail color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="アドレス帳"
                        secondary="よく使うメールアドレスを登録"
                      />
                    </ListItemButton>
                  </ListItem>
                </List>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, px: 2 }}>
                  メール送信時に表示される送信者名を設定できます
                </Typography>
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
            </Box>
          </Box>

        {/* ログアウト確認ダイアログ */}
        <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)} sx={{ zIndex: 1500 }}>
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

        {/* メール設定編集ダイアログ */}
        <Dialog
          open={emailSettingsDialogOpen}
          onClose={() => !loading && setEmailSettingsDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          sx={{ zIndex: 1500 }}
        >
          <DialogTitle>メール設定</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              メール送信時に表示される送信者名を設定できます。
            </DialogContentText>
            {saveSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                保存しました
              </Alert>
            )}
            <TextField
              autoFocus
              fullWidth
              label="送信者名"
              value={emailSenderName}
              onChange={(e) => setEmailSenderName(e.target.value)}
              placeholder={user?.displayName || user?.email || ''}
              helperText="例: 山田 太郎、株式会社〇〇 など"
              disabled={loading}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEmailSettingsDialogOpen(false)} color="inherit" disabled={loading}>
              キャンセル
            </Button>
            <Button
              onClick={handleSaveEmailSettings}
              variant="contained"
              disabled={loading}
            >
              {loading ? '保存中...' : '保存'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 担当バイヤー名編集ダイアログ */}
        <Dialog
          open={buyerNameDialogOpen}
          onClose={() => !loading && setBuyerNameDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          sx={{ zIndex: 1500 }}
        >
          <DialogTitle>担当バイヤー名設定</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              配分表に表示される担当バイヤー名を設定できます。
            </DialogContentText>
            {buyerNameSaveSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                保存しました
              </Alert>
            )}
            <TextField
              autoFocus
              fullWidth
              label="担当バイヤー名"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="例: 山田 太郎"
              helperText="配分表の担当バイヤー欄に表示されます"
              disabled={loading}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBuyerNameDialogOpen(false)} color="inherit" disabled={loading}>
              キャンセル
            </Button>
            <Button
              onClick={handleSaveBuyerNameSettings}
              variant="contained"
              disabled={loading}
            >
              {loading ? '保存中...' : '保存'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* アドレス帳管理モーダル */}
        <EmailAddressBookManagerModal
          open={addressBookModalOpen}
          onClose={() => setAddressBookModalOpen(false)}
        />
    </Container>
  );
};
