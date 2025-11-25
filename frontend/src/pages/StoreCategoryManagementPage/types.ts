/**
 * StoreCategoryManagementPage 共通型定義
 */

import type { StoreCategory } from '@/types/storeCategory';
import type { SupplierPresetEntity } from '@/hooks/useSupplierPresets';

/**
 * スワイプ状態の共通型
 */
export interface SwipeState {
  id: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isSwiping: boolean;
}

/**
 * ドラッグ&ドロップ状態の型
 */
export interface DragState {
  draggingId: string | null;
  longPressTimer: number | null;
  startY: number;
  currentY: number;
  dragOverIndex: number | null;
  isDragging: boolean;
}

/**
 * カテゴリー管理タブのprops
 */
export interface CategoryManagementTabProps {
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
}

/**
 * 販売構成比設定タブのprops
 */
export interface SalesRatioSettingsTabProps {
  storeSettings: Record<string, import('@/types/storeSettings').StoreSettings>;
  categories: StoreCategory[];
  selectedCategoryFilter: string[];
  onSettingChange: (storeCode: string, field: 'salesRatio' | 'enabled', value: number | boolean) => void;
  onSave: () => Promise<void>;
  onCategoryFilterChange: (categoryId: string) => void;
}

/**
 * 帳合先管理タブのprops
 */
export interface SupplierPresetTabProps {
  presets: SupplierPresetEntity[];
  onAddPreset: (name: string) => Promise<boolean>;
  onEditPreset: (id: string, name: string) => Promise<boolean>;
  onDeletePreset: (id: string) => Promise<boolean>;
  onReorderPresets: (reorderedItems: Array<{ id: string; displayOrder: number }>) => Promise<void>;
}

/**
 * 初期スワイプ状態
 */
export const INITIAL_SWIPE_STATE: SwipeState = {
  id: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  isSwiping: false,
};

/**
 * 初期ドラッグ状態
 */
export const INITIAL_DRAG_STATE: DragState = {
  draggingId: null,
  longPressTimer: null,
  startY: 0,
  currentY: 0,
  dragOverIndex: null,
  isDragging: false,
};
