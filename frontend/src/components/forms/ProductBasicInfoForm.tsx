import React, { useState, useEffect } from 'react';
import { useWatch, useFormContext } from 'react-hook-form';
import type { Control, FieldErrors, FieldArrayWithId, UseFieldArrayAppend, UseFieldArrayRemove, UseFieldArrayMove } from 'react-hook-form';
import { Box, Typography, Alert, Button, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemButton } from '@mui/material';
import { Add, ChevronLeft, ChevronRight, NoteAdd, Inventory2, SwapVert, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { ProductFormCardBasic } from './ProductFormCardBasic';
import { ProductPresetModal } from '@/components/modals/ProductPresetModal';
import type { OrderFormData } from '@/schemas/orderSchema';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';
import { useProductHistory } from '@/hooks/useProductHistory';
import type { ProductHistoryItem } from '@/hooks/useProductHistory';
import { useAuthContext } from '@/context/AuthContext';
import { FirestoreService } from '@/services/firebase/firestoreService';

/**
 * ProductBasicInfoFormのProps
 */
interface ProductBasicInfoFormProps {
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** 品名のオートコンプリート候補 */
  productNameOptions?: string[];
  /** 産地のオートコンプリート候補 */
  originOptions?: string[];
  /** Enterキー押下時のハンドラー */
  onEnterPress?: () => void;
  /** 帳合先リスト（履歴フィルタ用） */
  suppliers?: string[];
  /** 商品フィールド配列 */
  fields: FieldArrayWithId<OrderFormData, 'products', 'id'>[];
  /** 商品追加関数 */
  append: UseFieldArrayAppend<OrderFormData, 'products'>;
  /** 商品削除関数 */
  remove: UseFieldArrayRemove;
  /** 商品移動関数 */
  move: UseFieldArrayMove;
  /** ステップ移動ハンドラー */
  onNavigateToStep?: (step: number) => void;
  /** 現在の商品インデックス（外部制御用） */
  activeProductIndex?: number;
  /** 商品インデックス変更ハンドラー */
  onProductIndexChange?: (index: number) => void;
}

/**
 * Step 2: 商品基本情報フォーム
 *
 * 商品の基本情報（品名、産地、規格、入数）を入力します。
 * 商品の追加・削除が可能です。
 */
export const ProductBasicInfoForm: React.FC<ProductBasicInfoFormProps> = ({
  control,
  errors,
  productNameOptions,
  originOptions,
  onEnterPress,
  suppliers,
  fields,
  append,
  remove,
  move,
  onNavigateToStep,
  activeProductIndex,
  onProductIndexChange,
}) => {
  // アクティブなタブのインデックス（外部制御または内部状態）
  const [internalTabIndex, setInternalTabIndex] = useState(0);
  const activeTabIndex = activeProductIndex !== undefined ? activeProductIndex : internalTabIndex;
  const setActiveTabIndex = (index: number | ((prev: number) => number)) => {
    const newIndex = typeof index === 'function' ? index(activeTabIndex) : index;
    if (onProductIndexChange) {
      onProductIndexChange(newIndex);
    } else {
      setInternalTabIndex(newIndex);
    }
  };

  // 全商品の実際のフォームデータを監視
  const products = useWatch({ control, name: 'products' });

  // フォームコンテキストからsetValueを取得
  const { setValue } = useFormContext<OrderFormData>();

  // ユーザー情報を取得
  const { user } = useAuthContext();

  // 商品追加メニューの状態
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);
  const addMenuOpen = Boolean(addMenuAnchor);

  // 商品一括追加モーダルの状態
  const [bulkAddModalOpen, setBulkAddModalOpen] = useState(false);

  // 商品並べ替えモーダルの状態
  const [reorderModalOpen, setReorderModalOpen] = useState(false);

  // ドラッグ&ドロップの状態
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0); // 垂直方向の移動オフセット
  const longPressTimer = React.useRef<number | null>(null);
  const dragStartPos = React.useRef<{ x: number; y: number } | null>(null);
  const isDragging = React.useRef(false);

  // PL（プリセット）履歴を取得（全帳合先の履歴）
  const { history: presetHistory, loadHistory: reloadPresetHistory } = useProductHistory(suppliers, undefined);

  /**
   * キーボードショートカット（Ctrl+← / Ctrl+→）でタブ移動
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'ArrowLeft' && activeTabIndex > 0) {
          e.preventDefault();
          setActiveTabIndex(activeTabIndex - 1);
        } else if (e.key === 'ArrowRight' && activeTabIndex < fields.length - 1) {
          e.preventDefault();
          setActiveTabIndex(activeTabIndex + 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabIndex, fields.length]);

  /**
   * 最後に選択された帳合先を取得
   */
  const getLastSelectedSupplier = (): string => {
    if (!suppliers?.length) return '';
    if (!products || products.length === 0) return suppliers[0];
    // 最後の商品の帳合先を取得（実際のフォームデータから）
    const lastProduct = products[products.length - 1];
    return lastProduct?.supplier || suppliers[0];
  };

  /**
   * 商品追加ボタンをクリック（メニューを表示）
   */
  const handleAddButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAddMenuAnchor(event.currentTarget);
  };

  /**
   * 商品追加メニューを閉じる
   */
  const handleCloseAddMenu = () => {
    setAddMenuAnchor(null);
  };

  /**
   * 空のカードを追加
   */
  const handleAddEmptyProduct = () => {
    // 手前で選択している帳合先をデフォルトとして設定
    const defaultSupplier = getLastSelectedSupplier();
    append({
      ...DEFAULT_PRODUCT_FORM_DATA,
      supplier: defaultSupplier,
      totalDelivery: 0,
      storeAllocations: new Array(STORE_COUNT).fill(0),
    });
    // 新しく追加された商品のタブに切り替え
    setActiveTabIndex(fields.length);
    handleCloseAddMenu();
  };

  /**
   * 履歴から商品を追加（複数選択モーダルを開く）
   */
  const handleAddFromHistory = () => {
    setBulkAddModalOpen(true);
    handleCloseAddMenu();
  };

  /**
   * 選択した商品を一括追加
   */
  const handleBulkAddProducts = (presets: ProductHistoryItem[]) => {
    if (presets.length === 0) return;

    // 現在のアクティブな商品が空かどうかをチェック
    const currentProduct = products[activeTabIndex];
    const isCurrentEmpty = currentProduct &&
      !currentProduct.name &&
      !currentProduct.origin &&
      !currentProduct.specification &&
      !currentProduct.quantityPerPackage;

    let startIndex = 0;

    // 空のカードがある場合は最初のプリセットで上書き
    if (isCurrentEmpty && fields.length === 1) {
      const firstPreset = presets[0];
      setValue(`products.${activeTabIndex}.categoryCode`, firstPreset.categoryCode || '');
      setValue(`products.${activeTabIndex}.supplier`, firstPreset.supplier);
      setValue(`products.${activeTabIndex}.name`, firstPreset.name);
      setValue(`products.${activeTabIndex}.origin`, firstPreset.origin);
      setValue(`products.${activeTabIndex}.specification`, firstPreset.specification);
      setValue(`products.${activeTabIndex}.quantityPerPackage`, firstPreset.quantityPerPackage);
      setValue(`products.${activeTabIndex}.unit`, firstPreset.unit);
      startIndex = 1; // 2番目のプリセットから追加開始
    }

    // 残りの商品を追加
    for (let i = startIndex; i < presets.length; i++) {
      const preset = presets[i];
      append({
        ...DEFAULT_PRODUCT_FORM_DATA,
        categoryCode: preset.categoryCode || '',
        supplier: preset.supplier,
        name: preset.name,
        origin: preset.origin,
        specification: preset.specification,
        quantityPerPackage: preset.quantityPerPackage,
        unit: preset.unit,
        totalDelivery: 0,
        storeAllocations: new Array(STORE_COUNT).fill(0),
      });
    }

    // 最後に追加された商品のタブに切り替え
    if (startIndex === 1) {
      // 最初のカードを上書きした場合
      if (presets.length > 1) {
        setActiveTabIndex(fields.length + presets.length - 2);
      } else {
        setActiveTabIndex(0);
      }
    } else {
      // すべて新規追加した場合
      setActiveTabIndex(fields.length + presets.length - 1);
    }
  };

  /**
   * プリセットから商品を追加
   */
  const handleAddProductFromPreset = (preset: any) => {
    append({
      ...DEFAULT_PRODUCT_FORM_DATA,
      categoryCode: preset.categoryCode || '',
      supplier: preset.supplier,
      name: preset.name,
      origin: preset.origin,
      specification: preset.specification,
      quantityPerPackage: preset.quantityPerPackage,
      unit: preset.unit,
      totalDelivery: 0,
      storeAllocations: new Array(STORE_COUNT).fill(0),
    });
    // 新しく追加された商品のタブに切り替え
    setActiveTabIndex(fields.length);
  };

  /**
   * プリセットを削除
   */
  const handleDeletePreset = async (presetId: string) => {
    try {
      await FirestoreService.deleteProductHistoryById(presetId);
      // 履歴を再読み込み
      await reloadPresetHistory();
    } catch (error) {
      console.error('[ProductBasicInfoForm] Failed to delete preset:', error);
      throw error;
    }
  };

  /**
   * 商品を削除
   */
  const handleRemoveProduct = (index: number) => {
    remove(index);
    // アクティブなタブが削除された場合は、前のタブに移動
    if (activeTabIndex >= index && activeTabIndex > 0) {
      setActiveTabIndex(activeTabIndex - 1);
    }
  };

  /**
   * 長押し開始（ドラッグ開始の検出）
   */
  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent, index: number) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartPos.current = { x: clientX, y: clientY };
    isDragging.current = false;

    // 500ms長押しでドラッグモード開始
    longPressTimer.current = window.setTimeout(() => {
      isDragging.current = true;
      setDragIndex(index);
      setDropIndex(index);
    }, 500);
  };

  /**
   * ドラッグ中の移動
   */
  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!dragStartPos.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = Math.abs(clientX - dragStartPos.current.x);
    const deltaY = Math.abs(clientY - dragStartPos.current.y);

    // 移動が検出されたら長押しタイマーをキャンセル（ドラッグ開始前のみ）
    if (!isDragging.current && (deltaX > 10 || deltaY > 10)) {
      if (longPressTimer.current) {
        window.clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      dragStartPos.current = null;
      return;
    }

    // ドラッグ中の場合、ドロップ位置とオフセットを計算
    if (isDragging.current && dragIndex !== null) {
      // 垂直方向の移動距離を計算
      const moveDistance = clientY - dragStartPos.current.y;
      setDragOffset(moveDistance); // 指の移動オフセットを更新

      // ドロップ位置を計算
      const itemHeight = 65; // ListItem高さの概算
      const offset = Math.round(moveDistance / itemHeight);
      const newDropIndex = Math.max(0, Math.min(fields.length - 1, dragIndex + offset));
      setDropIndex(newDropIndex);
    }
  };

  /**
   * ドラッグ終了
   */
  const handleDragEnd = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // ドラッグが完了していて、位置が変わった場合、並び替えを実行
    if (isDragging.current && dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      move(dragIndex, dropIndex);
      // アクティブタブのインデックスを調整
      if (activeTabIndex === dragIndex) {
        setActiveTabIndex(dropIndex);
      } else if (dragIndex < dropIndex && activeTabIndex > dragIndex && activeTabIndex <= dropIndex) {
        setActiveTabIndex(activeTabIndex - 1);
      } else if (dragIndex > dropIndex && activeTabIndex >= dropIndex && activeTabIndex < dragIndex) {
        setActiveTabIndex(activeTabIndex + 1);
      }
    }

    // 状態をリセット
    isDragging.current = false;
    setDragIndex(null);
    setDropIndex(null);
    setDragOffset(0);
    dragStartPos.current = null;
  };

  return (
    <Box>
      {/* ヘッダーセクション */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" fontWeight="medium">
          商品情報1
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SwapVert />}
            onClick={() => setReorderModalOpen(true)}
            disabled={fields.length <= 1}
            sx={{ fontSize: '0.8rem' }}
          >
            並べ替え
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={handleAddButtonClick}
            disabled={fields.length >= 50}
            sx={{ fontSize: '0.8rem' }}
          >
            商品を追加
          </Button>
        </Box>
      </Box>

      {/* 商品追加メニュー */}
      <Menu
        anchorEl={addMenuAnchor}
        open={addMenuOpen}
        onClose={handleCloseAddMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleAddEmptyProduct}>
          <ListItemIcon>
            <NoteAdd fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="空のカードを追加"
            secondary="新規商品を入力"
          />
        </MenuItem>
        <MenuItem onClick={handleAddFromHistory}>
          <ListItemIcon>
            <Inventory2 fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="PLから追加"
            secondary="保存したプリセットを選択"
          />
        </MenuItem>
      </Menu>

      {/* エラー表示 */}
      {errors.products && typeof errors.products.message === 'string' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.products.message}
        </Alert>
      )}

      {/* 商品カード表示エリア（1枚ずつ表示） */}
      <Box sx={{ position: 'relative' }}>
        {/* 左端のナビゲーションボタン */}
        {fields.length > 1 && activeTabIndex > 0 && (
          <IconButton
            size="medium"
            onClick={() => setActiveTabIndex(Math.max(0, activeTabIndex - 1))}
            sx={{
              position: 'absolute',
              left: -20,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              opacity: 0.4,
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': {
                opacity: 0.7,
                bgcolor: 'background.paper',
              },
            }}
          >
            <ChevronLeft />
          </IconButton>
        )}

        {/* 右端のナビゲーションボタン */}
        {fields.length > 1 && activeTabIndex < fields.length - 1 && (
          <IconButton
            size="medium"
            onClick={() => setActiveTabIndex(Math.min(fields.length - 1, activeTabIndex + 1))}
            sx={{
              position: 'absolute',
              right: -20,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              opacity: 0.4,
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': {
                opacity: 0.7,
                bgcolor: 'background.paper',
              },
            }}
          >
            <ChevronRight />
          </IconButton>
        )}

        {/* 商品番号表示（上部中央） */}
        {fields.length > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'medium' }}>
              商品 {activeTabIndex + 1} / {fields.length}
            </Typography>
          </Box>
        )}

        {/* アクティブな商品カードのみ表示 */}
        {fields.map((field, index) => {
          const isActive = activeTabIndex === index;
          return (
            <Box
              key={field.id}
              sx={{
                display: isActive ? 'block' : 'none',
              }}
            >
              <ProductFormCardBasic
                index={index}
                control={control}
                errors={errors}
                onRemove={() => handleRemoveProduct(index)}
                showRemove={fields.length > 1}
                productNameOptions={productNameOptions}
                originOptions={originOptions}
                onEnterPress={onEnterPress}
                suppliers={suppliers}
                onNavigateToStep={onNavigateToStep}
                onAddProductFromPreset={handleAddProductFromPreset}
              />
            </Box>
          );
        })}
      </Box>

      {/* 商品一括追加モーダル（PL複数選択モード） */}
      <ProductPresetModal
        open={bulkAddModalOpen}
        onClose={() => setBulkAddModalOpen(false)}
        onSelect={() => {}} // 複数選択モードでは使用しない
        onDelete={handleDeletePreset}
        presets={presetHistory}
        onReload={reloadPresetHistory}
        userId={user?.uid}
        suppliers={suppliers}
        multiSelect={true}
        onSelectMultiple={handleBulkAddProducts}
        currentProducts={fields.map((field) => ({
          name: field.name,
          origin: field.origin,
          specification: field.specification,
          supplier: field.supplier,
        }))}
      />

      {/* 商品並べ替えモーダル */}
      <Dialog
        open={reorderModalOpen}
        onClose={() => setReorderModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>商品の並べ替え</DialogTitle>
        <DialogContent>
          <List
            sx={{ pt: 0 }}
            onTouchMove={handleDragMove}
            onMouseMove={handleDragMove}
          >
            {fields.map((field, index) => {
              const product = products?.[index];
              const isBeingDragged = dragIndex === index;
              const isDropTarget = dropIndex === index && dragIndex !== index;
              return (
                <ListItem
                  key={field.id}
                  onTouchStart={(e) => handleLongPressStart(e, index)}
                  onTouchEnd={handleDragEnd}
                  onMouseDown={(e) => handleLongPressStart(e, index)}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                  sx={{
                    border: 1,
                    borderColor: isBeingDragged || isDropTarget ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: 'background.paper',
                    cursor: isBeingDragged ? 'grabbing' : 'grab',
                    opacity: isBeingDragged ? 0.9 : 1,
                    transform: isBeingDragged
                      ? `translateY(${dragOffset}px) scale(1.05)`
                      : isDropTarget
                      ? 'scale(1.03)'
                      : 'scale(1)',
                    transition: isBeingDragged
                      ? 'opacity 0.2s, box-shadow 0.2s, border-color 0.2s'
                      : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isBeingDragged ? 8 : isDropTarget ? 2 : 0,
                    zIndex: isBeingDragged ? 10 : 1,
                  }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => {
                          if (index > 0) {
                            move(index, index - 1);
                            if (activeTabIndex === index) {
                              setActiveTabIndex(index - 1);
                            } else if (activeTabIndex === index - 1) {
                              setActiveTabIndex(index);
                            }
                          }
                        }}
                        disabled={index === 0 || isDragging.current}
                      >
                        <ArrowUpward fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => {
                          if (index < fields.length - 1) {
                            move(index, index + 1);
                            if (activeTabIndex === index) {
                              setActiveTabIndex(index + 1);
                            } else if (activeTabIndex === index + 1) {
                              setActiveTabIndex(index);
                            }
                          }
                        }}
                        disabled={index === fields.length - 1 || isDragging.current}
                      >
                        <ArrowDownward fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemButton sx={{ cursor: 'inherit', '&:hover': { bgcolor: 'transparent' } }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        商品 {index + 1}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {product?.name || '未入力'} {product?.origin && `(${product.origin})`}
                      </Typography>
                    </Box>
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReorderModalOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
