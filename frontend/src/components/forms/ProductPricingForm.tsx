import React, { useState, useEffect, useRef } from 'react';
import { useWatch } from 'react-hook-form';
import type { Control, FieldErrors, FieldArrayWithId } from 'react-hook-form';
import { Box, Typography, Alert, Card, CardContent, Grid, Chip, Tooltip } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { ProductFormCardPricing } from './ProductFormCardPricing';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * ProductPricingFormのProps
 */
interface ProductPricingFormProps {
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** Enterキー押下時のハンドラー */
  onEnterPress?: () => void;
  /** 商品フィールド配列 */
  fields: FieldArrayWithId<OrderFormData, 'products', 'id'>[];
}

/**
 * Step 3: 商品価格情報フォーム
 *
 * 商品の価格情報（原価、売価、総納品数）を入力します。
 */
export const ProductPricingForm: React.FC<ProductPricingFormProps> = ({
  control,
  errors,
  onEnterPress,
  fields,
}) => {
  // アクティブなタブのインデックス
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // 前回のタブインデックスを保持（アニメーション方向判定用）
  const prevTabIndexRef = useRef(0);

  // スライド方向（'left' | 'right'）
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // 初回マウント判定（初回レンダリング時はアニメーションを無効化）
  const isMountedRef = useRef(false);

  // タブコンテナのref（自動センタリング用）
  const tabsRef = useRef<HTMLDivElement>(null);

  // スクロール終了検出用タイマー
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 全商品のデータを監視
  const products = useWatch({ control, name: 'products' }) || [];

  // 店着日を監視
  const deliveryDate = useWatch({ control, name: 'deliveryDate' });

  /**
   * 初回マウント後にフラグを立てる（アニメーション制御用）
   */
  useEffect(() => {
    isMountedRef.current = true;
  }, []);

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
    }, 100);
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
    if (!product.centerCost || product.centerCost === 0) count++;
    if (!product.storeCost || product.storeCost === 0) count++;
    if (!product.priceExcludingTax || product.priceExcludingTax === 0) count++;
    if (!product.totalDelivery || product.totalDelivery === 0) count++;

    return count;
  };

  /**
   * 未入力項目のラベルリストを取得
   */
  const getIncompleteItems = (index: number): string[] => {
    const product = products?.[index];
    if (!product) return [];

    const items: string[] = [];
    if (!product.centerCost || product.centerCost === 0) items.push('センター着原価');
    if (!product.storeCost || product.storeCost === 0) items.push('店着原価');
    if (!product.priceExcludingTax || product.priceExcludingTax === 0) items.push('売価');
    if (!product.totalDelivery || product.totalDelivery === 0) items.push('総納品数');

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

  // 全体の集計を計算
  const summary = React.useMemo(() => {
    let totalCenterCost = 0;
    let totalCenterCostWithFee = 0;
    let totalStoreCost = 0;
    let totalSellingPrice = 0;
    let totalProfit = 0;
    let grossProfit = 0; // 粗利額

    products.forEach((product) => {
      const centerCost = product.centerCost || 0;
      const centerFeeRate = product.centerFeeRate || 13;
      const storeCost = product.storeCost || 0;
      const sellingPrice = product.priceExcludingTax || 0;
      const quantityPerPackage = product.quantityPerPackage || 0;
      const totalDelivery = product.totalDelivery || 0;

      const centerCostWithFee = Math.round(centerCost * (1 + centerFeeRate / 100));
      const quantity = totalDelivery * quantityPerPackage;

      totalCenterCost += centerCost * quantity;
      totalCenterCostWithFee += centerCostWithFee * quantity;
      totalStoreCost += storeCost * quantity;
      totalSellingPrice += sellingPrice * quantity;
      totalProfit += (storeCost - centerCostWithFee) * quantity;
      grossProfit += (sellingPrice - storeCost) * quantity; // 粗利額 = 売価 - 店着原価
    });

    const averageProfitMargin = totalSellingPrice > 0
      ? ((totalSellingPrice - totalCenterCostWithFee) / totalSellingPrice * 100).toFixed(1)
      : '0.0';

    const grossProfitMargin = totalSellingPrice > 0
      ? (grossProfit / totalSellingPrice * 100).toFixed(1)
      : '0.0';

    return {
      totalCenterCost,
      totalCenterCostWithFee,
      totalStoreCost,
      totalSellingPrice,
      totalProfit,
      averageProfitMargin,
      grossProfit,
      grossProfitMargin,
    };
  }, [products]);

  return (
    <Box>
      {/* ヘッダーセクション */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium">
          商品情報2（価格・数量）を入力してください
        </Typography>
      </Box>

      {/* エラー表示 */}
      {errors.products && typeof errors.products.message === 'string' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.products.message}
        </Alert>
      )}

      {/* 全体集計サマリー */}
      {fields.length > 0 && (
        <Card variant="outlined" sx={{ mb: 2, bgcolor: 'primary.50', borderColor: 'primary.main', borderWidth: 2 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'primary.main' }}>
              全体集計
            </Typography>

            <Grid container spacing={2}>
              {/* 1列目 */}
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {/* 総原価（センター着） */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      総原価（センター着）
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      ¥{summary.totalCenterCost.toLocaleString()}
                    </Typography>
                  </Box>
                  {/* 総原価（センターフィー込） */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      総原価（センターフィー込）
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      ¥{summary.totalCenterCostWithFee.toLocaleString()}
                    </Typography>
                  </Box>
                  {/* 全体差益 */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      全体差益
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      ¥{summary.totalProfit.toLocaleString()}
                    </Typography>
                  </Box>
                  {/* 平均値入率 */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      平均値入率
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="info.main">
                      {summary.averageProfitMargin}%
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* 2列目 */}
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {/* 総原価（店着） */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      総原価（店着）
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      ¥{summary.totalStoreCost.toLocaleString()}
                    </Typography>
                  </Box>
                  {/* 総売価 */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      総売価
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      ¥{summary.totalSellingPrice.toLocaleString()}
                    </Typography>
                  </Box>
                  {/* 粗利額 */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      粗利額
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      ¥{summary.grossProfit.toLocaleString()}
                    </Typography>
                  </Box>
                  {/* 値入率 */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      値入率
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="info.main">
                      {summary.grossProfitMargin}%
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 商品ナビゲーション情報 */}
      <Box sx={{ mb: 2, px: 1 }}>
        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.6, fontWeight: 'bold' }}>
          商品{activeTabIndex + 1}（{activeTabIndex + 1}/{fields.length}）　店着日：{deliveryDate ? new Date(deliveryDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : '未設定'}　帳合先：{products?.[activeTabIndex]?.supplier || '未選択'}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.6, fontWeight: 'bold', color: 'primary.main' }}>
          品名：{products?.[activeTabIndex]?.name || '－'}　規格：{products?.[activeTabIndex]?.specification || '－'}　入数：{products?.[activeTabIndex]?.quantityPerPackage || '－'}　総納品数：{products?.[activeTabIndex]?.totalDelivery || '－'}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.6, fontWeight: 'bold', color: 'secondary.main' }}>
          店着原価（1単位）：¥{products?.[activeTabIndex]?.storeCost?.toLocaleString() || '－'}　売価（1単位）：¥{products?.[activeTabIndex]?.priceExcludingTax?.toLocaleString() || '－'}　粗利額（1単位）：¥{(() => {
            const product = products?.[activeTabIndex];
            if (product?.priceExcludingTax && product?.storeCost) {
              return (product.priceExcludingTax - product.storeCost).toLocaleString();
            }
            return '－';
          })()}　値入率：{(() => {
            const product = products?.[activeTabIndex];
            if (product?.priceExcludingTax && product?.storeCost && product.priceExcludingTax > 0) {
              return ((product.priceExcludingTax - product.storeCost) / product.priceExcludingTax * 100).toFixed(1) + '%';
            }
            return '－';
          })()}
        </Typography>
      </Box>

      {/* チップ型タブナビゲーション */}
      <Box
        ref={tabsRef}
        onScroll={handleTabScroll}
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
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
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
              pointerEvents: 'none', // タッチイベントを透過
              '&:hover': {
                background: 'linear-gradient(to right, rgba(25, 118, 210, 0.2), transparent)',
              },
            }}
          >
            <ChevronLeft sx={{ color: 'primary.main', fontSize: 40, opacity: 0.7, pointerEvents: 'auto' }} />
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
              pointerEvents: 'none', // タッチイベントを透過
              '&:hover': {
                background: 'linear-gradient(to left, rgba(25, 118, 210, 0.2), transparent)',
              },
            }}
          >
            <ChevronRight sx={{ color: 'primary.main', fontSize: 40, opacity: 0.7, pointerEvents: 'auto' }} />
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
                animation: isActive && isMountedRef.current ? `slideIn${slideDirection === 'left' ? 'Left' : 'Right'} 0.25s cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
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
              <ProductFormCardPricing
                index={index}
                control={control}
                errors={errors}
                onEnterPress={onEnterPress}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
