/**
 * カテゴリー管理ロジックフック
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { StoreCategoryService } from '@/services/firebase/storeCategoryService';
import { STORE_DATA } from '@/utils/constants';
import type { StoreCategory } from '@/types/storeCategory';

interface UseCategoryManagementProps {
  userId: string | undefined;
}

/**
 * カテゴリー管理のロジックを提供するカスタムフック
 */
export const useCategoryManagement = ({ userId }: UseCategoryManagementProps) => {
  const { showSuccess, showError, showLoading, hideLoading } = useNotification();

  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory | null>(null);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // カテゴリーを読み込み
  const loadCategories = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      showLoading();
      const data = await StoreCategoryService.getAll(userId);
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      showError('カテゴリーの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
      hideLoading();
    }
  }, [userId, showLoading, hideLoading, showError]);

  // 未分類の店舗を取得
  const getUncategorizedStores = useCallback(() => {
    const categorizedStoreIds = new Set<string>();
    categories.forEach((cat) => {
      cat.storeIds.forEach((id) => categorizedStoreIds.add(id));
    });

    return STORE_DATA.filter((store) => !categorizedStoreIds.has(store.code));
  }, [categories]);

  // カテゴリー追加
  const addCategory = useCallback(
    async (name: string) => {
      if (!userId || !name.trim()) return;

      try {
        showLoading();
        await StoreCategoryService.create(userId, {
          name: name.trim(),
          storeIds: [],
          order: categories.length,
        });
        await loadCategories();
        showSuccess('カテゴリーを追加しました');
      } catch (error) {
        console.error('Error adding category:', error);
        showError('カテゴリーの追加に失敗しました');
        throw error;
      } finally {
        hideLoading();
      }
    },
    [userId, categories.length, loadCategories, showLoading, hideLoading, showSuccess, showError]
  );

  // カテゴリー編集
  const editCategory = useCallback(
    async (category: StoreCategory, newName: string) => {
      if (!userId || !newName.trim()) return;

      try {
        showLoading();
        await StoreCategoryService.update(userId, category.id, {
          name: newName.trim(),
        });
        await loadCategories();
        showSuccess('カテゴリーを更新しました');
      } catch (error) {
        console.error('Error updating category:', error);
        showError('カテゴリーの更新に失敗しました');
        throw error;
      } finally {
        hideLoading();
      }
    },
    [userId, loadCategories, showLoading, hideLoading, showSuccess, showError]
  );

  // カテゴリー削除
  const deleteCategory = useCallback(
    async (category: StoreCategory) => {
      if (!userId) return;

      try {
        showLoading();
        await StoreCategoryService.delete(userId, category.id);
        await loadCategories();
        if (selectedCategory?.id === category.id) {
          setSelectedCategory(null);
        }
        showSuccess('カテゴリーを削除しました');
      } catch (error) {
        console.error('Error deleting category:', error);
        showError('カテゴリーの削除に失敗しました');
        throw error;
      } finally {
        hideLoading();
      }
    },
    [userId, selectedCategory, loadCategories, showLoading, hideLoading, showSuccess, showError]
  );

  // 店舗をカテゴリーに追加
  const addStoresToCategory = useCallback(async () => {
    if (!userId || !selectedCategory || selectedStores.length === 0) return;

    try {
      showLoading();
      for (const storeId of selectedStores) {
        await StoreCategoryService.moveStore(userId, storeId, null, selectedCategory.id);
      }
      await loadCategories();
      setSelectedStores([]);
      showSuccess(`${selectedStores.length}件の店舗を追加しました`);
    } catch (error) {
      console.error('Error adding stores to category:', error);
      showError('店舗の追加に失敗しました');
      throw error;
    } finally {
      hideLoading();
    }
  }, [userId, selectedCategory, selectedStores, loadCategories, showLoading, hideLoading, showSuccess, showError]);

  // 店舗をカテゴリーから削除
  const removeStoresFromCategory = useCallback(async () => {
    if (!userId || !selectedCategory || selectedStores.length === 0) return;

    try {
      showLoading();
      for (const storeId of selectedStores) {
        await StoreCategoryService.removeStoreFromCategory(userId, storeId, selectedCategory.id);
      }
      await loadCategories();
      setSelectedStores([]);
      showSuccess(`${selectedStores.length}件の店舗を削除しました`);
    } catch (error) {
      console.error('Error removing stores from category:', error);
      showError('店舗の削除に失敗しました');
      throw error;
    } finally {
      hideLoading();
    }
  }, [userId, selectedCategory, selectedStores, loadCategories, showLoading, hideLoading, showSuccess, showError]);

  // 初回ロード
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 戻り値をメモ化して安定した参照を維持（無限ループ防止）
  return useMemo(
    () => ({
      categories,
      selectedCategory,
      selectedStores,
      isLoading,
      setSelectedCategory,
      setSelectedStores,
      loadCategories,
      getUncategorizedStores,
      addCategory,
      editCategory,
      deleteCategory,
      addStoresToCategory,
      removeStoresFromCategory,
    }),
    [
      categories,
      selectedCategory,
      selectedStores,
      isLoading,
      loadCategories,
      getUncategorizedStores,
      addCategory,
      editCategory,
      deleteCategory,
      addStoresToCategory,
      removeStoresFromCategory,
    ]
  );
};
