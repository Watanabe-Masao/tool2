import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  Box,
  Typography,
  Chip,
  Stack,
  Tabs,
  Tab,
  Button,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import { Close, Inventory2, Delete } from '@mui/icons-material';
import type { ProductHistoryItem } from '@/hooks/useProductHistory';
import { getCategoryName, MAIN_CATEGORIES } from '@/utils/categories';
import { CategorySelectModal } from '@/components/modals/CategorySelectModal';

/**
 * ProductPresetModalのProps
 */
interface ProductPresetModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** 閉じる時のハンドラー */
  onClose: () => void;
  /** プリセット選択時のハンドラー */
  onSelect: (preset: ProductHistoryItem) => void;
  /** プリセット削除時のハンドラー */
  onDelete: (presetId: string) => Promise<void>;
  /** プリセット一覧 */
  presets: ProductHistoryItem[];
}

/**
 * 商品プリセット選択モーダル
 *
 * 保存された商品プリセットを一括で読み込むためのモーダルです。
 */
export const ProductPresetModal: React.FC<ProductPresetModalProps> = ({
  open,
  onClose,
  onSelect,
  onDelete,
  presets,
}) => {
  // カテゴリーフィルターのタブ（0: 全て, 1: 果実, 2: 野菜）
  const [categoryFilter, setCategoryFilter] = useState(0);

  // 詳細カテゴリーフィルター（小カテゴリーコード）
  const [detailedCategoryCode, setDetailedCategoryCode] = useState<string>('');

  // カテゴリー選択モーダルの状態
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedMainCategoryForModal, setSelectedMainCategoryForModal] = useState<'61' | '62'>('61');

  // 削除確認ダイアログの状態
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<ProductHistoryItem | null>(null);

  // 長押し検出用のタイマー
  const longPressTimer = useRef<number | null>(null);

  // スワイプ状態管理
  const [swipeState, setSwipeState] = useState<{
    id: string | null;
    startX: number;
    currentX: number;
    isSwiping: boolean;
  }>({
    id: null,
    startX: 0,
    currentX: 0,
    isSwiping: false,
  });

  /**
   * タブ変更ハンドラー
   */
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setCategoryFilter(newValue);
    setDetailedCategoryCode(''); // タブ変更時に詳細カテゴリーをクリア
  };

  /**
   * タブ長押し開始
   */
  const handleTabLongPressStart = (tabIndex: number) => {
    if (tabIndex === 0) return; // 「全て」タブは長押し不要

    longPressTimer.current = window.setTimeout(() => {
      // 果実（tabIndex=1）または野菜（tabIndex=2）のカテゴリー選択モーダルを開く
      setSelectedMainCategoryForModal(tabIndex === 1 ? '61' : '62');
      setCategoryModalOpen(true);
    }, 500); // 500ms長押しでモーダル表示
  };

  /**
   * タブ長押し終了
   */
  const handleTabLongPressEnd = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  /**
   * カテゴリー選択
   */
  const handleSelectCategory = (categoryCode: string) => {
    setDetailedCategoryCode(categoryCode);
    // カテゴリーが選択されたら、対応する大カテゴリータブに切り替え
    if (categoryCode) {
      const mainCategory = MAIN_CATEGORIES.find((mc) =>
        mc.subCategories.some((sc) => sc.code === categoryCode)
      );
      if (mainCategory?.code === '61') {
        setCategoryFilter(1); // 果実タブ
      } else if (mainCategory?.code === '62') {
        setCategoryFilter(2); // 野菜タブ
      }
    }
  };

  /**
   * カテゴリーでフィルタリングしたプリセット
   */
  const filteredPresets = presets.filter((preset) => {
    // 詳細カテゴリーが選択されている場合は、それでフィルタリング
    if (detailedCategoryCode) {
      return preset.categoryCode === detailedCategoryCode;
    }

    // 大カテゴリーでフィルタリング
    if (categoryFilter === 0) return true; // 全て表示
    if (categoryFilter === 1) {
      // 果実（61）
      return preset.categoryCode?.startsWith('0006') && preset.categoryCode <= '000612';
    }
    if (categoryFilter === 2) {
      // 野菜（62）
      return preset.categoryCode?.startsWith('0006') && preset.categoryCode >= '000620';
    }
    return true;
  });

  /**
   * プリセットを選択
   */
  const handleSelectPreset = (preset: ProductHistoryItem) => {
    // スワイプ中は選択しない
    if (swipeState.isSwiping) return;
    onSelect(preset);
    onClose();
  };

  /**
   * スワイプ開始
   */
  const handleSwipeStart = (e: React.TouchEvent | React.MouseEvent, presetId: string) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setSwipeState({
      id: presetId,
      startX: clientX,
      currentX: clientX,
      isSwiping: false,
    });
  };

  /**
   * スワイプ中
   */
  const handleSwipeMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!swipeState.id) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - swipeState.startX;

    // 5px以上動いたらスワイプとみなす
    if (Math.abs(deltaX) > 5) {
      setSwipeState((prev) => ({
        ...prev,
        currentX: clientX,
        isSwiping: true,
      }));
    }
  };

  /**
   * スワイプ終了
   */
  const handleSwipeEnd = async (preset: ProductHistoryItem) => {
    if (!swipeState.id || swipeState.id !== preset.id) return;

    const deltaX = swipeState.currentX - swipeState.startX;
    const threshold = 100; // スワイプ判定の閾値（ピクセル）

    // 左スワイプ（削除）
    if (deltaX < -threshold) {
      setPresetToDelete(preset);
      setDeleteDialogOpen(true);
    }

    // 右スワイプ（ピン留め）- 今後実装予定
    // if (deltaX > threshold) {
    //   // ピン留め処理
    // }

    // スワイプ状態をリセット
    setSwipeState({
      id: null,
      startX: 0,
      currentX: 0,
      isSwiping: false,
    });
  };

  /**
   * 削除ボタンをクリック
   */
  const handleDeleteClick = (e: React.MouseEvent, preset: ProductHistoryItem) => {
    e.stopPropagation(); // リストアイテムのクリックイベントを止める
    setPresetToDelete(preset);
    setDeleteDialogOpen(true);
  };

  /**
   * 削除を実行
   */
  const handleConfirmDelete = async () => {
    if (!presetToDelete) return;

    try {
      await onDelete(presetToDelete.id);
      setDeleteDialogOpen(false);
      setPresetToDelete(null);
    } catch (error) {
      console.error('[ProductPresetModal] Failed to delete preset:', error);
    }
  };

  /**
   * モーダルを閉じる際にフィルターをリセット
   */
  const handleClose = () => {
    setCategoryFilter(0);
    setDetailedCategoryCode('');
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '85vh',
            height: '85vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory2 />
            <Typography variant="h6">プリセットから選択</Typography>
          </Box>
          <IconButton size="small" onClick={handleClose} edge="end">
            <Close />
          </IconButton>
        </DialogTitle>

        {/* カテゴリーフィルタータブ */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={categoryFilter} onChange={handleTabChange} variant="fullWidth">
            <Tab label={`全て (${presets.length})`} />
            <Tab
              label={`果実 (${presets.filter(p => p.categoryCode && p.categoryCode.startsWith('0006') && p.categoryCode <= '000612').length})`}
              onTouchStart={() => handleTabLongPressStart(1)}
              onTouchEnd={handleTabLongPressEnd}
              onMouseDown={() => handleTabLongPressStart(1)}
              onMouseUp={handleTabLongPressEnd}
              onMouseLeave={handleTabLongPressEnd}
            />
            <Tab
              label={`野菜 (${presets.filter(p => p.categoryCode && p.categoryCode.startsWith('0006') && p.categoryCode >= '000620').length})`}
              onTouchStart={() => handleTabLongPressStart(2)}
              onTouchEnd={handleTabLongPressEnd}
              onMouseDown={() => handleTabLongPressStart(2)}
              onMouseUp={handleTabLongPressEnd}
              onMouseLeave={handleTabLongPressEnd}
            />
          </Tabs>

          {/* 詳細カテゴリーが選択されている場合は表示 */}
          {detailedCategoryCode && (
            <Box sx={{ px: 2, py: 1, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="primary.contrastText">
                絞り込み中:
              </Typography>
              <Chip
                label={getCategoryName(detailedCategoryCode)}
                size="small"
                onDelete={() => setDetailedCategoryCode('')}
                sx={{ bgcolor: 'white' }}
              />
            </Box>
          )}
        </Box>

        <DialogContent dividers sx={{ p: 0, flexGrow: 1, overflow: 'auto' }}>
          {filteredPresets.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {categoryFilter === 0
                  ? '保存されたプリセットがありません'
                  : 'このカテゴリーにはプリセットがありません'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                商品番号を長押しして、商品情報をプリセットとして保存できます
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {filteredPresets.map((preset) => {
                const isCurrentSwiping = swipeState.id === preset.id;
                const deltaX = isCurrentSwiping ? swipeState.currentX - swipeState.startX : 0;
                const showDeleteHint = deltaX < -30;

                return (
                  <Box
                    key={preset.id}
                    sx={{
                      position: 'relative',
                      overflow: 'hidden',
                      bgcolor: showDeleteHint ? 'error.light' : 'transparent',
                      transition: showDeleteHint ? 'none' : 'background-color 0.2s',
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
                        <Delete />
                      </Box>
                    )}

                    <ListItemButton
                      onClick={() => handleSelectPreset(preset)}
                      onTouchStart={(e) => handleSwipeStart(e, preset.id)}
                      onTouchMove={handleSwipeMove}
                      onTouchEnd={() => handleSwipeEnd(preset)}
                      onMouseDown={(e) => handleSwipeStart(e, preset.id)}
                      onMouseMove={handleSwipeMove}
                      onMouseUp={() => handleSwipeEnd(preset)}
                      onMouseLeave={() => handleSwipeEnd(preset)}
                      sx={{
                        py: 1.5,
                        px: 2,
                        transform: isCurrentSwiping ? `translateX(${deltaX}px)` : 'translateX(0)',
                        transition: isCurrentSwiping ? 'none' : 'transform 0.2s',
                        bgcolor: 'background.paper',
                        cursor: isCurrentSwiping ? 'grabbing' : 'pointer',
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        {/* 1行目: 品名 + カテゴリー */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {preset.name}
                          </Typography>
                          {preset.categoryCode && (
                            <Chip
                              label={getCategoryName(preset.categoryCode)}
                              size="small"
                              color="primary"
                              sx={{ fontSize: '0.65rem', height: 18 }}
                            />
                          )}
                        </Box>
                        {/* 2行目: 産地、規格、入り数を横並び */}
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Typography variant="caption" color="text.secondary">
                            産地: {preset.origin}
                          </Typography>
                          {preset.specification && (
                            <Typography variant="caption" color="text.secondary">
                              規格: {preset.specification}
                            </Typography>
                          )}
                          {preset.quantityPerPackage && (
                            <Typography variant="caption" color="text.secondary">
                              入数: {preset.quantityPerPackage}
                              {preset.unit && ` ${preset.unit}`}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </ListItemButton>
                  </Box>
                );
              })}
            </List>
          )}
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>プリセットを削除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            このプリセットを削除してもよろしいですか？
          </DialogContentText>
          {presetToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                {presetToDelete.name}
              </Typography>
              {presetToDelete.categoryCode && (
                <Typography variant="body2" color="text.secondary">
                  カテゴリー: {getCategoryName(presetToDelete.categoryCode)}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                産地: {presetToDelete.origin}
              </Typography>
            </Box>
          )}
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

      {/* カテゴリー選択モーダル */}
      <CategorySelectModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSelect={handleSelectCategory}
        selectedCategoryCode={detailedCategoryCode}
      />
    </>
  );
};
