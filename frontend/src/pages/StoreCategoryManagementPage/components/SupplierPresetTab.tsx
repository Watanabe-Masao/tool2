/**
 * 帳合先管理タブ
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItemText,
  ListItemButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { useSupplierPresetManagement } from '../hooks/useSupplierPresetManagement';
import type { SupplierPresetEntity } from '@/hooks/useSupplierPresets';
import { MODAL_Z_INDEX } from '@/constants/zIndex';
import { getSupplierColor, SUPPLIER_COLORS } from '@/constants/supplierColors';

interface SupplierPresetTabProps {
  presets: SupplierPresetEntity[];
  onAddPreset: (name: string, centerFeeRate?: number) => Promise<boolean>;
  onEditPreset: (id: string, name: string, centerFeeRate?: number) => Promise<boolean>;
  onDeletePreset: (id: string) => Promise<boolean>;
  loadPresets: () => Promise<void>;
}

export const SupplierPresetTab: React.FC<SupplierPresetTabProps> = ({
  presets,
  onAddPreset,
  onEditPreset,
  onDeletePreset,
  loadPresets,
}) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [centerFeeRate, setCenterFeeRate] = useState<number | ''>(13);
  const [error, setError] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<SupplierPresetEntity | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierPresetEntity | null>(null);

  // ドラッグ&ドロップ
  const {
    dragState,
    handleLongPressStart,
    handleLongPressMove,
    handleLongPressEnd,
    getDragOffset,
    setItemRef,
  } = useSupplierPresetManagement({ presets, loadPresets });

  // スワイプジェスチャー
  const {
    swipeState,
    handleSwipeStart,
    handleSwipeMove,
    handleSwipeEnd,
    getSwipeOffset,
    resetSwipe,
  } = useSwipeGesture({
    threshold: 120,
    onSwipeLeft: (id) => {
      const supplier = presets.find((p) => p.id === id);
      if (supplier) {
        setEditingSupplier(supplier);
        setNewSupplierName(supplier.supplier);
        setCenterFeeRate(supplier.centerFeeRate ?? 13);
        setError('');
        setShowEditDialog(true);
      }
    },
    onSwipeRight: (id) => {
      const supplier = presets.find((p) => p.id === id);
      if (supplier) {
        setSupplierToDelete(supplier);
        setShowDeleteDialog(true);
      }
    },
  });

  const handleAddSubmit = async () => {
    if (!newSupplierName.trim()) {
      setError('帳合先を入力してください');
      return;
    }

    // 空文字列の場合はデフォルト値13を使用
    const feeRate = centerFeeRate === '' ? 13 : centerFeeRate;

    if (feeRate < 0 || feeRate > 100) {
      setError('センターフィー率は0〜100の範囲で入力してください');
      return;
    }

    console.log('[SupplierPresetTab] Adding preset:', { supplier: newSupplierName.trim(), centerFeeRate: feeRate });
    const success = await onAddPreset(newSupplierName.trim(), feeRate);
    if (success) {
      setNewSupplierName('');
      setCenterFeeRate(13);
      setError('');
      setShowAddDialog(false);
    } else {
      setError('帳合先の追加に失敗しました');
    }
  };

  const handleEditSubmit = async () => {
    if (!newSupplierName.trim()) {
      setError('帳合先を入力してください');
      return;
    }

    // 空文字列の場合はデフォルト値13を使用
    const feeRate = centerFeeRate === '' ? 13 : centerFeeRate;

    if (feeRate < 0 || feeRate > 100) {
      setError('センターフィー率は0〜100の範囲で入力してください');
      return;
    }

    if (editingSupplier) {
      console.log('[SupplierPresetTab] Updating preset:', { id: editingSupplier.id, supplier: newSupplierName.trim(), centerFeeRate: feeRate });
      const success = await onEditPreset(editingSupplier.id, newSupplierName.trim(), feeRate);
      if (success) {
        setNewSupplierName('');
        setCenterFeeRate(13);
        setError('');
        setEditingSupplier(null);
        setShowEditDialog(false);
      } else {
        setError('帳合先の更新に失敗しました');
      }
    }
  };

  const handleDeleteSubmit = async () => {
    if (supplierToDelete) {
      await onDeletePreset(supplierToDelete.id);
      setSupplierToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        帳合先を管理します。長押しで並び替え、左にスワイプで編集、右にスワイプで削除できます。
        <br />
        <Typography component="span" variant="caption" color="text.secondary">
          ※ 表示順でイメージカラーが自動的に割り当てられます（最大{SUPPLIER_COLORS.length}色）
        </Typography>
      </Typography>

      <Card sx={{ overflow: 'visible' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              帳合先一覧
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setNewSupplierName('');
                setCenterFeeRate(13);
                setError('');
                setShowAddDialog(true);
              }}
            >
              追加
            </Button>
          </Box>

          {presets.length === 0 ? (
            <Alert severity="info">帳合先がまだ登録されていません</Alert>
          ) : (
            <List sx={{ py: 0, position: 'relative' }}>
              {presets.map((preset, index) => {
                const isCurrentSwiping = swipeState.id === preset.id && !dragState.isDragging;
                const swipeDeltaX = getSwipeOffset(preset.id);
                const showEditHint = swipeDeltaX < -25;
                const showDeleteHint = swipeDeltaX > 25;
                const isDragging = dragState.isDragging && dragState.draggingId === preset.id;
                const isDragOver = dragState.isDragging && dragState.dragOverIndex === index && !isDragging;
                const dragDeltaY = getDragOffset(preset.id);
                const supplierColor = getSupplierColor(index);

                return (
                  <Box
                    key={preset.id}
                    ref={(el: HTMLElement | null) => setItemRef(preset.id, el)}
                    sx={{
                      position: 'relative',
                      overflow: isDragging ? 'visible' : 'hidden',
                      bgcolor: showDeleteHint ? 'error.light' : showEditHint ? 'info.light' : isDragOver ? 'primary.light' : 'transparent',
                      transition: showDeleteHint || showEditHint || isDragging ? 'none' : 'background-color 0.2s',
                      borderTop: isDragOver && !isDragging ? '3px solid' : 'none',
                      borderColor: 'primary.main',
                      zIndex: isDragging ? 1000 : 1,
                      mb: 0.5,
                    }}
                  >
                    {showEditHint && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 80,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'info.contrastText',
                        }}
                      >
                        <EditIcon />
                      </Box>
                    )}

                    {showDeleteHint && (
                      <Box
                        sx={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: 80,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'error.contrastText',
                        }}
                      >
                        <DeleteIcon />
                      </Box>
                    )}

                    <ListItemButton
                      onTouchStart={(e) => {
                        if (!dragState.isDragging) {
                          handleSwipeStart(e, preset.id);
                        }
                        handleLongPressStart(e, preset.id);
                      }}
                      onTouchMove={(e) => {
                        if (dragState.isDragging) {
                          handleLongPressMove(e);
                          resetSwipe();
                        } else {
                          handleSwipeMove(e);
                          handleLongPressMove(e);
                        }
                      }}
                      onTouchEnd={() => {
                        if (!dragState.isDragging) {
                          handleSwipeEnd(preset.id);
                        }
                        handleLongPressEnd();
                      }}
                      onMouseDown={(e) => {
                        if (!dragState.isDragging) {
                          handleSwipeStart(e, preset.id);
                        }
                        handleLongPressStart(e, preset.id);
                      }}
                      onMouseMove={(e) => {
                        if (dragState.isDragging) {
                          handleLongPressMove(e);
                          resetSwipe();
                        } else {
                          handleSwipeMove(e);
                          handleLongPressMove(e);
                        }
                      }}
                      onMouseUp={() => {
                        if (!dragState.isDragging) {
                          handleSwipeEnd(preset.id);
                        }
                        handleLongPressEnd();
                      }}
                      onMouseLeave={() => {
                        if (!dragState.isDragging) {
                          handleSwipeEnd(preset.id);
                        }
                        handleLongPressEnd();
                      }}
                      sx={{
                        py: 1.5,
                        px: 2,
                        pl: 3,
                        transform: isDragging
                          ? `translateY(${dragDeltaY}px)`
                          : isCurrentSwiping
                            ? `translateX(${swipeDeltaX}px)`
                            : 'translate(0, 0)',
                        transition: isDragging || isCurrentSwiping ? 'none' : 'transform 0.2s',
                        bgcolor: 'background.paper',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        opacity: isDragging ? 0.9 : 1,
                        boxShadow: isDragging ? 4 : 0,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'grey.200',
                        position: 'relative',
                        // カラー「耳」- 左側のアクセント
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 4,
                          height: '60%',
                          bgcolor: supplierColor,
                          borderRadius: '0 4px 4px 0',
                          boxShadow: `0 0 8px ${supplierColor}40`,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {/* カラードット */}
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: supplierColor,
                            flexShrink: 0,
                            boxShadow: `0 0 4px ${supplierColor}60`,
                          }}
                        />
                        <ListItemText
                          primary={preset.supplier}
                          primaryTypographyProps={{
                            fontWeight: 500,
                            fontSize: '0.95rem',
                          }}
                        />
                      </Box>
                      {/* 順番バッジ */}
                      <Box
                        sx={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          bgcolor: `${supplierColor}15`,
                          border: `1.5px solid ${supplierColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: supplierColor,
                        }}
                      >
                        {index + 1}
                      </Box>
                    </ListItemButton>
                  </Box>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>

      {/* 帳合先追加ダイアログ */}
      <Dialog
        open={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setError('');
        }}
        sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }}
      >
        <DialogTitle>帳合先を追加</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="帳合先"
            placeholder="例: ○○商事"
            fullWidth
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="センターフィー率（%）"
            type="number"
            fullWidth
            value={centerFeeRate}
            onChange={(e) => {
              const value = e.target.value;
              setCenterFeeRate(value === '' ? '' : Number(value));
            }}
            placeholder="例: 13"
            inputProps={{ min: 0, max: 100, step: 0.1 }}
          />
          {/* 割り当てカラーのプレビュー */}
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              割り当てカラー:
            </Typography>
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: getSupplierColor(presets.length),
                boxShadow: `0 0 4px ${getSupplierColor(presets.length)}60`,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              ({presets.length + 1}番目)
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowAddDialog(false);
              setError('');
            }}
          >
            キャンセル
          </Button>
          <Button onClick={handleAddSubmit} variant="contained">
            追加
          </Button>
        </DialogActions>
      </Dialog>

      {/* 帳合先編集ダイアログ */}
      <Dialog
        open={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setError('');
        }}
        sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }}
      >
        <DialogTitle>帳合先を編集</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="帳合先"
            fullWidth
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="センターフィー率（%）"
            type="number"
            fullWidth
            value={centerFeeRate}
            onChange={(e) => {
              const value = e.target.value;
              setCenterFeeRate(value === '' ? '' : Number(value));
            }}
            placeholder="例: 13"
            inputProps={{ min: 0, max: 100, step: 0.1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowEditDialog(false);
              setError('');
            }}
          >
            キャンセル
          </Button>
          <Button onClick={handleEditSubmit} variant="contained">
            更新
          </Button>
        </DialogActions>
      </Dialog>

      {/* 帳合先削除確認ダイアログ */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }}>
        <DialogTitle>帳合先を削除</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            この帳合先を削除してもよろしいですか？
          </Typography>
          {supplierToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: getSupplierColor(presets.findIndex(p => p.id === supplierToDelete.id)),
                }}
              />
              <Typography variant="body2" fontWeight="medium">
                {supplierToDelete.supplier}
              </Typography>
            </Box>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            この操作は元に戻せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleDeleteSubmit} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
