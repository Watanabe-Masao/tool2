import React, { useState, useEffect } from 'react';
import {
  Container,
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
import { useSupplierPresets } from '@/hooks/useSupplierPresets';
import type { SupplierPreset } from '@/hooks/useSupplierPresets';
import { STORE_DATA } from '@/utils/constants';
import type { StoreCategory } from '@/types/storeCategory';
import type { StoreSettings } from '@/types/storeSettings';

/**
 * 店舗カテゴリー管理ページ
 */
export const StoreCategoryManagementPage: React.FC = () => {
  const { user } = useAuthContext();
  const { showSuccess, showError, showLoading, hideLoading } = useNotification();
  const { presets, addPreset, deletePreset, updatePreset, loadPresets } = useSupplierPresets();

  const [tabValue, setTabValue] = useState(0);

  // カテゴリー管理用の状態
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory | null>(null);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<StoreCategory | null>(null);
  const [categorySwipeState, setCategorySwipeState] = useState<{
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
  const [categoryToDelete, setCategoryToDelete] = useState<StoreCategory | null>(null);
  const [showCategoryDeleteDialog, setShowCategoryDeleteDialog] = useState(false);

  // 販売構成比設定用の状態
  const [storeSettings, setStoreSettings] = useState<Record<string, StoreSettings>>({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string[]>([]);
  const [categoryFilterAnchorEl, setCategoryFilterAnchorEl] = useState<null | HTMLElement>(null);

  // 帳合い先管理用の状態
  const [showSupplierAddDialog, setShowSupplierAddDialog] = useState(false);
  const [showSupplierEditDialog, setShowSupplierEditDialog] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<SupplierPreset | null>(null);
  const [supplierSwipeState, setSupplierSwipeState] = useState<{
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
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierPreset | null>(null);
  const [showSupplierDeleteDialog, setShowSupplierDeleteDialog] = useState(false);

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
    } else if (tabValue === 2) {
      loadPresets();
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
  const handleDeleteCategory = async () => {
    if (!user || !categoryToDelete) return;

    try {
      showLoading();
      await StoreCategoryService.delete(user.uid, categoryToDelete.id);
      await loadCategories();
      if (selectedCategory?.id === categoryToDelete.id) {
        setSelectedCategory(null);
      }
      showSuccess('カテゴリーを削除しました');
    } catch (error) {
      console.error('Error deleting category:', error);
      showError('カテゴリーの削除に失敗しました');
    } finally {
      hideLoading();
      setShowCategoryDeleteDialog(false);
      setCategoryToDelete(null);
    }
  };

  // カテゴリースワイプ開始
  const handleCategorySwipeStart = (e: React.TouchEvent | React.MouseEvent, categoryId: string) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setCategorySwipeState({
      id: categoryId,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      isSwiping: false,
    });
  };

  // カテゴリースワイプ中
  const handleCategorySwipeMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!categorySwipeState.id) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - categorySwipeState.startX;
    const deltaY = clientY - categorySwipeState.startY;

    if (Math.abs(deltaY) > 20) {
      setCategorySwipeState({
        id: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        isSwiping: false,
      });
      return;
    }

    if (Math.abs(deltaX) > 5) {
      setCategorySwipeState((prev) => ({
        ...prev,
        currentX: clientX,
        currentY: clientY,
        isSwiping: true,
      }));
    }
  };

  // カテゴリースワイプ終了
  const handleCategorySwipeEnd = (category: StoreCategory) => {
    if (!categorySwipeState.id || categorySwipeState.id !== category.id) return;

    const deltaX = categorySwipeState.currentX - categorySwipeState.startX;
    const threshold = 60;

    // 左スワイプ（編集）
    if (deltaX < -threshold) {
      setEditingCategory(category);
      setNewCategoryName(category.name);
      setShowEditDialog(true);
    }

    // 右スワイプ（削除）
    if (deltaX > threshold) {
      setCategoryToDelete(category);
      setShowCategoryDeleteDialog(true);
    }

    setCategorySwipeState({
      id: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isSwiping: false,
    });
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

  // 帳合い先管理のハンドラー
  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return;

    const success = await addPreset(newSupplierName.trim());
    if (success) {
      setNewSupplierName('');
      setShowSupplierAddDialog(false);
      showSuccess('帳合先を追加しました');
    } else {
      showError('帳合先の追加に失敗しました');
    }
  };

  const handleEditSupplier = async () => {
    if (!editingSupplier || !newSupplierName.trim()) return;

    const success = await updatePreset(editingSupplier.id, newSupplierName.trim());
    if (success) {
      setNewSupplierName('');
      setEditingSupplier(null);
      setShowSupplierEditDialog(false);
      showSuccess('帳合先を更新しました');
    } else {
      showError('帳合先の更新に失敗しました');
    }
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;

    const success = await deletePreset(supplierToDelete.id);
    if (success) {
      showSuccess('帳合先を削除しました');
    } else {
      showError('帳合先の削除に失敗しました');
    }

    setShowSupplierDeleteDialog(false);
    setSupplierToDelete(null);
  };

  const handleSupplierSwipeStart = (e: React.TouchEvent | React.MouseEvent, supplierId: string) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setSupplierSwipeState({
      id: supplierId,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      isSwiping: false,
    });
  };

  const handleSupplierSwipeMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!supplierSwipeState.id) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - supplierSwipeState.startX;
    const deltaY = clientY - supplierSwipeState.startY;

    if (Math.abs(deltaY) > 20) {
      setSupplierSwipeState({
        id: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        isSwiping: false,
      });
      return;
    }

    if (Math.abs(deltaX) > 5) {
      setSupplierSwipeState((prev) => ({
        ...prev,
        currentX: clientX,
        currentY: clientY,
        isSwiping: true,
      }));
    }
  };

  const handleSupplierSwipeEnd = (supplier: SupplierPreset) => {
    if (!supplierSwipeState.id || supplierSwipeState.id !== supplier.id) return;

    const deltaX = supplierSwipeState.currentX - supplierSwipeState.startX;
    const threshold = 60;

    // 左スワイプ（編集）
    if (deltaX < -threshold) {
      setEditingSupplier(supplier);
      setNewSupplierName(supplier.supplier);
      setShowSupplierEditDialog(true);
    }

    // 右スワイプ（削除）
    if (deltaX > threshold) {
      setSupplierToDelete(supplier);
      setShowSupplierDeleteDialog(true);
    }

    setSupplierSwipeState({
      id: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isSwiping: false,
    });
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

  // 販売構成比の合計を計算
  const calculateTotalSalesRatio = (): number => {
    let total = 0;
    for (const store of filteredStoresForSettings) {
      const setting = storeSettings[store.code];
      const salesRatio = setting?.salesRatio ?? 0;
      total += salesRatio;
    }
    return total;
  };

  const totalSalesRatio = calculateTotalSalesRatio();
  const salesRatioDifference = 100 - totalSalesRatio;

  return (
    <Container maxWidth="lg">
          <Box sx={{ py: 3 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
              各種管理
            </Typography>

            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="カテゴリー管理" />
              <Tab label="販売構成比設定" />
              <Tab label="帳合い先管理" />
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
                          <List sx={{ py: 0 }}>
                            {categories.map((category) => {
                              const isCurrentSwiping = categorySwipeState.id === category.id;
                              const deltaX = isCurrentSwiping ? categorySwipeState.currentX - categorySwipeState.startX : 0;
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
                                  {/* 編集ヒント背景（左） */}
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

                                  {/* 削除ヒント背景（右） */}
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
                                      if (!categorySwipeState.isSwiping) {
                                        setSelectedCategory(category);
                                        setSelectedStores([]);
                                      }
                                    }}
                                    onTouchStart={(e) => handleCategorySwipeStart(e, category.id)}
                                    onTouchMove={handleCategorySwipeMove}
                                    onTouchEnd={() => handleCategorySwipeEnd(category)}
                                    onMouseDown={(e) => handleCategorySwipeStart(e, category.id)}
                                    onMouseMove={handleCategorySwipeMove}
                                    onMouseUp={() => handleCategorySwipeEnd(category)}
                                    onMouseLeave={() => handleCategorySwipeEnd(category)}
                                    sx={{
                                      py: 1.5,
                                      px: 2,
                                      transform: isCurrentSwiping ? `translateX(${deltaX}px)` : 'translateX(0)',
                                      transition: isCurrentSwiping ? 'none' : 'transform 0.2s',
                                      bgcolor: 'background.paper',
                                      touchAction: 'none',
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

                    {/* 販売構成比の合計と差異 */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={6}>
                          <Typography variant="body2" fontWeight="medium">
                            販売構成比 合計:
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sx={{ textAlign: 'right' }}>
                          <Typography
                            variant="body1"
                            fontWeight="bold"
                            color={Math.abs(salesRatioDifference) < 0.01 ? 'success.main' : 'text.primary'}
                          >
                            {totalSalesRatio.toFixed(1)}%
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" fontWeight="medium">
                            100%との差異:
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sx={{ textAlign: 'right' }}>
                          <Typography
                            variant="body1"
                            fontWeight="bold"
                            color={Math.abs(salesRatioDifference) < 0.01 ? 'success.main' : 'error.main'}
                          >
                            {salesRatioDifference > 0 ? '+' : ''}{salesRatioDifference.toFixed(1)}%
                          </Typography>
                        </Grid>
                      </Grid>
                      {Math.abs(salesRatioDifference) >= 0.01 && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          販売構成比の合計が100%になるように調整してください。
                        </Alert>
                      )}
                    </Box>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button variant="contained" onClick={handleSaveStoreSettings}>
                        保存
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </>
            )}

            {/* 帳合い先管理タブ */}
            {tabValue === 2 && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  帳合先を管理します。左にスワイプで編集、右にスワイプで削除できます。
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
                        onClick={() => setShowSupplierAddDialog(true)}
                      >
                        追加
                      </Button>
                    </Box>

                    {presets.length === 0 ? (
                      <Alert severity="info">帳合先がまだ登録されていません</Alert>
                    ) : (
                      <List sx={{ py: 0 }}>
                        {presets.map((preset) => {
                          const isCurrentSwiping = supplierSwipeState.id === preset.id;
                          const deltaX = isCurrentSwiping ? supplierSwipeState.currentX - supplierSwipeState.startX : 0;
                          const showEditHint = deltaX < -25;
                          const showDeleteHint = deltaX > 25;

                          return (
                            <Box
                              key={preset.id}
                              sx={{
                                position: 'relative',
                                overflow: 'hidden',
                                bgcolor: showDeleteHint ? 'error.light' : showEditHint ? 'info.light' : 'transparent',
                                transition: showDeleteHint || showEditHint ? 'none' : 'background-color 0.2s',
                              }}
                            >
                              {/* 編集ヒント背景（左） */}
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

                              {/* 削除ヒント背景（右） */}
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
                                onTouchStart={(e) => handleSupplierSwipeStart(e, preset.id)}
                                onTouchMove={handleSupplierSwipeMove}
                                onTouchEnd={() => handleSupplierSwipeEnd(preset)}
                                onMouseDown={(e) => handleSupplierSwipeStart(e, preset.id)}
                                onMouseMove={handleSupplierSwipeMove}
                                onMouseUp={() => handleSupplierSwipeEnd(preset)}
                                onMouseLeave={() => handleSupplierSwipeEnd(preset)}
                                sx={{
                                  py: 1.5,
                                  px: 2,
                                  transform: isCurrentSwiping ? `translateX(${deltaX}px)` : 'translateX(0)',
                                  transition: isCurrentSwiping ? 'none' : 'transform 0.2s',
                                  bgcolor: 'background.paper',
                                  touchAction: 'none',
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
              </>
            )}
          </Box>

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

        {/* カテゴリー削除確認ダイアログ */}
        <Dialog open={showCategoryDeleteDialog} onClose={() => setShowCategoryDeleteDialog(false)}>
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
            <Button onClick={() => setShowCategoryDeleteDialog(false)} color="inherit">
              キャンセル
            </Button>
            <Button onClick={handleDeleteCategory} color="error" variant="contained">
              削除
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

        {/* 帳合先追加ダイアログ */}
        <Dialog open={showSupplierAddDialog} onClose={() => setShowSupplierAddDialog(false)}>
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
            <Button onClick={() => setShowSupplierAddDialog(false)}>キャンセル</Button>
            <Button onClick={handleAddSupplier} variant="contained">
              追加
            </Button>
          </DialogActions>
        </Dialog>

        {/* 帳合先編集ダイアログ */}
        <Dialog open={showSupplierEditDialog} onClose={() => setShowSupplierEditDialog(false)}>
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
            <Button onClick={() => setShowSupplierEditDialog(false)}>キャンセル</Button>
            <Button onClick={handleEditSupplier} variant="contained">
              更新
            </Button>
          </DialogActions>
        </Dialog>

        {/* 帳合先削除確認ダイアログ */}
        <Dialog open={showSupplierDeleteDialog} onClose={() => setShowSupplierDeleteDialog(false)}>
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
            <Button onClick={() => setShowSupplierDeleteDialog(false)} color="inherit">
              キャンセル
            </Button>
            <Button onClick={handleDeleteSupplier} color="error" variant="contained">
              削除
            </Button>
          </DialogActions>
        </Dialog>
    </Container>
  );
};
