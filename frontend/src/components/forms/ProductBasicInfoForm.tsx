import React, { useState, useEffect } from 'react';
import { Controller, useWatch, useFormContext } from 'react-hook-form';
import type { Control, FieldErrors, FieldArrayWithId, UseFieldArrayAppend, UseFieldArrayRemove, UseFieldArrayMove } from 'react-hook-form';
import { Box, Typography, Alert, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemButton, Stack, Chip, Divider } from '@mui/material';
import { Add, ChevronLeft, ChevronRight, Inventory2, SwapVert, ArrowUpward, ArrowDownward, Settings } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSupplierPresets } from '@/hooks/useSupplierPresets';
import { getSupplierColor, getSupplierColorWithOpacity } from '@/constants/supplierColors';
import { ProductFormCardBasic } from './ProductFormCardBasic';
import { ProductPresetModal } from '@/components/modals/ProductPresetModal';
import type { OrderFormData } from '@/schemas/orderSchema';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';
import { useProductHistory } from '@/hooks/useProductHistory';
import type { ProductHistoryItem } from '@/hooks/useProductHistory';
import { useAuthContext } from '@/context/AuthContext';
import { useFirestoreService } from '@/context/ServiceContext';

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
  /** 帳合先変更時のカスタムハンドラー */
  onSuppliersChange?: (newValue: string[]) => string[];
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
  onSuppliersChange,
}) => {
  const navigate = useNavigate();
  const firestoreService = useFirestoreService();
  const { presets } = useSupplierPresets();

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
  const currentSuppliers = useWatch({ control, name: 'suppliers' });

  // フォームコンテキストからsetValueを取得
  const { setValue } = useFormContext<OrderFormData>();

  // ユーザー情報を取得
  const { user } = useAuthContext();

  // 商品一括追加モーダルの状態
  const [bulkAddModalOpen, setBulkAddModalOpen] = useState(false);

  // 商品並べ替えモーダルの状態
  const [reorderModalOpen, setReorderModalOpen] = useState(false);

  // 空ページクリーンアップ確認ダイアログの状態
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [emptyProductIndices, setEmptyProductIndices] = useState<number[]>([]);

  // ページネーション長押しタイマー
  const paginationLongPressTimer = React.useRef<number | null>(null);

  // ドラッグ&ドロップの状態
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0); // 垂直方向の移動オフセット
  const longPressTimer = React.useRef<number | null>(null);
  const dragStartPos = React.useRef<{ x: number; y: number } | null>(null);
  const isDragging = React.useRef(false);

  // 初期化時に全帳合先を選択状態にする
  const hasInitializedSuppliers = React.useRef(false);
  useEffect(() => {
    if (!hasInitializedSuppliers.current && presets.length > 0 && (!currentSuppliers || currentSuppliers.length === 0)) {
      const allSuppliers = presets.map(p => p.supplier);
      setValue('suppliers', allSuppliers);
      hasInitializedSuppliers.current = true;
    }
  }, [presets, currentSuppliers, setValue]);

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
  };

  /**
   * 履歴から商品を追加（複数選択モーダルを開く）
   */
  const handleAddFromHistory = () => {
    setBulkAddModalOpen(true);
  };

  /**
   * 選択した商品を一括追加
   */
  const handleBulkAddProducts = (presets: Array<ProductHistoryItem & { totalDelivery?: number }>) => {
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
      // 数量が入力されている場合はtotalDeliveryに反映
      setValue(`products.${activeTabIndex}.totalDelivery`, firstPreset.totalDelivery || 0);
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
        // 数量が入力されている場合はtotalDeliveryに反映
        totalDelivery: preset.totalDelivery || 0,
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
      await firestoreService.deleteProductHistoryById(presetId);
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

  /**
   * 空の商品ページを検出
   */
  const findEmptyProducts = (): number[] => {
    if (!products) return [];
    return products.reduce((indices: number[], product, index) => {
      const isEmpty = !product.name && !product.origin && !product.specification;
      if (isEmpty) indices.push(index);
      return indices;
    }, []);
  };

  /**
   * ページネーション長押し開始
   */
  const handlePaginationLongPressStart = () => {
    paginationLongPressTimer.current = window.setTimeout(() => {
      const emptyIndices = findEmptyProducts();
      if (emptyIndices.length > 0) {
        setEmptyProductIndices(emptyIndices);
        setCleanupDialogOpen(true);
      }
    }, 600);
  };

  /**
   * ページネーション長押し終了
   */
  const handlePaginationLongPressEnd = () => {
    if (paginationLongPressTimer.current) {
      window.clearTimeout(paginationLongPressTimer.current);
      paginationLongPressTimer.current = null;
    }
  };

  /**
   * 空の商品ページを削除
   */
  const handleCleanupEmptyProducts = () => {
    // 降順でソートして後ろから削除（インデックスがずれないように）
    const sortedIndices = [...emptyProductIndices].sort((a, b) => b - a);
    sortedIndices.forEach(idx => remove(idx));
    setCleanupDialogOpen(false);
    setEmptyProductIndices([]);
    // アクティブタブを調整
    if (activeTabIndex >= fields.length - emptyProductIndices.length) {
      setActiveTabIndex(Math.max(0, fields.length - emptyProductIndices.length - 1));
    }
  };

  return (
    <Box>
      {/* 帳合先絞り込みセクション */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight="medium">
              帳合先の絞り込み
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Controller
                name="suppliers"
                control={control}
                render={({ field }) => (
                  <>
                    <Typography
                      component="span"
                      onClick={() => {
                        const allSuppliers = presets.map(p => p.supplier);
                        const finalValue = onSuppliersChange ? onSuppliersChange(allSuppliers) : allSuppliers;
                        field.onChange(finalValue);
                      }}
                      sx={{
                        fontSize: '0.65rem',
                        color: 'primary.main',
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      全選択
                    </Typography>
                    <Typography component="span" sx={{ fontSize: '0.65rem', color: 'grey.400' }}>|</Typography>
                    <Typography
                      component="span"
                      onClick={() => {
                        const finalValue = onSuppliersChange ? onSuppliersChange([]) : [];
                        field.onChange(finalValue);
                      }}
                      sx={{
                        fontSize: '0.65rem',
                        color: 'grey.500',
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      クリア
                    </Typography>
                  </>
                )}
              />
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={() => navigate('/store-categories', { state: { tab: 1 } })}
            sx={{ color: 'grey.500' }}
          >
            <Settings sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Controller
          name="suppliers"
          control={control}
          render={({ field }) => (
            <Box>
              {presets.length > 0 ? (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {presets.map((preset, index) => {
                    const isSelected = field.value?.includes(preset.supplier);
                    const supplierColor = getSupplierColor(index);
                    return (
                      <Chip
                        key={preset.id}
                        label={preset.supplier}
                        onClick={() => {
                          const currentValue = field.value || [];
                          let newValue: string[];
                          if (isSelected) {
                            newValue = currentValue.filter((s: string) => s !== preset.supplier);
                          } else {
                            newValue = [...currentValue, preset.supplier];
                          }
                          const finalValue = onSuppliersChange ? onSuppliersChange(newValue) : newValue;
                          field.onChange(finalValue);
                        }}
                        size="small"
                        sx={{
                          mb: 0.5,
                          borderLeft: `3px solid ${supplierColor}`,
                          bgcolor: isSelected ? getSupplierColorWithOpacity(supplierColor, 0.15) : 'grey.100',
                          color: isSelected ? supplierColor : 'text.primary',
                          fontWeight: isSelected ? 600 : 400,
                          transition: 'none',
                          '& .MuiChip-label': {
                            transition: 'none',
                          },
                          '&:hover': {
                            bgcolor: getSupplierColorWithOpacity(supplierColor, 0.2),
                          },
                        }}
                      />
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  帳合先が登録されていません。設定アイコンから追加してください。
                </Typography>
              )}
            </Box>
          )}
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* ヘッダーセクション */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" fontWeight="medium">
          商品情報
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            variant="text"
            size="small"
            startIcon={<Inventory2 sx={{ fontSize: 16 }} />}
            onClick={handleAddFromHistory}
            sx={{ fontSize: '0.7rem', px: 1, minWidth: 0, color: 'grey.600' }}
          >
            PL
          </Button>
          <Button
            variant="text"
            size="small"
            startIcon={<SwapVert sx={{ fontSize: 16 }} />}
            onClick={() => setReorderModalOpen(true)}
            disabled={fields.length <= 1}
            sx={{ fontSize: '0.7rem', px: 1, minWidth: 0, color: 'grey.600' }}
          >
            並替
          </Button>
          <Button
            variant="text"
            size="small"
            startIcon={<Add sx={{ fontSize: 16 }} />}
            onClick={handleAddEmptyProduct}
            disabled={fields.length >= 50}
            sx={{ fontSize: '0.7rem', px: 1, minWidth: 0, color: 'grey.600' }}
          >
            追加
          </Button>
        </Box>
      </Box>

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

        {/* ページネーションドット（長押しで空ページクリーンアップ） */}
        {fields.length > 1 && (
          <Box
            onTouchStart={handlePaginationLongPressStart}
            onTouchEnd={handlePaginationLongPressEnd}
            onMouseDown={handlePaginationLongPressStart}
            onMouseUp={handlePaginationLongPressEnd}
            onMouseLeave={handlePaginationLongPressEnd}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 0.5,
              mt: 2.5,
              py: 1.5,
              px: 2,
              mx: 'auto',
              maxWidth: 'fit-content',
              borderRadius: 3,
              bgcolor: 'rgba(0, 0, 0, 0.02)',
              userSelect: 'none',
            }}
          >
            {fields.map((_, index) => {
              const isActive = activeTabIndex === index;
              const product = products?.[index];
              // 必須項目: 品名、産地、規格、入数
              const isComplete = product &&
                product.name &&
                product.origin &&
                product.specification &&
                product.quantityPerPackage;
              const isEmpty = product && !product.name && !product.origin && !product.specification;

              // 非アクティブ時の色: 完了→青、不完全→黄色、空→赤(破線)
              const inactiveDotColor = isEmpty
                ? 'rgba(239, 83, 80, 0.4)'
                : isComplete
                  ? 'rgba(25, 118, 210, 0.6)'
                  : 'rgba(255, 193, 7, 0.7)';

              const inactiveHoverColor = isEmpty
                ? 'rgba(239, 83, 80, 0.5)'
                : isComplete
                  ? 'rgba(25, 118, 210, 0.8)'
                  : 'rgba(255, 193, 7, 0.9)';

              // アクティブ時のボーダー色: 完了→青、不完全→黄色、空→赤
              const activeBorderColor = isEmpty
                ? 'rgba(239, 83, 80, 0.8)'
                : isComplete
                  ? 'rgba(25, 118, 210, 0.8)'
                  : 'rgba(255, 193, 7, 0.9)';

              return (
                <Box
                  key={index}
                  onClick={() => setActiveTabIndex(index)}
                  sx={{
                    width: isActive ? 24 : 10,
                    height: 10,
                    borderRadius: isActive ? '5px' : '50%',
                    bgcolor: isActive ? 'grey.800' : inactiveDotColor,
                    border: isActive
                      ? `2px solid ${activeBorderColor}`
                      : isEmpty
                        ? '1px dashed rgba(239, 83, 80, 0.6)'
                        : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive
                      ? '0 2px 8px rgba(0, 0, 0, 0.25)'
                      : isComplete && !isEmpty
                        ? '0 1px 4px rgba(25, 118, 210, 0.25)'
                        : 'none',
                    '&:hover': {
                      bgcolor: isActive ? 'grey.700' : inactiveHoverColor,
                      transform: 'scale(1.2)',
                    },
                  }}
                />
              );
            })}
          </Box>
        )}
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
                      <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>
                        商品 {index + 1}
                      </Typography>
                      {/* 帳合先 */}
                      <Typography variant="caption" color="text.primary" sx={{ display: 'block', mb: 0.25 }}>
                        {product?.supplier || '帳合先未設定'}
                      </Typography>
                      {/* 産地 | 商品名 */}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                        {product?.origin && `${product.origin} | `}
                        {product?.name || '商品名未入力'}
                      </Typography>
                      {/* 規格 | 入数 */}
                      {(product?.specification || product?.quantityPerPackage) && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                          {product.specification && `${product.specification}`}
                          {product.specification && product.quantityPerPackage && ' | '}
                          {product.quantityPerPackage && `${product.quantityPerPackage}${product.unit || ''}`}
                        </Typography>
                      )}
                      {/* 原価 | 売価 */}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {product?.storeCost ? `原価 ¥${product.storeCost.toLocaleString()}` : '原価 未入力'}
                        {' | '}
                        {product?.priceExcludingTax ? `売価 ¥${Math.round(product.priceExcludingTax * 1.08).toLocaleString()}` : '売価 未入力'}
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

      {/* 空ページクリーンアップ確認ダイアログ */}
      <Dialog
        open={cleanupDialogOpen}
        onClose={() => setCleanupDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: 'error.main',
            color: 'white',
            py: 1.5,
            fontSize: '1rem',
          }}
        >
          空の商品ページを削除
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5, pb: 1 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            以下の空の商品ページを削除しますか？
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
              p: 1.5,
              bgcolor: 'grey.50',
              borderRadius: 2,
            }}
          >
            {emptyProductIndices.map((idx) => (
              <Chip
                key={idx}
                label={`商品 ${idx + 1}`}
                size="small"
                sx={{
                  bgcolor: 'rgba(239, 83, 80, 0.1)',
                  color: 'error.dark',
                  border: '1px solid rgba(239, 83, 80, 0.3)',
                  fontWeight: 500,
                }}
              />
            ))}
          </Box>
          {emptyProductIndices.length > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1.5, textAlign: 'center' }}
            >
              {emptyProductIndices.length}件の空ページが見つかりました
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button
            onClick={() => setCleanupDialogOpen(false)}
            color="inherit"
            sx={{ color: 'grey.600' }}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleCleanupEmptyProducts}
            variant="contained"
            color="error"
            sx={{ minWidth: 80 }}
          >
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
