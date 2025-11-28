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
import { useEmailAddressBook, type EmailAddressEntity } from '@/hooks/useEmailAddressBook';
import { useFirestoreService } from '@/context/ServiceContext';

interface EmailAddressBookManagerModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * ソート可能なアドレス帳アイテムのProps
 */
interface SortableAddressItemProps {
  entry: EmailAddressEntity;
  onSwipeStart: (e: React.TouchEvent | React.MouseEvent, entryId: string) => void;
  onSwipeMove: (e: React.TouchEvent | React.MouseEvent) => void;
  onSwipeEnd: (entry: EmailAddressEntity) => void;
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
 * ソート可能なアドレス帳アイテムコンポーネント
 */
const SortableAddressItem: React.FC<SortableAddressItemProps> = ({
  entry,
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
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCurrentSwiping = swipeState.id === entry.id;
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
        onTouchStart={(e) => onSwipeStart(e, entry.id)}
        onTouchMove={onSwipeMove}
        onTouchEnd={() => onSwipeEnd(entry)}
        onMouseDown={(e) => onSwipeStart(e, entry.id)}
        onMouseMove={onSwipeMove}
        onMouseUp={() => onSwipeEnd(entry)}
        onMouseLeave={() => onSwipeEnd(entry)}
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <Typography variant="body2" fontWeight="medium">
          {entry.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {entry.email}
        </Typography>
      </ListItemButton>
    </Box>
  );
};

/**
 * メールアドレス帳管理モーダル
 *
 * アドレス帳の追加・編集・削除ができます。
 * ドラッグ&ドロップで並び替え、スワイプで削除できます。
 */
export const EmailAddressBookManagerModal: React.FC<EmailAddressBookManagerModalProps> = ({
  open,
  onClose,
}) => {
  const firestoreService = useFirestoreService();
  const { entries, addEntry, deleteEntry, updateEntry, loadEntries } = useEmailAddressBook();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameValue, setNameValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [error, setError] = useState('');

  // 削除確認ダイアログの状態
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<EmailAddressEntity | null>(null);

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
   * 新規エントリを追加
   */
  const handleAdd = async () => {
    if (!nameValue.trim()) {
      setError('表示名を入力してください');
      return;
    }
    if (!emailValue.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }
    // 簡易的なメールバリデーション
    if (!emailValue.includes('@')) {
      setError('有効なメールアドレスを入力してください');
      return;
    }

    const success = await addEntry(nameValue.trim(), emailValue.trim());
    if (success) {
      setNameValue('');
      setEmailValue('');
      setEditingId(null);
      setError('');
    } else {
      setError('アドレス帳の追加に失敗しました');
    }
  };

  /**
   * エントリを削除
   */
  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;

    const success = await deleteEntry(entryToDelete.id);
    if (!success) {
      setError('アドレス帳の削除に失敗しました');
    }

    setDeleteConfirmOpen(false);
    setEntryToDelete(null);
  };

  /**
   * エントリ編集を保存
   */
  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!nameValue.trim()) {
      setError('表示名を入力してください');
      return;
    }
    if (!emailValue.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }
    if (!emailValue.includes('@')) {
      setError('有効なメールアドレスを入力してください');
      return;
    }

    const success = await updateEntry(editingId, nameValue.trim(), emailValue.trim());
    if (success) {
      setEditingId(null);
      setNameValue('');
      setEmailValue('');
      setError('');
    } else {
      setError('アドレス帳の更新に失敗しました');
    }
  };

  /**
   * 編集をキャンセル
   */
  const handleCancelEdit = () => {
    setEditingId(null);
    setNameValue('');
    setEmailValue('');
    setError('');
  };

  /**
   * スワイプ開始
   */
  const handleSwipeStart = (e: React.TouchEvent | React.MouseEvent, entryId: string) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setSwipeState({
      id: entryId,
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

    // 上下の動きが大きい場合（20px以上）はスワイプをキャンセル
    if (Math.abs(deltaY) > 20) {
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
  const handleSwipeEnd = async (entry: EmailAddressEntity) => {
    if (!swipeState.id || swipeState.id !== entry.id) return;

    const deltaX = swipeState.currentX - swipeState.startX;
    const threshold = 60; // スワイプ判定の閾値を60pxに短縮（より反応しやすく）

    // 左スワイプ（削除）
    if (deltaX < -threshold) {
      setEntryToDelete(entry);
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

    const oldIndex = entries.findIndex((e) => e.id === active.id);
    const newIndex = entries.findIndex((e) => e.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      setActiveId(null);
      return;
    }

    // 並び替え
    const reordered = arrayMove(entries, oldIndex, newIndex);

    // displayOrderを更新
    const updates = reordered.map((item, index) => ({
      id: item.id,
      displayOrder: index,
    }));

    try {
      await firestoreService.reorderEmailAddresses(updates);
      await loadEntries();
    } catch (error) {
      console.error('[EmailAddressBookManagerModal] Failed to reorder:', error);
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
    // 編集メニューが開いている場合は何もしない（長押しだった）
    if (editMenuAnchor) return;

    // 通常のクリック：新規追加フォームを開く
    setEditingId('new');
    setNameValue('');
    setEmailValue('');
  };

  /**
   * 編集メニューからエントリ選択
   */
  const handleSelectEntryForEdit = (entry: EmailAddressEntity) => {
    setEditingId(entry.id);
    setNameValue(entry.name);
    setEmailValue(entry.email);
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
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth sx={{ zIndex: 1500 }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6">メールアドレス帳管理</Typography>
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
                label="表示名"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 1 }}
                placeholder="例: 山田太郎"
                autoFocus
              />
              <TextField
                label="メールアドレス"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 1 }}
                placeholder="例: example@email.com"
                type="email"
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

          {/* アドレス帳一覧 */}
          {entries.length === 0 && !editingId && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              アドレス帳がまだ登録されていません。
              <br />
              「+」ボタンから新しいアドレスを追加してください。
            </Typography>
          )}

          {entries.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDndDragStart}
              onDragEnd={handleDndDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <List sx={{ py: 0 }}>
                <SortableContext
                  items={entries.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {entries.map((entry) => (
                    <SortableAddressItem
                      key={entry.id}
                      entry={entry}
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
                      const activeEntry = entries.find((e) => e.id === activeId);
                      if (!activeEntry) return null;

                      return (
                        <ListItemButton sx={{ py: 1.5, px: 2, cursor: 'grabbing', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <Typography variant="body2" fontWeight="medium">
                            {activeEntry.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {activeEntry.email}
                          </Typography>
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
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} sx={{ zIndex: 1600 }}>
        <DialogTitle>アドレス帳を削除</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            このアドレス帳を削除してもよろしいですか？
          </Typography>
          {entryToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                {entryToDelete.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {entryToDelete.email}
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
          編集するアドレスを選択
        </Typography>
        {entries.map((entry) => (
          <MenuItem key={entry.id} onClick={() => handleSelectEntryForEdit(entry)}>
            <Box>
              <Typography variant="body2">{entry.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {entry.email}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
