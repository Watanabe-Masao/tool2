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

interface SupplierPresetTabProps {
  presets: SupplierPresetEntity[];
  onAddPreset: (name: string) => Promise<boolean>;
  onEditPreset: (id: string, name: string) => Promise<boolean>;
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
    const success = await onAddPreset(newSupplierName.trim());
    if (success) {
      setNewSupplierName('');
      setShowAddDialog(false);
    }
  };

  const handleEditSubmit = async () => {
    if (editingSupplier) {
      const success = await onEditPreset(editingSupplier.id, newSupplierName.trim());
      if (success) {
        setNewSupplierName('');
        setEditingSupplier(null);
        setShowEditDialog(false);
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
      </Typography>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              帳合先一覧
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setShowAddDialog(true)}
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
                      }}
                    >
                      <ListItemText primary={preset.supplier} />
                    </ListItemButton>
                  </Box>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>

      {/* 帳合先追加ダイアログ */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }}>
        <DialogTitle>帳合先を追加</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="帳合先"
            placeholder="例: ○○商事"
            fullWidth
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>キャンセル</Button>
          <Button onClick={handleAddSubmit} variant="contained">
            追加
          </Button>
        </DialogActions>
      </Dialog>

      {/* 帳合先編集ダイアログ */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }}>
        <DialogTitle>帳合先を編集</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="帳合先"
            fullWidth
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>キャンセル</Button>
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
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
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
