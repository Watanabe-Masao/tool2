import React, { useState, useEffect, useRef } from 'react';
import { useWatch } from 'react-hook-form';
import type { Control, FieldErrors, FieldArrayWithId, UseFieldArrayAppend, UseFieldArrayRemove } from 'react-hook-form';
import { Box, Typography, Alert, IconButton, Chip, Tooltip } from '@mui/material';
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

  // 前回のタブインデックスを保持（アニメーション方向判定用）
  const prevTabIndexRef = useRef(0);

  // スライド方向（'left' | 'right'）
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // タブコンテナのref（自動センタリング用）
  const tabsRef = useRef<HTMLDivElement>(null);

  // スクロール終了検出用タイマー
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 全商品の実際のフォームデータを監視
  const products = useWatch({ control, name: 'products' });

  // 店着日を監視
  const deliveryDate = useWatch({ control, name: 'deliveryDate' });

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
   * タブスクロール時に中央のタブを検出して選択
   */
  const handleTabScroll = () => {
    if (!tabsRef.current) return;

    // 既存のタイマーをクリア
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }

    // スクロール終了後に中央のタブを検出
    scrollTimerRef.current = setTimeout(() => {
      if (!tabsRef.current) return;

      const container = tabsRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;

      // 全てのチップ要素を取得
      const chips = container.querySelectorAll('[data-chip-index]');
      let closestIndex = activeTabIndex;
      let minDistance = Infinity;

      chips.forEach((chip) => {
        const chipRect = chip.getBoundingClientRect();
        const chipCenter = chipRect.left + chipRect.width / 2;
        const distance = Math.abs(containerCenter - chipCenter);

        if (distance < minDistance) {
          minDistance = distance;
          const index = parseInt(chip.getAttribute('data-chip-index') || '0', 10);
          closestIndex = index;
        }
      });

      // 中央に最も近いタブをアクティブに
      if (closestIndex !== activeTabIndex) {
        setActiveTabIndex(closestIndex);
      }
    }, 100); // スクロール終了後100msで判定（より高速に）
  };

  /**
   * アクティブタブの自動センタリング
   */
  useEffect(() => {
    if (tabsRef.current) {
      const chips = tabsRef.current.querySelectorAll('[data-chip-index]');
      const targetChip = chips[activeTabIndex];
      if (targetChip) {
        targetChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTabIndex]);

  /**
   * タブ切り替え時のスライド方向を設定
   */
  useEffect(() => {
    if (activeTabIndex > prevTabIndexRef.current) {
      setSlideDirection('left'); // 右から左へスライド（次へ）
    } else if (activeTabIndex < prevTabIndexRef.current) {
      setSlideDirection('right'); // 左から右へスライド（前へ）
    }
    prevTabIndexRef.current = activeTabIndex;
  }, [activeTabIndex]);

  /**
   * クリーンアップ：タイマーをクリア
   */
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

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

  return (
    <Box>
      {/* ヘッダーセクション */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium">
          商品情報を入力してください
        </Typography>
      </Box>

      {/* エラー表示 */}
      {errors.products && typeof errors.products.message === 'string' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.products.message}
        </Alert>
      )}

      {/* 商品ナビゲーション情報 */}
      <Box sx={{ mb: 2, px: 1 }}>
        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.6, fontWeight: 'bold' }}>
          商品{activeTabIndex + 1}（{activeTabIndex + 1}/{fields.length}）　店着日：{deliveryDate ? new Date(deliveryDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : '未設定'}　帳合先：{products?.[activeTabIndex]?.supplier || '未選択'}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.6, fontWeight: 'bold', color: 'primary.main' }}>
          産地：{products?.[activeTabIndex]?.origin || '－'}　品名：{products?.[activeTabIndex]?.name || '－'}　規格：{products?.[activeTabIndex]?.specification || '－'}　入数：{products?.[activeTabIndex]?.quantityPerPackage || '－'}　単位：{products?.[activeTabIndex]?.unit || '－'}
        </Typography>
      </Box>

      {/* チップ型タブナビゲーション */}
      <Box
        ref={tabsRef}
        onScroll={handleTabScroll}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          pb: 1,
          mb: 2,
          scrollBehavior: 'smooth',
          px: 'calc(50vw - 60px)', // 左右に画面幅の半分のパディングを追加（チップ幅の半分を引く）
          '&::-webkit-scrollbar': {
            height: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 3,
          },
        }}
      >
        {fields.map((field, index) => {
          const incompleteCount = getIncompleteCount(index);
          const isActive = activeTabIndex === index;
          const isComplete = incompleteCount === 0;

          return (
            <Tooltip key={field.id} title={getTabTooltip(index)} arrow placement="top">
              <Chip
                data-chip-index={index}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: isActive ? 'bold' : 'normal',
                        fontSize: isActive ? '0.8rem' : '0.7rem',
                      }}
                    >
                      {getTabLabel(index)}
                    </Typography>
                    {incompleteCount > 0 && (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: 'warning.main',
                          color: 'white',
                          fontSize: '0.6rem',
                          fontWeight: 'bold',
                          px: 0.3,
                        }}
                      >
                        {incompleteCount}
                      </Box>
                    )}
                    {fields.length > 1 && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveProduct(index);
                        }}
                        sx={{
                          ml: 0.3,
                          p: 0.2,
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                        }}
                      >
                        <Close sx={{ fontSize: 12 }} />
                      </IconButton>
                    )}
                  </Box>
                }
                onClick={() => setActiveTabIndex(index)}
                sx={{
                  height: isActive ? 36 : 28,
                  cursor: 'pointer',
                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: 2,
                  bgcolor: isComplete
                    ? isActive
                      ? 'success.main'
                      : 'success.light'
                    : isActive
                    ? 'warning.main'
                    : 'warning.light',
                  color: isActive ? 'white' : 'text.primary',
                  boxShadow: isActive ? 3 : 1,
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'scale(1.05)',
                  },
                  '&:active': {
                    transform: 'scale(0.98)',
                  },
                  '& .MuiChip-label': {
                    px: 1.5,
                  },
                }}
              />
            </Tooltip>
          );
        })}
        {/* 追加チップ */}
        <Chip
          icon={<Add sx={{ fontSize: 16 }} />}
          label="追加"
          onClick={handleAddProduct}
          disabled={fields.length >= 50}
          sx={{
            height: 28,
            cursor: fields.length >= 50 ? 'not-allowed' : 'pointer',
            borderRadius: 2,
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            bgcolor: fields.length >= 50 ? 'action.disabledBackground' : 'primary.light',
            color: fields.length >= 50 ? 'action.disabled' : 'primary.main',
            '&:hover': fields.length >= 50
              ? {}
              : {
                  bgcolor: 'primary.main',
                  color: 'white',
                  boxShadow: 2,
                },
            '&:active': fields.length >= 50
              ? {}
              : {
                  transform: 'scale(0.95)',
                },
            '& .MuiChip-label': {
              px: 1,
              fontSize: '0.7rem',
            },
          }}
        />
      </Box>

      {/* スワイプ可能な商品カード表示エリア */}
      <Box
        sx={{
          position: 'relative',
        }}
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

        {/* アクティブな商品カードのみ表示（アニメーション付き） */}
        {fields.map((field, index) => {
          const isActive = activeTabIndex === index;
          return (
            <Box
              key={field.id}
              sx={{
                display: isActive ? 'block' : 'none',
                animation: isActive ? `slideIn${slideDirection === 'left' ? 'Left' : 'Right'} 0.25s cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
                '@keyframes slideInLeft': {
                  '0%': {
                    transform: 'translateX(50%)',
                    opacity: 0,
                  },
                  '100%': {
                    transform: 'translateX(0)',
                    opacity: 1,
                  },
                },
                '@keyframes slideInRight': {
                  '0%': {
                    transform: 'translateX(-50%)',
                    opacity: 0,
                  },
                  '100%': {
                    transform: 'translateX(0)',
                    opacity: 1,
                  },
                },
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
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
