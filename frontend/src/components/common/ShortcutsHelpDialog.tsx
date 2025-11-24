import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  Box,
  Typography,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import { Close, Keyboard } from '@mui/icons-material';

/**
 * ショートカット情報の型
 */
interface ShortcutInfo {
  category: string;
  shortcuts: Array<{
    key: string;
    description: string;
  }>;
}

/**
 * ShortcutsHelpDialogのProps
 */
interface ShortcutsHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * ショートカットヘルプダイアログ
 *
 * 利用可能なキーボードショートカットを表示します。
 */
export const ShortcutsHelpDialog: React.FC<ShortcutsHelpDialogProps> = ({
  open,
  onClose,
}) => {
  const shortcuts: ShortcutInfo[] = [
    {
      category: '一般',
      shortcuts: [
        { key: 'Ctrl + S', description: '保存' },
        { key: 'Ctrl + /', description: 'このヘルプを表示' },
        { key: 'Ctrl + Shift + D', description: 'ダークモード切り替え' },
      ],
    },
    {
      category: 'ナビゲーション',
      shortcuts: [
        { key: 'Ctrl + Enter', description: '次のステップへ' },
        { key: 'Ctrl + ←', description: '前の商品へ' },
        { key: 'Ctrl + →', description: '次の商品へ' },
      ],
    },
    {
      category: 'フォーム操作',
      shortcuts: [
        { key: 'Tab', description: '次の入力欄へ' },
        { key: 'Shift + Tab', description: '前の入力欄へ' },
        { key: 'Enter', description: '確定/次の入力欄へ' },
        { key: 'Esc', description: 'キャンセル/閉じる' },
      ],
    },
  ];

  /**
   * キーの表示用にフォーマット
   */
  const formatKey = (key: string): string[] => {
    return key.split(' + ').map((k) => k.trim());
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Keyboard color="primary" />
          <Typography variant="h6" fontWeight={600}>
            キーボードショートカット
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="閉じる"
          sx={{ ml: 2 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 3 }}>
        {shortcuts.map((category, categoryIndex) => (
          <Box key={category.category} sx={{ mb: categoryIndex < shortcuts.length - 1 ? 3 : 0 }}>
            {/* カテゴリー名 */}
            <Typography
              variant="subtitle2"
              fontWeight={600}
              color="text.secondary"
              sx={{ mb: 1.5, textTransform: 'uppercase', fontSize: '0.75rem' }}
            >
              {category.category}
            </Typography>

            {/* ショートカット一覧 */}
            <List sx={{ py: 0 }}>
              {category.shortcuts.map((shortcut, index) => (
                <React.Fragment key={shortcut.description}>
                  <ListItem
                    sx={{
                      px: 0,
                      py: 1.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    {/* 説明 */}
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {shortcut.description}
                    </Typography>

                    {/* キーの組み合わせ */}
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {formatKey(shortcut.key).map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <Chip
                            label={key}
                            size="small"
                            sx={{
                              height: '24px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              fontFamily: 'monospace',
                              bgcolor: 'action.hover',
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          />
                          {keyIndex < formatKey(shortcut.key).length - 1 && (
                            <Typography
                              variant="caption"
                              sx={{ mx: 0.25, color: 'text.secondary' }}
                            >
                              +
                            </Typography>
                          )}
                        </React.Fragment>
                      ))}
                    </Box>
                  </ListItem>
                  {index < category.shortcuts.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        ))}

        {/* フッター注記 */}
        <Box
          sx={{
            mt: 3,
            pt: 2,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            💡 ヒント: macOSでは「Ctrl」の代わりに「Cmd (⌘)」を使用してください
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            入力フィールド内ではショートカットは無効になります
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
