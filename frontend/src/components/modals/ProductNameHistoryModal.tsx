import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  IconButton,
  Box,
  Typography,
  TextField,
  InputAdornment,
  DialogActions,
  Button,
  DialogContentText,
} from '@mui/material';
import { Close, Search, History } from '@mui/icons-material';

/**
 * ProductNameHistoryModalのProps
 */
interface ProductNameHistoryModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** 閉じる時のハンドラー */
  onClose: () => void;
  /** 品名選択時のハンドラー */
  onSelect: (name: string) => void;
  /** 品名履歴リスト */
  names: string[];
  /** 削除ハンドラー */
  onDelete?: (name: string) => Promise<void>;
}

/**
 * 品名履歴選択モーダル
 *
 * 品名の履歴を一覧表示し、選択または削除できるモーダルです。
 */
export const ProductNameHistoryModal: React.FC<ProductNameHistoryModalProps> = ({
  open,
  onClose,
  onSelect,
  names,
  onDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nameToDelete, setNameToDelete] = useState<string>('');

  // 長押し検出用のタイマー
  const longPressTimer = useRef<number | null>(null);

  /**
   * 検索フィルタリング
   */
  const filteredNames = names.filter((name) =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * 品名を選択
   */
  const handleSelectName = (name: string) => {
    onSelect(name);
    onClose();
    setSearchQuery('');
  };

  /**
   * 長押し開始
   */
  const handleLongPressStart = (name: string) => {
    longPressTimer.current = window.setTimeout(() => {
      setNameToDelete(name);
      setDeleteDialogOpen(true);
    }, 500);
  };

  /**
   * 長押し終了
   */
  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  /**
   * 削除を実行
   */
  const handleConfirmDelete = async () => {
    if (nameToDelete && onDelete) {
      try {
        await onDelete(nameToDelete);
        setDeleteDialogOpen(false);
        setNameToDelete('');
      } catch (error) {
        console.error('[ProductNameHistoryModal] Failed to delete name:', error);
      }
    }
  };

  /**
   * モーダルを閉じる
   */
  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '80vh',
            height: '80vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History />
            <Typography variant="h6">品名履歴</Typography>
          </Box>
          <IconButton size="small" onClick={handleClose} edge="end">
            <Close />
          </IconButton>
        </DialogTitle>

        {/* 検索フィールド */}
        <Box sx={{ px: 2, pb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="品名を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <DialogContent dividers sx={{ p: 0, flexGrow: 1, overflow: 'auto' }}>
          {filteredNames.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {searchQuery ? '該当する品名が見つかりませんでした' : '品名履歴がありません'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                商品を入力すると、履歴として保存されます
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {filteredNames.map((name, index) => (
                <ListItemButton
                  key={`${name}-${index}`}
                  onClick={() => handleSelectName(name)}
                  onTouchStart={() => handleLongPressStart(name)}
                  onTouchEnd={handleLongPressEnd}
                  onMouseDown={() => handleLongPressStart(name)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setNameToDelete(name);
                    setDeleteDialogOpen(true);
                  }}
                  sx={{
                    py: 1.5,
                    px: 2,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body1">{name}</Typography>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>履歴を削除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            品名「{nameToDelete}」の履歴を削除してもよろしいですか？
          </DialogContentText>
          <DialogContentText sx={{ mt: 2, fontSize: '0.875rem', color: 'error.main' }}>
            この操作は元に戻せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
