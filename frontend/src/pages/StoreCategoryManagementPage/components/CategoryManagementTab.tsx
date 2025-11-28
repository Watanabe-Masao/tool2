/**
 * カテゴリー管理タブ
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
  Chip,
  Grid,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { STORE_DATA } from '@/utils/constants';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import type { StoreCategory } from '@/types/storeCategory';
import { MODAL_Z_INDEX } from '@/constants/zIndex';

interface CategoryManagementTabProps {
  categories: StoreCategory[];
  selectedCategory: StoreCategory | null;
  selectedStores: string[];
  onCategorySelect: (category: StoreCategory | null) => void;
  onStoreSelect: (storeIds: string[]) => void;
  onAddCategory: (name: string) => Promise<void>;
  onEditCategory: (category: StoreCategory, name: string) => Promise<void>;
  onDeleteCategory: (category: StoreCategory) => Promise<void>;
  onAddStoresToCategory: () => Promise<void>;
  onRemoveStoresFromCategory: () => Promise<void>;
  uncategorizedStores: Array<{ code: string; name: string }>;
}

export const CategoryManagementTab: React.FC<CategoryManagementTabProps> = ({
  categories,
  selectedCategory,
  selectedStores,
  onCategorySelect,
  onStoreSelect,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddStoresToCategory,
  onRemoveStoresFromCategory,
  uncategorizedStores,
}) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<StoreCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<StoreCategory | null>(null);

  // スワイプジェスチャー
  const {
    swipeState,
    handleSwipeStart,
    handleSwipeMove,
    handleSwipeEnd,
    getSwipeOffset,
  } = useSwipeGesture({
    threshold: 120,
    onSwipeLeft: (id) => {
      const category = categories.find((c) => c.id === id);
      if (category) {
        setEditingCategory(category);
        setNewCategoryName(category.name);
        setShowEditDialog(true);
      }
    },
    onSwipeRight: (id) => {
      const category = categories.find((c) => c.id === id);
      if (category) {
        setCategoryToDelete(category);
        setShowDeleteDialog(true);
      }
    },
  });

  const handleAddSubmit = async () => {
    await onAddCategory(newCategoryName);
    setNewCategoryName('');
    setShowAddDialog(false);
  };

  const handleEditSubmit = async () => {
    if (editingCategory) {
      await onEditCategory(editingCategory, newCategoryName);
      setNewCategoryName('');
      setEditingCategory(null);
      setShowEditDialog(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (categoryToDelete) {
      await onDeleteCategory(categoryToDelete);
      setCategoryToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  const handleStoreToggle = (storeCode: string) => {
    if (selectedStores.includes(storeCode)) {
      onStoreSelect(selectedStores.filter((id) => id !== storeCode));
    } else {
      onStoreSelect([...selectedStores, storeCode]);
    }
  };

  const categoryStores = selectedCategory
    ? STORE_DATA.filter((store) => selectedCategory.storeIds.includes(store.code))
    : [];

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        店舗を大型店、中型店などのカテゴリーに分類します。
      </Typography>

      <Grid container spacing={3}>
        {/* 左側：カテゴリーリスト */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  カテゴリー
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

              {categories.length === 0 ? (
                <Alert severity="info">カテゴリーがありません</Alert>
              ) : (
                <List sx={{ py: 0 }}>
                  {categories.map((category) => {
                    const isCurrentSwiping = swipeState.id === category.id;
                    const deltaX = getSwipeOffset(category.id);
                    const showEditHint = deltaX < -25;
                    const showDeleteHint = deltaX > 25;

                    return (
                      <Box
                        key={category.id}
                        sx={{
                          position: 'relative',
                          overflow: 'hidden',
                          bgcolor: showDeleteHint ? 'error.light' : showEditHint ? 'info.light' : 'transparent',
                          transition: showDeleteHint || showEditHint ? 'none' : 'background-color 0.2s',
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
                          selected={selectedCategory?.id === category.id}
                          onClick={() => {
                            if (!swipeState.isSwiping) {
                              onCategorySelect(category);
                              onStoreSelect([]);
                            }
                          }}
                          onTouchStart={(e) => handleSwipeStart(e, category.id)}
                          onTouchMove={handleSwipeMove}
                          onTouchEnd={() => handleSwipeEnd(category.id)}
                          onMouseDown={(e) => handleSwipeStart(e, category.id)}
                          onMouseMove={handleSwipeMove}
                          onMouseUp={() => handleSwipeEnd(category.id)}
                          onMouseLeave={() => handleSwipeEnd(category.id)}
                          sx={{
                            py: 1.5,
                            px: 2,
                            transform: isCurrentSwiping ? `translateX(${deltaX}px)` : 'translateX(0)',
                            transition: isCurrentSwiping ? 'none' : 'transform 0.2s',
                            bgcolor: 'background.paper',
                          }}
                        >
                          <ListItemText
                            primary={category.name}
                            secondary={`${category.storeIds.length}店舗`}
                          />
                        </ListItemButton>
                      </Box>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 右側：店舗リスト */}
        <Grid item xs={12} md={8}>
          {selectedCategory ? (
            <Box>
              {/* カテゴリー内の店舗 */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {selectedCategory.name}の店舗
                    </Typography>
                    {selectedStores.length > 0 && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<ArrowBackIcon />}
                        onClick={onRemoveStoresFromCategory}
                      >
                        カテゴリーから削除 ({selectedStores.length})
                      </Button>
                    )}
                  </Box>

                  {categoryStores.length === 0 ? (
                    <Alert severity="info">このカテゴリーに店舗がありません</Alert>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {categoryStores.map((store) => (
                        <Chip
                          key={store.code}
                          label={`${store.code}: ${store.name}`}
                          onClick={() => handleStoreToggle(store.code)}
                          color={selectedStores.includes(store.code) ? 'primary' : 'default'}
                          variant={selectedStores.includes(store.code) ? 'filled' : 'outlined'}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* 未分類の店舗 */}
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                      未分類の店舗
                    </Typography>
                    {selectedStores.length > 0 && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<ArrowForwardIcon />}
                        onClick={onAddStoresToCategory}
                      >
                        {selectedCategory.name}に追加 ({selectedStores.length})
                      </Button>
                    )}
                  </Box>

                  {uncategorizedStores.length === 0 ? (
                    <Alert severity="success">全ての店舗がカテゴリーに割り当てられています</Alert>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {uncategorizedStores.map((store) => (
                        <Chip
                          key={store.code}
                          label={`${store.code}: ${store.name}`}
                          onClick={() => handleStoreToggle(store.code)}
                          color={selectedStores.includes(store.code) ? 'primary' : 'default'}
                          variant={selectedStores.includes(store.code) ? 'filled' : 'outlined'}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          ) : (
            <Card>
              <CardContent>
                <Alert severity="info">左側からカテゴリーを選択してください</Alert>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* カテゴリー追加ダイアログ */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }}>
        <DialogTitle>カテゴリーを追加</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="カテゴリー名"
            placeholder="例: 大型店、中型店"
            fullWidth
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>キャンセル</Button>
          <Button onClick={handleAddSubmit} variant="contained">
            追加
          </Button>
        </DialogActions>
      </Dialog>

      {/* カテゴリー編集ダイアログ */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }}>
        <DialogTitle>カテゴリーを編集</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="カテゴリー名"
            fullWidth
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>キャンセル</Button>
          <Button onClick={handleEditSubmit} variant="contained">
            更新
          </Button>
        </DialogActions>
      </Dialog>

      {/* カテゴリー削除確認ダイアログ */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }}>
        <DialogTitle>カテゴリーを削除</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            このカテゴリーを削除してもよろしいですか？店舗は未分類に戻ります。
          </Typography>
          {categoryToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                {categoryToDelete.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {categoryToDelete.storeIds.length}店舗
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
