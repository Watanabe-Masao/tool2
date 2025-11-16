import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  IconButton,
  TextField,
  Box,
  Typography,
  Alert,
  Menu,
  MenuItem,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Close } from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useSupplierPresets, type SupplierPreset } from '@/hooks/useSupplierPresets';
import { FirestoreService } from '@/services/firebase/firestoreService';

interface SupplierPresetManagerModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * ソート可能なプリセットアイテムのProps
 */
interface SortablePresetItemProps {
  preset: SupplierPreset;
  onSwipeStart: (e: React.TouchEvent | React.MouseEvent, presetId: string) => void;
  onSwipeMove: (e: React.TouchEvent | React.MouseEvent) => void;
  onSwipeEnd: (preset: SupplierPreset) => void;
  swipeState: {
    id: string | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isSwiping: boolean;
  };
}

/**
 * ソート可能なプリセットアイテムコンポーネント
 */
const SortablePresetItem: React.FC<SortablePresetItemProps> = ({
  preset,
  onSwipeStart,
  onSwipeMove,
  onSwipeEnd,
  swipeState,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: preset.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCurrentSwiping = swipeState.id === preset.id;
  const deltaX = isCurrentSwiping ? swipeState.currentX - swipeState.startX : 0;
  const showDeleteHint = deltaX < -25;

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: showDeleteHint ? 'error.light' : 'transparent',
        transition: showDeleteHint ? 'none' : 'background-color 0.2s',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        '&:active': {
          cursor: 'grabbing',
        },
      }}
    >
      {/* 削除ヒント背景 */}
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
        onTouchStart={(e) => onSwipeStart(e, preset.id)}
        onTouchMove={onSwipeMove}
        onTouchEnd={() => onSwipeEnd(preset)}
        onMouseDown={(e) => onSwipeStart(e, preset.id)}
        onMouseMove={onSwipeMove}
        onMouseUp={() => onSwipeEnd(preset)}
        onMouseLeave={() => onSwipeEnd(preset)}
        {...listeners}
        {...attributes}
        sx={{
          py: 1.5,
          px: 2,
          transform: isCurrentSwiping ? `translateX(${deltaX}px)` : 'translateX(0)',
          transition: isCurrentSwiping ? 'none' : 'transform 0.2s',
          bgcolor: 'background.paper',
          cursor: isCurrentSwiping ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
        <Typography variant="body2">{preset.supplier}</Typography>
      </ListItemButton>
    </Box>
  );
};

/**
 * 帳合先プリセット管理モーダル
 *
 * プリセットの追加・編集・削除ができます。
 */
export const SupplierPresetManagerModal: React.FC<SupplierPresetManagerModalProps> = ({
  open,
  onClose,
}) => {
  const { presets, addPreset, deletePreset, updatePreset, loadPresets } = useSupplierPresets();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [presetValue, setPresetValue] = useState('');
  const [error, setError] = useState('');

  // 削除確認ダイアログの状態
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<SupplierPreset | null>(null);

  // ドラッグ中のアイテムID (dnd-kit用)
  const [activeId, setActiveId] = useState<string | null>(null);

  // dnd-kitのセンサー設定（長押しでドラッグ開始）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 500, // 500ms長押しでドラッグ開始
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // スワイプ状態管理（左右のみのスワイプ用）
  const [swipeState, setSwipeState] = useState<{
    id: string | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isSwiping: boolean;
  }>({
    id: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isSwiping: false,
  });

  // 長押し検出用のタイマー（+ボタン長押し用）
  const longPressTimer = useRef<number | null>(null);

  // 編集メニューのアンカー
  const [editMenuAnchor, setEditMenuAnchor] = useState<null | HTMLElement>(null);

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
      setEditingId(null);
      setError('');
    } else {
      setError('プリセットの追加に失敗しました');
    }
  };

  /**
   * プリセットを削除
   */
  const handleDeleteConfirm = async () => {
    if (!presetToDelete) return;

    const success = await deletePreset(presetToDelete.id);
    if (!success) {
      setError('プリセットの削除に失敗しました');
    }

    setDeleteConfirmOpen(false);
    setPresetToDelete(null);
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
    setPresetValue('');
    setError('');
  };

  /**
   * スワイプ開始
   */
  const handleSwipeStart = (e: React.TouchEvent | React.MouseEvent, presetId: string) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setSwipeState({
      id: presetId,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      isSwiping: false,
    });
  };

  /**
   * スワイプ中（左右のみ、上下は固定）
   */
  const handleSwipeMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!swipeState.id) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - swipeState.startX;
    const deltaY = clientY - swipeState.startY;

    // 上下の動きが大きい場合（10px以上）はスワイプをキャンセル
    if (Math.abs(deltaY) > 10) {
      setSwipeState({
        id: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        isSwiping: false,
      });
      return;
    }

    // 左右に5px以上動いたらスワイプとみなす
    if (Math.abs(deltaX) > 5) {
      setSwipeState((prev) => ({
        ...prev,
        currentX: clientX,
        currentY: clientY,
        isSwiping: true,
      }));
    }
  };

  /**
   * スワイプ終了
   */
  const handleSwipeEnd = async (preset: SupplierPreset) => {
    if (!swipeState.id || swipeState.id !== preset.id) return;

    const deltaX = swipeState.currentX - swipeState.startX;
    const threshold = 80; // スワイプ判定の閾値を80pxに調整

    // 左スワイプ（削除）
    if (deltaX < -threshold) {
      setPresetToDelete(preset);
      setDeleteConfirmOpen(true);
    }

    // スワイプ状態をリセット
    setSwipeState({
      id: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isSwiping: false,
    });
  };

  /**
   * ドラッグ開始 (dnd-kit)
   */
  const handleDndDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  /**
   * ドラッグ終了 (dnd-kit)
   */
  const handleDndDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const oldIndex = presets.findIndex((p) => p.id === active.id);
    const newIndex = presets.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      setActiveId(null);
      return;
    }

    // 並び替え
    const reordered = arrayMove(presets, oldIndex, newIndex);

    // displayOrderを更新
    const updates = reordered.map((item, index) => ({
      id: item.id,
      displayOrder: index,
    }));

    try {
      await FirestoreService.reorderSupplierPresets(updates);
      await loadPresets();
    } catch (error) {
      console.error('[SupplierPresetManagerModal] Failed to reorder:', error);
      setError('並び替えに失敗しました');
    }

    setActiveId(null);
  };

  /**
   * +ボタン長押し開始
   */
  const handleAddButtonLongPressStart = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    longPressTimer.current = window.setTimeout(() => {
      // 編集メニューを開く
      setEditMenuAnchor(e.currentTarget);
    }, 500);
  };

  /**
   * +ボタン長押し終了
   */
  const handleAddButtonLongPressEnd = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  /**
   * +ボタンクリック（長押しされていない場合は新規追加）
   */
  const handleAddButtonClick = () => {
    // 長押しタイマーがまだ残っていたら、通常のクリック（新規追加）
    if (longPressTimer.current) {
      setEditingId('new');
      setPresetValue('');
    }
  };

  /**
   * 編集メニューからプリセット選択
   */
  const handleSelectPresetForEdit = (preset: SupplierPreset) => {
    setEditingId(preset.id);
    setPresetValue(preset.supplier);
    setEditMenuAnchor(null);
  };

  /**
   * 編集メニューを閉じる
   */
  const handleCloseEditMenu = () => {
    setEditMenuAnchor(null);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6">帳合先プリセット管理</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              color="primary"
              onClick={handleAddButtonClick}
              onMouseDown={handleAddButtonLongPressStart}
              onMouseUp={handleAddButtonLongPressEnd}
              onMouseLeave={handleAddButtonLongPressEnd}
              onTouchStart={handleAddButtonLongPressStart}
              onTouchEnd={handleAddButtonLongPressEnd}
              title="追加（長押しで編集）"
            >
              <AddIcon />
            </IconButton>
            <IconButton size="small" onClick={onClose} edge="end">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* 編集フォーム */}
          {editingId && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <TextField
                label="帳合先"
                value={presetValue}
                onChange={(e) => setPresetValue(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 1 }}
                placeholder="例: ○○商事"
                autoFocus
              />
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button size="small" onClick={handleCancelEdit}>
                  キャンセル
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={editingId === 'new' ? handleAdd : handleSaveEdit}
                >
                  {editingId === 'new' ? '追加' : '保存'}
                </Button>
              </Box>
            </Box>
          )}

          {/* プリセット一覧 */}
          {presets.length === 0 && !editingId && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              プリセットがまだ登録されていません。
              <br />
              「+」ボタンから新しいプリセットを作成してください。
            </Typography>
          )}

          {presets.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDndDragStart}
              onDragEnd={handleDndDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <List sx={{ py: 0 }}>
                <SortableContext
                  items={presets.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {presets.map((preset) => (
                    <SortablePresetItem
                      key={preset.id}
                      preset={preset}
                      onSwipeStart={handleSwipeStart}
                      onSwipeMove={handleSwipeMove}
                      onSwipeEnd={handleSwipeEnd}
                      swipeState={swipeState}
                    />
                  ))}
                </SortableContext>
              </List>

              {/* ドラッグ中のオーバーレイ表示 */}
              <DragOverlay>
                {activeId ? (
                  <Box
                    sx={{
                      bgcolor: 'background.paper',
                      boxShadow: 3,
                      borderRadius: 1,
                      opacity: 0.9,
                    }}
                  >
                    {(() => {
                      const activePreset = presets.find((p) => p.id === activeId);
                      if (!activePreset) return null;

                      return (
                        <ListItemButton sx={{ py: 1.5, px: 2, cursor: 'grabbing' }}>
                          <Typography variant="body2">{activePreset.supplier}</Typography>
                        </ListItemButton>
                      );
                    })()}
                  </Box>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>プリセットを削除</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            このプリセットを削除してもよろしいですか？
          </Typography>
          {presetToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                {presetToDelete.supplier}
              </Typography>
            </Box>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            この操作は元に戻せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 編集メニュー */}
      <Menu
        anchorEl={editMenuAnchor}
        open={Boolean(editMenuAnchor)}
        onClose={handleCloseEditMenu}
      >
        <Typography variant="caption" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          編集するプリセットを選択
        </Typography>
        {presets.map((preset) => (
          <MenuItem key={preset.id} onClick={() => handleSelectPresetForEdit(preset)}>
            {preset.supplier}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
