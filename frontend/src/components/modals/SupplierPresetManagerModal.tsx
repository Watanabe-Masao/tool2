import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Box,
  Typography,
  Divider,
  Alert,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { useSupplierPresets, type SupplierPreset } from '@/hooks/useSupplierPresets';

interface SupplierPresetManagerModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 帳合先プリセット管理モーダル
 *
 * プリセットの追加・編集・削除ができます。
 */
export const SupplierPresetManagerModal: React.FC<SupplierPresetManagerModalProps> = ({
  open,
  onClose,
}) => {
  const { presets, addPreset, deletePreset, updatePreset } = useSupplierPresets();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [presetValue, setPresetValue] = useState('');
  const [error, setError] = useState('');

  /**
   * 新規プリセットを追加
   */
  const handleAdd = async () => {
    if (!presetValue.trim()) {
      setError('帳合先を入力してください');
      return;
    }

    const success = await addPreset(presetValue.trim());
    if (success) {
      setPresetValue('');
      setIsAdding(false);
      setError('');
    } else {
      setError('プリセットの追加に失敗しました');
    }
  };

  /**
   * プリセットを削除
   */
  const handleDelete = async (id: string) => {
    if (confirm('このプリセットを削除しますか？')) {
      const success = await deletePreset(id);
      if (!success) {
        setError('プリセットの削除に失敗しました');
      }
    }
  };

  /**
   * プリセット編集開始
   */
  const handleStartEdit = (preset: SupplierPreset) => {
    setEditingId(preset.id);
    setPresetValue(preset.supplier);
    setIsAdding(false);
  };

  /**
   * プリセット編集を保存
   */
  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!presetValue.trim()) {
      setError('帳合先を入力してください');
      return;
    }

    const success = await updatePreset(editingId, presetValue.trim());
    if (success) {
      setEditingId(null);
      setPresetValue('');
      setError('');
    } else {
      setError('プリセットの更新に失敗しました');
    }
  };

  /**
   * 編集をキャンセル
   */
  const handleCancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setPresetValue('');
    setError('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>帳合先プリセット管理</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* プリセット一覧 */}
        {presets.length === 0 && !isAdding && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            プリセットがまだ登録されていません。
            <br />
            「追加」ボタンから新しいプリセットを作成してください。
          </Typography>
        )}

        <List>
          {presets.map((preset) => (
            <React.Fragment key={preset.id}>
              {editingId === preset.id ? (
                // 編集モード
                <ListItem>
                  <Box sx={{ width: '100%' }}>
                    <TextField
                      label="帳合先"
                      value={presetValue}
                      onChange={(e) => setPresetValue(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ mb: 1 }}
                      placeholder="例: ○○商事"
                    />
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button size="small" onClick={handleCancelEdit}>
                        キャンセル
                      </Button>
                      <Button size="small" variant="contained" onClick={handleSaveEdit}>
                        保存
                      </Button>
                    </Box>
                  </Box>
                </ListItem>
              ) : (
                // 表示モード
                <ListItem>
                  <ListItemText primary={preset.supplier} />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleStartEdit(preset)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" onClick={() => handleDelete(preset.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              )}
              <Divider />
            </React.Fragment>
          ))}

          {/* 新規追加フォーム */}
          {isAdding && (
            <ListItem>
              <Box sx={{ width: '100%' }}>
                <TextField
                  label="帳合先"
                  placeholder="例: ○○商事"
                  value={presetValue}
                  onChange={(e) => setPresetValue(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ mb: 1 }}
                  autoFocus
                />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button size="small" onClick={handleCancelEdit}>
                    キャンセル
                  </Button>
                  <Button size="small" variant="contained" onClick={handleAdd}>
                    追加
                  </Button>
                </Box>
              </Box>
            </ListItem>
          )}
        </List>

        {/* 追加ボタン */}
        {!isAdding && !editingId && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setIsAdding(true)}
              fullWidth
            >
              新しいプリセットを追加
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
};
