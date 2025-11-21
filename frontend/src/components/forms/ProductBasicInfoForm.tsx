import React, { useState, useEffect, useRef } from 'react';
import { useWatch } from 'react-hook-form';
import type { Control, FieldErrors, FieldArrayWithId, UseFieldArrayAppend, UseFieldArrayRemove } from 'react-hook-form';
import { Box, Typography, Alert, Tabs, Tab, IconButton, Chip, Tooltip } from '@mui/material';
import { Add, Close, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { ProductFormCardBasic } from './ProductFormCardBasic';
import type { OrderFormData } from '@/schemas/orderSchema';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';

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
  /** ステップ移動ハンドラー */
  onNavigateToStep?: (step: number) => void;
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
  onNavigateToStep,
}) => {
  // アクティブなタブのインデックス
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // タブコンテナのref（自動センタリング用）
  const tabsRef = useRef<HTMLDivElement>(null);

  // スワイプ検出用の状態
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // 全商品の実際のフォームデータを監視
  const products = useWatch({ control, name: 'products' });

  // スワイプの最小距離（px）
  const minSwipeDistance = 50;

  /**
   * タッチ開始
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  /**
   * タッチ移動
   */
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  /**
   * タッチ終了
   */
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && activeTabIndex < fields.length - 1) {
      // 左スワイプ → 次のタブ
      setActiveTabIndex(activeTabIndex + 1);
    } else if (isRightSwipe && activeTabIndex > 0) {
      // 右スワイプ → 前のタブ
      setActiveTabIndex(activeTabIndex - 1);
    }
  };

  /**
   * マウスドラッグ用の状態
   */
  const [mouseStart, setMouseStart] = useState<number | null>(null);
  const [mouseEnd, setMouseEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * マウスダウン
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    setMouseEnd(null);
    setMouseStart(e.clientX);
    setIsDragging(true);
  };

  /**
   * マウス移動
   */
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setMouseEnd(e.clientX);
  };

  /**
   * マウスアップ
   */
  const handleMouseUp = () => {
    if (!isDragging || !mouseStart || !mouseEnd) {
      setIsDragging(false);
      return;
    }

    const distance = mouseStart - mouseEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && activeTabIndex < fields.length - 1) {
      setActiveTabIndex(activeTabIndex + 1);
    } else if (isRightSwipe && activeTabIndex > 0) {
      setActiveTabIndex(activeTabIndex - 1);
    }

    setIsDragging(false);
  };

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
   * アクティブタブの自動センタリング
   */
  useEffect(() => {
    if (tabsRef.current) {
      const activeTab = tabsRef.current.querySelector('[aria-selected="true"]');
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTabIndex]);

  /**
   * 商品の未入力項目数を計算
   */
  const getIncompleteCount = (index: number): number => {
    const product = products?.[index];
    if (!product) return 0;

    let count = 0;
    if (!product.name) count++;
    if (!product.origin) count++;
    if (!product.supplier) count++;
    if (!product.specification) count++;
    if (!product.quantityPerPackage) count++;
    if (!product.unit) count++;

    return count;
  };

  /**
   * 未入力項目のラベルリストを取得
   */
  const getIncompleteItems = (index: number): string[] => {
    const product = products?.[index];
    if (!product) return [];

    const items: string[] = [];
    if (!product.name) items.push('品名');
    if (!product.origin) items.push('産地');
    if (!product.supplier) items.push('帳合先');
    if (!product.specification) items.push('規格');
    if (!product.quantityPerPackage) items.push('入数');
    if (!product.unit) items.push('単位');

    return items;
  };

  /**
   * タブのラベルを作成（#番号 + 品名8文字まで）
   */
  const getTabLabel = (index: number): string => {
    const product = products?.[index];
    const name = product?.name || '';
    const truncated = name.length > 8 ? name.slice(0, 8) + '...' : name;
    return `#${index + 1}${truncated ? ' ' + truncated : ''}`;
  };

  /**
   * タブのツールチップコンテンツを作成
   */
  const getTabTooltip = (index: number): string => {
    const product = products?.[index];
    const name = product?.name || `商品${index + 1}`;
    const incompleteItems = getIncompleteItems(index);

    if (incompleteItems.length === 0) {
      return `${name}\n✓ すべて入力済み`;
    } else {
      return `${name}\n未入力: ${incompleteItems.join('、')}`;
    }
  };

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
   * 商品を追加
   */
  const handleAddProduct = () => {
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
   * タブ変更ハンドラー
   */
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTabIndex(newValue);
  };

  return (
    <Box>
      {/* ヘッダーセクション */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium">
          商品情報を入力してください
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          商品は最大50個まで追加できます。（現在: {fields.length}個）
        </Typography>
      </Box>

      {/* エラー表示 */}
      {errors.products && typeof errors.products.message === 'string' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.products.message}
        </Alert>
      )}

      {/* 商品ナビゲーション情報 */}
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
          {products?.[activeTabIndex]?.name || `商品${activeTabIndex + 1}`}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {activeTabIndex + 1} / {fields.length}
        </Typography>
      </Box>

      {/* タブナビゲーション */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }} ref={tabsRef}>
        <Tabs
          value={activeTabIndex}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {fields.map((field, index) => {
            const incompleteCount = getIncompleteCount(index);
            return (
              <Tooltip key={field.id} title={getTabTooltip(index)} arrow placement="top">
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: incompleteCount === 0 ? 'bold' : 'normal',
                          fontSize: '0.75rem',
                        }}
                      >
                        {getTabLabel(index)}
                      </Typography>
                      {incompleteCount > 0 && (
                        <Chip
                          label={incompleteCount}
                          size="small"
                          color="warning"
                          sx={{
                            height: 16,
                            fontSize: '0.65rem',
                            minWidth: 16,
                            '& .MuiChip-label': { px: 0.4 }
                          }}
                        />
                      )}
                      {fields.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveProduct(index);
                          }}
                          sx={{ ml: 0.3, p: 0.2 }}
                        >
                          <Close sx={{ fontSize: 14 }} />
                        </IconButton>
                      )}
                    </Box>
                  }
                  sx={{
                    minHeight: 36,
                    py: 0.5,
                    borderLeft: 3,
                    borderColor: incompleteCount === 0 ? 'success.main' : 'warning.main',
                  }}
                />
              </Tooltip>
            );
          })}
          {/* 追加タブ */}
          <Tab
            icon={<Add sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={<Typography variant="caption">追加</Typography>}
            onClick={handleAddProduct}
            disabled={fields.length >= 50}
            sx={{ minHeight: 36, py: 0.5 }}
          />
        </Tabs>
      </Box>

      {/* スワイプ可能な商品カード表示エリア */}
      <Box
        sx={{
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
      >
        {/* 左端のクリックエリア */}
        {activeTabIndex > 0 && (
          <Box
            onClick={(e) => {
              e.stopPropagation();
              setActiveTabIndex(activeTabIndex - 1);
            }}
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 60,
              zIndex: 10,
              cursor: 'pointer',
              background: 'linear-gradient(to right, rgba(25, 118, 210, 0.1), transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              '&:hover': {
                background: 'linear-gradient(to right, rgba(25, 118, 210, 0.2), transparent)',
              },
            }}
          >
            <ChevronLeft sx={{ color: 'primary.main', fontSize: 40, opacity: 0.7 }} />
          </Box>
        )}

        {/* 右端のクリックエリア */}
        {activeTabIndex < fields.length - 1 && (
          <Box
            onClick={(e) => {
              e.stopPropagation();
              setActiveTabIndex(activeTabIndex + 1);
            }}
            sx={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 60,
              zIndex: 10,
              cursor: 'pointer',
              background: 'linear-gradient(to left, rgba(25, 118, 210, 0.1), transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              '&:hover': {
                background: 'linear-gradient(to left, rgba(25, 118, 210, 0.2), transparent)',
              },
            }}
          >
            <ChevronRight sx={{ color: 'primary.main', fontSize: 40, opacity: 0.7 }} />
          </Box>
        )}

        {/* アクティブな商品カードのみ表示 */}
        {fields.map((field, index) => (
          <Box
            key={field.id}
            sx={{ display: activeTabIndex === index ? 'block' : 'none' }}
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
            />
          </Box>
        ))}
      </Box>

      {/* 最大数エラー */}
      {fields.length >= 50 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          商品は最大50個まで追加できます
        </Alert>
      )}
    </Box>
  );
};
