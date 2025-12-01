/**
 * 店舗カテゴリー管理ページ
 *
 * @description
 * - カテゴリー管理: 店舗を大型店、中型店などに分類
 * - 販売構成比設定: 各店舗の販売構成比を設定
 * - 帳合先管理: 帳合先の追加・編集・削除・並び替え
 */

import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, IconButton, Tabs, Tab } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { useSupplierPresets } from '@/hooks/useSupplierPresets';
import { useNotification } from '@/context/NotificationContext';
import { CategoryManagementTab } from './components/CategoryManagementTab';
import { SalesRatioSettingsTab } from './components/SalesRatioSettingsTab';
import { SupplierPresetTab } from './components/SupplierPresetTab';
import { useCategoryManagement } from './hooks/useCategoryManagement';
import { useSalesRatioSettings } from './hooks/useSalesRatioSettings';

/**
 * 店舗カテゴリー管理ページコンポーネント
 */
export const StoreCategoryManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { showSuccess, showError } = useNotification();

  const [tabValue, setTabValue] = useState(0);

  // カテゴリー管理
  const categoryManagement = useCategoryManagement({ userId: user?.uid });

  // 販売構成比設定
  const salesRatioSettings = useSalesRatioSettings({ userId: user?.uid });

  // 帳合先プリセット
  const { presets, addPreset, deletePreset, updatePreset, loadPresets } = useSupplierPresets();

  // タブ切り替え時のデータ読み込み
  useEffect(() => {
    if (tabValue === 0) {
      categoryManagement.loadCategories();
    } else if (tabValue === 1) {
      salesRatioSettings.loadStoreSettings();
    } else if (tabValue === 2) {
      loadPresets();
    }
  }, [tabValue]);

  // 帳合先操作のラッパー
  const handleAddPreset = async (name: string, centerFeeRate?: number): Promise<boolean> => {
    const success = await addPreset(name, centerFeeRate);
    if (success) {
      showSuccess('帳合先を追加しました');
    } else {
      showError('帳合先の追加に失敗しました');
    }
    return success;
  };

  const handleEditPreset = async (id: string, name: string, centerFeeRate?: number): Promise<boolean> => {
    const success = await updatePreset(id, name, centerFeeRate);
    if (success) {
      showSuccess('帳合先を更新しました');
    } else {
      showError('帳合先の更新に失敗しました');
    }
    return success;
  };

  const handleDeletePreset = async (id: string): Promise<boolean> => {
    const success = await deletePreset(id);
    if (success) {
      showSuccess('帳合先を削除しました');
    } else {
      showError('帳合先の削除に失敗しました');
    }
    return success;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate('/new-order')} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" fontWeight="bold">
            各種管理
          </Typography>
        </Box>

        {/* タブ */}
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="カテゴリー管理" />
          <Tab label="販売構成比設定" />
          <Tab label="帳合先管理" />
        </Tabs>

        {/* カテゴリー管理タブ */}
        {tabValue === 0 && (
          <CategoryManagementTab
            categories={categoryManagement.categories}
            selectedCategory={categoryManagement.selectedCategory}
            selectedStores={categoryManagement.selectedStores}
            onCategorySelect={categoryManagement.setSelectedCategory}
            onStoreSelect={categoryManagement.setSelectedStores}
            onAddCategory={categoryManagement.addCategory}
            onEditCategory={categoryManagement.editCategory}
            onDeleteCategory={categoryManagement.deleteCategory}
            onAddStoresToCategory={categoryManagement.addStoresToCategory}
            onRemoveStoresFromCategory={categoryManagement.removeStoresFromCategory}
            uncategorizedStores={categoryManagement.getUncategorizedStores()}
          />
        )}

        {/* 販売構成比設定タブ */}
        {tabValue === 1 && (
          <SalesRatioSettingsTab
            storeSettings={salesRatioSettings.storeSettings}
            categories={categoryManagement.categories}
            selectedCategoryFilter={salesRatioSettings.selectedCategoryFilter}
            onSettingChange={salesRatioSettings.changeStoreSetting}
            onSave={salesRatioSettings.saveStoreSettings}
            onCategoryFilterChange={salesRatioSettings.toggleCategoryFilter}
            onClearCategoryFilter={() => {
              // カテゴリーフィルターをクリア
              salesRatioSettings.selectedCategoryFilter.forEach((id) => {
                salesRatioSettings.toggleCategoryFilter(id);
              });
            }}
            onLoadCategories={categoryManagement.loadCategories}
          />
        )}

        {/* 帳合先管理タブ */}
        {tabValue === 2 && (
          <SupplierPresetTab
            presets={presets}
            onAddPreset={handleAddPreset}
            onEditPreset={handleEditPreset}
            onDeletePreset={handleDeletePreset}
            loadPresets={loadPresets}
          />
        )}
      </Box>
    </Container>
  );
};
