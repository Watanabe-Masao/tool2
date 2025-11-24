import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  IconButton,
  Box,
  Typography,
  Chip,
  Tabs,
  Tab,
  Button,
  DialogActions,
  Checkbox,
  DialogContentText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  TextField,
} from '@mui/material';
import { Close, Inventory2, Delete, PushPin, PushPinOutlined, ExpandMore } from '@mui/icons-material';
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
import type { ProductHistoryItem } from '@/hooks/useProductHistory';
import { getCategoryName, MAIN_CATEGORIES } from '@/utils/categories';
import { CategorySelectModal } from '@/components/modals/CategorySelectModal';
import { FirestoreService } from '@/services/firebase/firestoreService';

/**
 * ソート可能なプリセットアイテムのProps
 */
interface SortablePresetItemProps {
  preset: ProductHistoryItem;
  onSelect: (preset: ProductHistoryItem) => void;
  onSwipeStart: (e: React.TouchEvent | React.MouseEvent, presetId: string) => void;
  onSwipeMove: (e: React.TouchEvent | React.MouseEvent) => void;
  onSwipeEnd: (preset: ProductHistoryItem) => void;
  swipeState: {
    id: string | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isSwiping: boolean;
  };
  multiSelect?: boolean;
  isSelected?: boolean;
  isDuplicate?: boolean;
  quantity?: number;
  onQuantityChange?: (presetId: string, quantity: number) => void;
}

/**
 * ソート可能なプリセットアイテムコンポーネント
 */
const SortablePresetItem: React.FC<SortablePresetItemProps> = ({
  preset,
  onSelect,
  onSwipeStart,
  onSwipeMove,
  onSwipeEnd,
  swipeState,
  multiSelect = false,
  isSelected = false,
  isDuplicate = false,
  quantity = 0,
  onQuantityChange,
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
  const showPinHint = deltaX > 25;

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: showDeleteHint
          ? 'error.light'
          : showPinHint
          ? 'primary.light'
          : 'transparent',
        transition: showDeleteHint || showPinHint ? 'none' : 'background-color 0.2s',
        opacity: isDragging ? 0.5 : 1,
        cursor: preset.pinned ? 'grab' : 'pointer',
        '&:active': {
          cursor: preset.pinned ? 'grabbing' : 'pointer',
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
          <Delete />
        </Box>
      )}

      {/* ピン留めヒント背景 */}
      {showPinHint && (
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
            color: 'primary.contrastText',
          }}
        >
          {preset.pinned ? <PushPinOutlined /> : <PushPin />}
        </Box>
      )}

      <ListItemButton
        onClick={() => onSelect(preset)}
        onTouchStart={(e) => onSwipeStart(e, preset.id)}
        onTouchMove={onSwipeMove}
        onTouchEnd={() => onSwipeEnd(preset)}
        onMouseDown={(e) => onSwipeStart(e, preset.id)}
        onMouseMove={onSwipeMove}
        onMouseUp={() => onSwipeEnd(preset)}
        onMouseLeave={() => onSwipeEnd(preset)}
        {...(preset.pinned && !multiSelect ? listeners : {})}
        {...(preset.pinned && !multiSelect ? attributes : {})}
        sx={{
          py: 1.5,
          px: 2,
          transform: isCurrentSwiping ? `translateX(${deltaX}px)` : 'translateX(0)',
          transition: isCurrentSwiping ? 'none' : 'transform 0.2s',
          bgcolor: isSelected ? 'primary.50' : 'background.paper',
          cursor: isCurrentSwiping ? 'grabbing' : (preset.pinned && !multiSelect) ? 'grab' : 'pointer',
          touchAction: multiSelect ? 'auto' : 'none',
        }}
      >
        {/* 複数選択モードのチェックボックスと数量入力 */}
        {multiSelect && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
            <Checkbox
              edge="start"
              checked={isSelected}
              tabIndex={-1}
              disableRipple
            />
            {/* 選択時に数量入力欄を表示 */}
            {isSelected && onQuantityChange && (
              <TextField
                type="number"
                size="small"
                value={quantity || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  const val = parseInt(e.target.value) || 0;
                  onQuantityChange(preset.id, val);
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="数量"
                inputProps={{
                  min: 0,
                  style: { textAlign: 'center', width: '60px' }
                }}
                sx={{
                  width: '80px',
                  '& .MuiOutlinedInput-root': {
                    height: '32px',
                  },
                }}
              />
            )}
          </Box>
        )}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* ピン留めアイコン */}
          {preset.pinned && !multiSelect && (
            <PushPin sx={{ fontSize: '1rem', color: 'primary.main' }} />
          )}
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
              {isDuplicate && (
                <Chip
                  label="追加済み"
                  size="small"
                  color="warning"
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
        </Box>
      </ListItemButton>
    </Box>
  );
};

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
  /** プリセット更新後のリロードハンドラー */
  onReload?: () => Promise<void>;
  /** ユーザーID */
  userId?: string;
  /** 現在選択されている帳合先（この帳合先のプリセットを表示） */
  supplier?: string;
  /** 利用可能な帳合先リスト（複数帳合先対応） - オプション */
  suppliers?: string[];
  /** 複数選択モード */
  multiSelect?: boolean;
  /** 複数選択時のハンドラー（商品と数量を渡す） */
  onSelectMultiple?: (presets: Array<ProductHistoryItem & { totalDelivery?: number }>) => void;
  /** 現在の商品データ（重複チェック用） */
  currentProducts?: Array<{
    name: string;
    origin: string;
    specification?: string;
    supplier?: string;
  }>;
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
  onReload,
  userId,
  supplier,
  suppliers,
  multiSelect = false,
  onSelectMultiple,
  currentProducts = [],
}) => {
  // 選択された帳合先（複数帳合先対応）
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');

  // カテゴリーフィルターのタブ（0: 全て, 1: 果実, 2: 野菜）
  const [categoryFilter, setCategoryFilter] = useState(0);

  // 詳細カテゴリーフィルター（小カテゴリーコード）
  const [detailedCategoryCode, setDetailedCategoryCode] = useState<string>('');

  // カテゴリー選択モーダルの状態
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // 複数選択モード用の選択状態
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 複数選択モード用の数量状態（Map<presetId, quantity>）
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());

  // モーダルが開いたときに初期帳合先を設定
  useEffect(() => {
    if (open) {
      setSelectedSupplier(supplier || suppliers?.[0] || '');
      // モーダルを開いたときに選択状態と数量をクリア
      if (multiSelect) {
        setSelectedIds(new Set());
        setQuantities(new Map());
      }
    }
  }, [open, supplier, suppliers, multiSelect]);

  // 削除確認ダイアログの状態
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<ProductHistoryItem | null>(null);

  // ピン留め解除確認ダイアログの状態
  const [unpinDialogOpen, setUnpinDialogOpen] = useState(false);
  const [presetToUnpin, setPresetToUnpin] = useState<ProductHistoryItem | null>(null);

  // 重複確認ダイアログの状態
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicatePreset, setDuplicatePreset] = useState<ProductHistoryItem | null>(null);

  // 長押し検出用のタイマー
  const longPressTimer = useRef<number | null>(null);

  /**
   * プリセットが既存の商品と重複しているかチェック
   */
  const isDuplicate = (preset: ProductHistoryItem): boolean => {
    return currentProducts.some(
      (product) =>
        product.name === preset.name &&
        product.origin === preset.origin &&
        product.specification === preset.specification &&
        product.supplier === preset.supplier
    );
  };

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
   * カテゴリーと帳合先でフィルタリングしたプリセット
   */
  const filteredPresets = presets.filter((preset) => {
    // 帳合先でフィルタリング
    if (selectedSupplier && preset.supplier !== selectedSupplier) {
      return false;
    }

    // 詳細カテゴリーが選択されている場合は、それでフィルタリング
    if (detailedCategoryCode) {
      return preset.categoryCode === detailedCategoryCode;
    }

    // 大カテゴリーでフィルタリング
    if (categoryFilter === 0) {
      // 「全て」タブ：すべてのアイテムを表示
      return true;
    }

    if (categoryFilter === 1) {
      // 果実（61）タブ：果実カテゴリーのアイテムのみ表示（ピン留めも含む）
      return preset.categoryCode?.startsWith('0006') && preset.categoryCode <= '000612';
    }

    if (categoryFilter === 2) {
      // 野菜（62）タブ：野菜カテゴリーのアイテムのみ表示（ピン留めも含む）
      return preset.categoryCode?.startsWith('0006') && preset.categoryCode >= '000620';
    }

    return true;
  }).sort((a, b) => {
    // ピン留めアイテムを上に、その中ではpinOrder順にソート
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.pinned && b.pinned) {
      return (a.pinOrder ?? 9999) - (b.pinOrder ?? 9999);
    }
    return 0; // 通常アイテムは元の順序を維持
  });

  /**
   * プリセットを品名でグループ化
   */
  const groupedPresets = useMemo(() => {
    const groups = new Map<string, ProductHistoryItem[]>();

    filteredPresets.forEach((preset) => {
      const productName = preset.name;
      if (!groups.has(productName)) {
        groups.set(productName, []);
      }
      groups.get(productName)!.push(preset);
    });

    // グループをピン留め状態でソート
    return Array.from(groups.entries())
      .map(([name, items]) => ({
        name,
        items: items.sort((a, b) => {
          // グループ内でもピン留めを優先
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          if (a.pinned && b.pinned) {
            return (a.pinOrder ?? 9999) - (b.pinOrder ?? 9999);
          }
          return 0;
        }),
        hasPinned: items.some((item) => item.pinned),
        minPinOrder: items.reduce((min, item) =>
          item.pinned && item.pinOrder !== undefined
            ? Math.min(min, item.pinOrder)
            : min,
          9999
        ),
      }))
      .sort((a, b) => {
        // グループ自体もピン留め優先でソート
        if (a.hasPinned && !b.hasPinned) return -1;
        if (!a.hasPinned && b.hasPinned) return 1;
        if (a.hasPinned && b.hasPinned) {
          return a.minPinOrder - b.minPinOrder;
        }
        return 0;
      });
  }, [filteredPresets]);

  /**
   * プリセットを選択
   */
  const handleSelectPreset = (preset: ProductHistoryItem) => {
    // スワイプ中は選択しない
    if (swipeState.isSwiping) return;

    if (multiSelect) {
      // 複数選択モード: チェックボックスをトグル
      handleToggleSelect(preset.id);
    } else {
      // 単一選択モード: 重複チェック
      if (isDuplicate(preset)) {
        // 重複している場合は確認ダイアログを表示
        setDuplicatePreset(preset);
        setDuplicateDialogOpen(true);
      } else {
        // 重複していない場合はそのまま選択
        onSelect(preset);
        onClose();
      }
    }
  };

  /**
   * 重複確認ダイアログで「追加する」を選択
   */
  const handleConfirmDuplicate = () => {
    if (duplicatePreset) {
      onSelect(duplicatePreset);
      setDuplicateDialogOpen(false);
      setDuplicatePreset(null);
      onClose();
    }
  };

  /**
   * 重複確認ダイアログで「キャンセル」を選択
   */
  const handleCancelDuplicate = () => {
    setDuplicateDialogOpen(false);
    setDuplicatePreset(null);
  };

  /**
   * チェックボックスのトグル（複数選択モード用）
   */
  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
      // 選択解除時に数量もクリア
      const newQuantities = new Map(quantities);
      newQuantities.delete(id);
      setQuantities(newQuantities);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  /**
   * 数量変更ハンドラー（複数選択モード用）
   */
  const handleQuantityChange = (presetId: string, quantity: number) => {
    const newQuantities = new Map(quantities);
    if (quantity > 0) {
      newQuantities.set(presetId, quantity);
    } else {
      newQuantities.delete(presetId);
    }
    setQuantities(newQuantities);
  };

  /**
   * すべて選択/解除（複数選択モード用）
   */
  const handleSelectAll = () => {
    if (selectedIds.size === filteredPresets.length) {
      setSelectedIds(new Set());
      setQuantities(new Map());
    } else {
      setSelectedIds(new Set(filteredPresets.map((p) => p.id)));
    }
  };

  /**
   * 選択をクリア（複数選択モード用）
   */
  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setQuantities(new Map());
  };

  /**
   * 選択した商品を追加（複数選択モード用）
   */
  const handleAddSelected = () => {
    if (onSelectMultiple && selectedIds.size > 0) {
      const selectedPresets = filteredPresets
        .filter((p) => selectedIds.has(p.id))
        .map((preset) => ({
          ...preset,
          totalDelivery: quantities.get(preset.id) || 0,
        }));
      onSelectMultiple(selectedPresets);
      setSelectedIds(new Set());
      setQuantities(new Map());
      onClose();
    }
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

    // 上下の動きが大きい場合（20px以上）はスワイプをキャンセル
    // 許容範囲を広げて斜めスワイプにも対応
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
  const handleSwipeEnd = async (preset: ProductHistoryItem) => {
    if (!swipeState.id || swipeState.id !== preset.id) return;

    const deltaX = swipeState.currentX - swipeState.startX;
    const threshold = 60; // スワイプ判定の閾値を60pxに短縮（より反応しやすく）

    // 左スワイプ（削除）
    if (deltaX < -threshold) {
      setPresetToDelete(preset);
      setDeleteDialogOpen(true);
    }

    // 右スワイプ（ピン留め/ピン留め解除）
    if (deltaX > threshold) {
      if (preset.pinned) {
        // ピン留め済みの場合は解除確認ダイアログを表示
        setPresetToUnpin(preset);
        setUnpinDialogOpen(true);
      } else {
        // ピン留めしていない場合は直接ピン留め
        await handleTogglePin(preset, true);
      }
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
   * ピン留めをトグル
   */
  const handleTogglePin = async (preset: ProductHistoryItem, pinned: boolean) => {
    try {
      await FirestoreService.toggleProductHistoryPinned(
        preset.id,
        pinned,
        userId,
        supplier
      );
      // 親コンポーネントの状態を更新
      if (onReload) {
        await onReload();
      }
    } catch (error) {
      console.error('[ProductPresetModal] Failed to toggle pin:', error);
    }
  };

  /**
   * ピン留め解除を確定
   */
  const handleConfirmUnpin = async () => {
    if (!presetToUnpin) return;

    await handleTogglePin(presetToUnpin, false);
    setUnpinDialogOpen(false);
    setPresetToUnpin(null);
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

    // ピン留めアイテムのみを取得
    const pinnedItems = filteredPresets.filter((p) => p.pinned);
    const oldIndex = pinnedItems.findIndex((p) => p.id === active.id);
    const newIndex = pinnedItems.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      setActiveId(null);
      return;
    }

    // 並び替え
    const reordered = arrayMove(pinnedItems, oldIndex, newIndex);

    // pinOrderを更新
    const updates = reordered.map((item, index) => ({
      id: item.id,
      pinOrder: index,
    }));

    try {
      await FirestoreService.reorderPinnedPresets(updates);
      if (onReload) {
        await onReload();
      }
    } catch (error) {
      console.error('[ProductPresetModal] Failed to reorder:', error);
    }

    setActiveId(null);
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

        {/* 帳合先選択タブ（複数帳合先対応） */}
        {suppliers && suppliers.length > 1 && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
            <Tabs
              value={selectedSupplier}
              onChange={(_, newValue) => setSelectedSupplier(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {suppliers.map((sup) => (
                <Tab key={sup} label={sup} value={sup} />
              ))}
            </Tabs>
          </Box>
        )}

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
            <Box sx={{ py: 0 }}>
              {groupedPresets.map((group) => {
                // グループ内のアイテムが1つだけの場合は直接表示
                if (group.items.length === 1) {
                  const preset = group.items[0];
                  return (
                    <DndContext
                      key={`single-${preset.id}`}
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDndDragStart}
                      onDragEnd={handleDndDragEnd}
                      modifiers={[restrictToVerticalAxis]}
                    >
                      <SortableContext
                        items={preset.pinned ? [preset.id] : []}
                        strategy={verticalListSortingStrategy}
                      >
                        <SortablePresetItem
                          preset={preset}
                          onSelect={handleSelectPreset}
                          onSwipeStart={handleSwipeStart}
                          onSwipeMove={handleSwipeMove}
                          onSwipeEnd={handleSwipeEnd}
                          swipeState={swipeState}
                          multiSelect={multiSelect}
                          isSelected={selectedIds.has(preset.id)}
                          isDuplicate={isDuplicate(preset)}
                          quantity={quantities.get(preset.id) || 0}
                          onQuantityChange={handleQuantityChange}
                        />
                      </SortableContext>
                    </DndContext>
                  );
                }

                // グループ内に複数アイテムがある場合はアコーディオン表示
                const categoryCode = group.items[0].categoryCode;

                return (
                  <Accordion
                    key={group.name}
                    disableGutters
                    elevation={0}
                    sx={{
                      '&:before': { display: 'none' },
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMore />}
                      sx={{
                        minHeight: 56,
                        px: 2,
                        '& .MuiAccordionSummary-content': {
                          my: 1.5,
                          alignItems: 'center',
                          gap: 1,
                        },
                      }}
                    >
                      {/* ピン留めアイコン（グループ内にピン留めがある場合） */}
                      {group.hasPinned && (
                        <PushPin sx={{ fontSize: '1rem', color: 'primary.main' }} />
                      )}

                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {group.name}
                        </Typography>

                        {/* カテゴリーバッジ */}
                        {categoryCode && (
                          <Chip
                            label={getCategoryName(categoryCode)}
                            size="small"
                            color="primary"
                            sx={{ fontSize: '0.65rem', height: 18 }}
                          />
                        )}

                        {/* バリエーション数バッジ */}
                        <Badge
                          badgeContent={group.items.length}
                          color="secondary"
                          sx={{
                            '& .MuiBadge-badge': {
                              position: 'static',
                              transform: 'none',
                              fontSize: '0.65rem',
                              height: 18,
                              minWidth: 18,
                              borderRadius: '9px',
                            },
                          }}
                        />
                      </Box>
                    </AccordionSummary>

                    <AccordionDetails sx={{ p: 0, bgcolor: 'background.default' }}>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDndDragStart}
                        onDragEnd={handleDndDragEnd}
                        modifiers={[restrictToVerticalAxis]}
                      >
                        <List sx={{ py: 0 }}>
                          {/* ピン留めアイテムをソート可能に */}
                          <SortableContext
                            items={group.items.filter((p) => p.pinned).map((p) => p.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {group.items
                              .filter((p) => p.pinned)
                              .map((preset) => (
                                <SortablePresetItem
                                  key={preset.id}
                                  preset={preset}
                                  onSelect={handleSelectPreset}
                                  onSwipeStart={handleSwipeStart}
                                  onSwipeMove={handleSwipeMove}
                                  onSwipeEnd={handleSwipeEnd}
                                  swipeState={swipeState}
                                  multiSelect={multiSelect}
                                  isSelected={selectedIds.has(preset.id)}
                                  isDuplicate={isDuplicate(preset)}
                                  quantity={quantities.get(preset.id) || 0}
                                  onQuantityChange={handleQuantityChange}
                                />
                              ))}
                          </SortableContext>

                          {/* 通常アイテム（ピン留めされていない） */}
                          {group.items
                            .filter((p) => !p.pinned)
                            .map((preset) => (
                              <SortablePresetItem
                                key={preset.id}
                                preset={preset}
                                onSelect={handleSelectPreset}
                                onSwipeStart={handleSwipeStart}
                                onSwipeMove={handleSwipeMove}
                                onSwipeEnd={handleSwipeEnd}
                                swipeState={swipeState}
                                multiSelect={multiSelect}
                                isSelected={selectedIds.has(preset.id)}
                                isDuplicate={isDuplicate(preset)}
                                quantity={quantities.get(preset.id) || 0}
                                onQuantityChange={handleQuantityChange}
                              />
                            ))}
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
                                const activePreset = group.items.find((p) => p.id === activeId);
                                if (!activePreset) return null;

                                return (
                                  <ListItemButton sx={{ py: 1.5, px: 2, cursor: 'grabbing' }}>
                                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <PushPin sx={{ fontSize: '1rem', color: 'primary.main' }} />
                                      <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                          <Typography variant="body2" fontWeight="medium">
                                            {activePreset.name}
                                          </Typography>
                                          {activePreset.categoryCode && (
                                            <Chip
                                              label={getCategoryName(activePreset.categoryCode)}
                                              size="small"
                                              color="primary"
                                              sx={{ fontSize: '0.65rem', height: 18 }}
                                            />
                                          )}
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                          <Typography variant="caption" color="text.secondary">
                                            産地: {activePreset.origin}
                                          </Typography>
                                          {activePreset.specification && (
                                            <Typography variant="caption" color="text.secondary">
                                              規格: {activePreset.specification}
                                            </Typography>
                                          )}
                                          {activePreset.quantityPerPackage && (
                                            <Typography variant="caption" color="text.secondary">
                                              入数: {activePreset.quantityPerPackage}
                                              {activePreset.unit && ` ${activePreset.unit}`}
                                            </Typography>
                                          )}
                                        </Box>
                                      </Box>
                                    </Box>
                                  </ListItemButton>
                                );
                              })()}
                            </Box>
                          ) : null}
                        </DragOverlay>
                      </DndContext>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          )}
        </DialogContent>

        {/* 複数選択モード用のアクション */}
        {multiSelect && (
          <DialogActions>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, px: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {selectedIds.size} / {filteredPresets.length} 選択中
              </Typography>
              <Button size="small" onClick={handleSelectAll}>
                {selectedIds.size === filteredPresets.length ? 'すべて解除' : 'すべて選択'}
              </Button>
              {selectedIds.size > 0 && (
                <Button size="small" onClick={handleClearSelection}>
                  選択をクリア
                </Button>
              )}
            </Box>
            <Button onClick={onClose} color="inherit">
              キャンセル
            </Button>
            <Button
              onClick={handleAddSelected}
              variant="contained"
              color="primary"
              disabled={selectedIds.size === 0}
            >
              {selectedIds.size}件追加
            </Button>
          </DialogActions>
        )}
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

      {/* ピン留め解除確認ダイアログ */}
      <Dialog open={unpinDialogOpen} onClose={() => setUnpinDialogOpen(false)}>
        <DialogTitle>ピン留めを解除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            このプリセットのピン留めを解除してもよろしいですか？
          </DialogContentText>
          {presetToUnpin && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                {presetToUnpin.name}
              </Typography>
              {presetToUnpin.categoryCode && (
                <Typography variant="body2" color="text.secondary">
                  カテゴリー: {getCategoryName(presetToUnpin.categoryCode)}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                産地: {presetToUnpin.origin}
              </Typography>
            </Box>
          )}
          <DialogContentText sx={{ mt: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
            ピン留めを解除すると、通常のプリセットとして表示されます。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnpinDialogOpen(false)} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleConfirmUnpin} color="primary" variant="contained">
            ピン留め解除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 重複確認ダイアログ */}
      <Dialog open={duplicateDialogOpen} onClose={handleCancelDuplicate}>
        <DialogTitle>重複する商品があります</DialogTitle>
        <DialogContent>
          <DialogContentText>
            このプリセットと同じ商品がすでに追加されています。それでも追加しますか？
          </DialogContentText>
          {duplicatePreset && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.lighter', borderRadius: 1, border: 1, borderColor: 'warning.main' }}>
              <Typography variant="body2" fontWeight="medium">
                {duplicatePreset.name}
              </Typography>
              {duplicatePreset.categoryCode && (
                <Typography variant="body2" color="text.secondary">
                  カテゴリー: {getCategoryName(duplicatePreset.categoryCode)}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                産地: {duplicatePreset.origin}
              </Typography>
              {duplicatePreset.specification && (
                <Typography variant="body2" color="text.secondary">
                  規格: {duplicatePreset.specification}
                </Typography>
              )}
            </Box>
          )}
          <DialogContentText sx={{ mt: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
            追加すると、同じ商品が重複して登録されます。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDuplicate} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleConfirmDuplicate} color="warning" variant="contained">
            それでも追加する
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
