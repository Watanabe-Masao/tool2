import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Grid,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Paper,
  Popover,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useAuthContext } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { StoreCategoryService } from '@/services/firebase/storeCategoryService';
import { StoreSettingsService } from '@/services/firebase/storeSettingsService';
import { STORE_DATA } from '@/utils/constants';
import type { StoreCategory } from '@/types/storeCategory';
import type { StoreSettings } from '@/types/storeSettings';

/**
 * 店舗カテゴリー管理ページ
 */
export const StoreCategoryManagementPage: React.FC = () => {
  const { user } = useAuthContext();
  const { showSuccess, showError, showLoading, hideLoading } = useNotification();

  const [tabValue, setTabValue] = useState(0);

  // カテゴリー管理用の状態
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory | null>(null);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<StoreCategory | null>(null);

  // 販売構成比設定用の状態
  const [storeSettings, setStoreSettings] = useState<Record<string, StoreSettings>>({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string[]>([]);
  const [categoryFilterAnchorEl, setCategoryFilterAnchorEl] = useState<null | HTMLElement>(null);

  // カテゴリーを読み込み
  const loadCategories = async () => {
    if (!user) return;

    try {
      showLoading();
      const data = await StoreCategoryService.getAll(user.uid);
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      showError('カテゴリーの読み込みに失敗しました');
    } finally {
      hideLoading();
    }
  };

  // 店舗設定を読み込み
  const loadStoreSettings = async () => {
    if (!user) return;

    try {
      showLoading();
      const data = await StoreSettingsService.getAll(user.uid);
      const settingsMap: Record<string, StoreSettings> = {};
      data.forEach((setting) => {
        settingsMap[setting.storeCode] = setting;
      });
      setStoreSettings(settingsMap);
    } catch (error) {
      console.error('Error loading store settings:', error);
      showError('店舗設定の読み込みに失敗しました');
    } finally {
      hideLoading();
    }
  };

  useEffect(() => {
    if (tabValue === 0) {
      loadCategories();
    } else if (tabValue === 1) {
      loadStoreSettings();
    }
  }, [user, tabValue]);

  // 未分類の店舗を取得
  const getUncategorizedStores = () => {
    const categorizedStoreIds = new Set<string>();
    categories.forEach((cat) => {
      cat.storeIds.forEach((id) => categorizedStoreIds.add(id));
    });

    return STORE_DATA.filter((store) => !categorizedStoreIds.has(store.code));
  };

  // カテゴリー追加
  const handleAddCategory = async () => {
    if (!user || !newCategoryName.trim()) return;

    try {
      showLoading();
      await StoreCategoryService.create(user.uid, {
        name: newCategoryName,
        storeIds: [],
        order: categories.length,
      });
      await loadCategories();
      setNewCategoryName('');
      setShowAddDialog(false);
      showSuccess('カテゴリーを追加しました');
    } catch (error) {
      console.error('Error adding category:', error);
      showError('カテゴリーの追加に失敗しました');
    } finally {
      hideLoading();
    }
  };

  // カテゴリー編集
  const handleEditCategory = async () => {
    if (!user || !editingCategory || !newCategoryName.trim()) return;

    try {
      showLoading();
      await StoreCategoryService.update(user.uid, editingCategory.id, {
        name: newCategoryName,
      });
      await loadCategories();
      setNewCategoryName('');
      setEditingCategory(null);
      setShowEditDialog(false);
      showSuccess('カテゴリーを更新しました');
    } catch (error) {
      console.error('Error updating category:', error);
      showError('カテゴリーの更新に失敗しました');
    } finally {
      hideLoading();
    }
  };

  // カテゴリー削除
  const handleDeleteCategory = async (categoryId: string) => {
    if (!user) return;
    if (!confirm('このカテゴリーを削除しますか？店舗は未分類に戻ります。')) return;

    try {
      showLoading();
      await StoreCategoryService.delete(user.uid, categoryId);
      await loadCategories();
      if (selectedCategory?.id === categoryId) {
        setSelectedCategory(null);
      }
      showSuccess('カテゴリーを削除しました');
    } catch (error) {
      console.error('Error deleting category:', error);
      showError('カテゴリーの削除に失敗しました');
    } finally {
      hideLoading();
    }
  };

  // 店舗をカテゴリーに追加
  const handleAddStoresToCategory = async () => {
    if (!user || !selectedCategory || selectedStores.length === 0) return;

    try {
      showLoading();
      for (const storeId of selectedStores) {
        await StoreCategoryService.moveStore(user.uid, storeId, null, selectedCategory.id);
      }
      await loadCategories();
      setSelectedStores([]);
      showSuccess(`${selectedStores.length}件の店舗を追加しました`);
    } catch (error) {
      console.error('Error adding stores to category:', error);
      showError('店舗の追加に失敗しました');
    } finally {
      hideLoading();
    }
  };

  // 店舗をカテゴリーから削除
  const handleRemoveStoresFromCategory = async () => {
    if (!user || !selectedCategory || selectedStores.length === 0) return;

    try {
      showLoading();
      for (const storeId of selectedStores) {
        await StoreCategoryService.removeStoreFromCategory(user.uid, storeId, selectedCategory.id);
      }
      await loadCategories();
      setSelectedStores([]);
      showSuccess(`${selectedStores.length}件の店舗を削除しました`);
    } catch (error) {
      console.error('Error removing stores from category:', error);
      showError('店舗の削除に失敗しました');
    } finally {
      hideLoading();
    }
  };

  // 店舗設定の変更
  const handleChangeStoreSetting = (storeCode: string, field: 'salesRatio' | 'enabled', value: number | boolean) => {
    setStoreSettings((prev) => ({
      ...prev,
      [storeCode]: {
        ...(prev[storeCode] || {
          id: storeCode,
          userId: user?.uid || '',
          storeCode,
          salesRatio: 0,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        [field]: value,
      },
    }));
  };

  // 販売構成比を保存
  const handleSaveStoreSettings = async () => {
    if (!user) return;

    try {
      showLoading();
      const settingsToSave = Object.values(storeSettings).map((setting) => ({
        storeCode: setting.storeCode,
        salesRatio: setting.salesRatio,
        enabled: setting.enabled,
      }));

      await StoreSettingsService.batchUpsert(user.uid, settingsToSave);
      showSuccess('販売構成比を保存しました');
    } catch (error) {
      console.error('Error saving store settings:', error);
      showError('販売構成比の保存に失敗しました');
    } finally {
      hideLoading();
    }
  };

  // カテゴリーフィルターのトグル
  const handleToggleCategoryFilter = (categoryId: string) => {
    setSelectedCategoryFilter((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const uncategorizedStores = getUncategorizedStores();
  const categoryStores = selectedCategory
    ? STORE_DATA.filter((store) => selectedCategory.storeIds.includes(store.code))
    : [];

  // 販売構成比設定タブで表示する店舗をフィルター
  const getFilteredStoresForSettings = () => {
    if (selectedCategoryFilter.length === 0) {
      return STORE_DATA;
    }

    const filteredStoreIds = new Set<string>();
    categories.forEach((category) => {
      if (selectedCategoryFilter.includes(category.id)) {
        category.storeIds.forEach((storeId) => filteredStoreIds.add(storeId));
      }
    });

    return STORE_DATA.filter((store) => filteredStoreIds.has(store.code));
  };

  const filteredStoresForSettings = getFilteredStoresForSettings();

  return (
    <Container maxWidth="lg">
          <Box sx={{ py: 3 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
              店舗管理
            </Typography>

            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="カテゴリー管理" />
              <Tab label="販売構成比設定" />
            </Tabs>

            {/* カテゴリー管理タブ */}
            {tabValue === 0 && (
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
                          <List>
                            {categories.map((category) => (
                              <ListItem
                                key={category.id}
                                disablePadding
                                secondaryAction={
                                  <Box>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setEditingCategory(category);
                                        setNewCategoryName(category.name);
                                        setShowEditDialog(true);
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleDeleteCategory(category.id)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                }
                              >
                                <ListItemButton
                                  selected={selectedCategory?.id === category.id}
                                  onClick={() => {
                                    setSelectedCategory(category);
                                    setSelectedStores([]);
                                  }}
                                >
                                  <ListItemText
                                    primary={category.name}
                                    secondary={`${category.storeIds.length}店舗`}
                                  />
                                </ListItemButton>
                              </ListItem>
                            ))}
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
                                  onClick={handleRemoveStoresFromCategory}
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
                                    onClick={() => {
                                      setSelectedStores((prev) =>
                                        prev.includes(store.code)
                                          ? prev.filter((id) => id !== store.code)
                                          : [...prev, store.code]
                                      );
                                    }}
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
                                  onClick={handleAddStoresToCategory}
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
                                    onClick={() => {
                                      setSelectedStores((prev) =>
                                        prev.includes(store.code)
                                          ? prev.filter((id) => id !== store.code)
                                          : [...prev, store.code]
                                      );
                                    }}
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
              </>
            )}

            {/* 販売構成比設定タブ */}
            {tabValue === 1 && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    各店舗の販売構成比を設定します。配分画面で使用する店舗にチェックを入れてください。
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {selectedCategoryFilter.length > 0 && (
                      <Chip
                        label={`${selectedCategoryFilter.length}件のカテゴリー`}
                        size="small"
                        onDelete={() => setSelectedCategoryFilter([])}
                      />
                    )}
                    <IconButton
                      onClick={(e) => {
                        setCategoryFilterAnchorEl(e.currentTarget);
                        if (tabValue === 1) {
                          loadCategories();
                        }
                      }}
                      color={selectedCategoryFilter.length > 0 ? 'primary' : 'default'}
                      size="small"
                    >
                      <FilterListIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Card>
                  <CardContent>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>使用</TableCell>
                            <TableCell>店番</TableCell>
                            <TableCell>店舗名</TableCell>
                            <TableCell align="right" sx={{ minWidth: { xs: 80, sm: 120 } }}>販売構成比（%）</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredStoresForSettings.map((store) => {
                            const setting = storeSettings[store.code];
                            const enabled = setting?.enabled ?? true;
                            const salesRatio = setting?.salesRatio ?? 0;

                            return (
                              <TableRow key={store.code}>
                                <TableCell padding="checkbox">
                                  <Checkbox
                                    checked={enabled}
                                    onChange={(e) => handleChangeStoreSetting(store.code, 'enabled', e.target.checked)}
                                  />
                                </TableCell>
                                <TableCell>{store.code}</TableCell>
                                <TableCell>{store.name}</TableCell>
                                <TableCell align="right">
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={salesRatio}
                                    onChange={(e) =>
                                      handleChangeStoreSetting(store.code, 'salesRatio', parseFloat(e.target.value) || 0)
                                    }
                                    inputProps={{
                                      min: 0,
                                      max: 100,
                                      step: 0.1,
                                      style: { textAlign: 'right', fontSize: '0.875rem' },
                                    }}
                                    sx={{
                                      width: { xs: 60, sm: 100 },
                                      '& .MuiInputBase-input': {
                                        py: { xs: 0.5, sm: 1 },
                                      },
                                    }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button variant="contained" onClick={handleSaveStoreSettings}>
                        保存
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </>
            )}
          </Box>
        </Container>

        {/* カテゴリー追加ダイアログ */}
        <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)}>
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
            <Button onClick={handleAddCategory} variant="contained">
              追加
            </Button>
          </DialogActions>
        </Dialog>

        {/* カテゴリー編集ダイアログ */}
        <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)}>
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
            <Button onClick={handleEditCategory} variant="contained">
              更新
            </Button>
          </DialogActions>
        </Dialog>

        {/* カテゴリーフィルターPopover */}
        <Popover
          open={Boolean(categoryFilterAnchorEl)}
          anchorEl={categoryFilterAnchorEl}
          onClose={() => setCategoryFilterAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <Box sx={{ p: 2, minWidth: 200 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              カテゴリーで絞り込み
            </Typography>
            {categories.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                カテゴリーがありません
              </Typography>
            ) : (
              <FormGroup>
                {categories.map((category) => (
                  <FormControlLabel
                    key={category.id}
                    control={
                      <Checkbox
                        checked={selectedCategoryFilter.includes(category.id)}
                        onChange={() => handleToggleCategoryFilter(category.id)}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {category.name} ({category.storeIds.length})
                      </Typography>
                    }
                  />
                ))}
              </FormGroup>
            )}
          </Box>
        </Popover>
    </Container>
  );
};
