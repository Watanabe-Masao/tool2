import React, { useState, useEffect, useRef } from 'react';
import { useWatch } from 'react-hook-form';
import type { Control, FieldErrors, FieldArrayWithId } from 'react-hook-form';
import { Box, Typography, Alert, Grid, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ChevronLeft, ChevronRight, ExpandMore } from '@mui/icons-material';
import { ProductFormCardPricing } from './ProductFormCardPricing';
import type { OrderFormData } from '@/schemas/orderSchema';
import { calculateEffectiveQuantity } from '@/utils/unitConversion';

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
  /** 現在の商品インデックス（外部制御用） */
  activeProductIndex?: number;
  /** 商品インデックス変更ハンドラー */
  onProductIndexChange?: (index: number) => void;
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

  // 前回のタブインデックスを保持（アニメーション方向判定用）
  const prevTabIndexRef = useRef(0);

  // スライド方向（'left' | 'right'）
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // 初回マウント判定（初回レンダリング時はアニメーションを無効化）
  const isMountedRef = useRef(false);

  // 全商品のデータを監視
  const products = useWatch({ control, name: 'products' }) || [];

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
      const totalDelivery = product.totalDelivery || 0;

      // 単位変換を適用して実効数量を計算
      // specification（規格の数値）とunit（単位）を組み合わせて完全な単位文字列を作成
      const fullUnit = product.specification && product.unit
        ? `${product.specification}${product.unit}`
        : product.unit || '';
      const conversionResult = calculateEffectiveQuantity({
        quantityPerPackage: product.quantityPerPackage,
        packageUnit: product.packageUnit || '',
        unit: fullUnit,
      });
      const effectiveQuantity = conversionResult.effectiveQuantity;

      const centerCostWithFee = Math.round(centerCost * (1 + centerFeeRate / 100));
      const quantity = totalDelivery * effectiveQuantity;

      totalCenterCost += centerCost * quantity;
      totalCenterCostWithFee += centerCostWithFee * quantity;
      totalStoreCost += storeCost * quantity;
      totalSellingPrice += sellingPrice * quantity;
      totalProfit += (storeCost - centerCostWithFee) * quantity;
      grossProfit += (sellingPrice - storeCost) * quantity; // 粗利額 = 売価 - 店着原価
    });

    // 出荷原価率 = 店着総原価 / センターフィー込総原価 × 100
    const shippingCostRate = totalCenterCostWithFee > 0
      ? (totalStoreCost / totalCenterCostWithFee * 100).toFixed(1)
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
      shippingCostRate,
      grossProfit,
      grossProfitMargin,
    };
  }, [products]);

  return (
    <Box>
      {/* ヘッダーセクション */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium">
          商品情報2
        </Typography>
      </Box>

      {/* エラー表示 */}
      {errors.products && typeof errors.products.message === 'string' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.products.message}
        </Alert>
      )}

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
              left: -10,
              top: 0,
              bottom: 0,
              width: 60,
              zIndex: 10,
              cursor: 'pointer',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              transition: 'opacity 0.2s',
              pointerEvents: 'none', // タッチイベントを透過
            }}
          >
            <ChevronLeft sx={{ color: 'text.primary', fontSize: 40, opacity: 0.4, pointerEvents: 'auto', '&:hover': { opacity: 0.7 } }} />
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
              right: -10,
              top: 0,
              bottom: 0,
              width: 60,
              zIndex: 10,
              cursor: 'pointer',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              transition: 'opacity 0.2s',
              pointerEvents: 'none', // タッチイベントを透過
            }}
          >
            <ChevronRight sx={{ color: 'text.primary', fontSize: 40, opacity: 0.4, pointerEvents: 'auto', '&:hover': { opacity: 0.7 } }} />
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

      {/* ページネーションドット */}
      {fields.length > 1 && (
        <Box
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
            // 価格情報の必須項目: センター着原価、店着原価、本体価格、総納品数
            const isComplete = product &&
              product.centerCost &&
              product.storeCost &&
              product.priceExcludingTax &&
              product.totalDelivery;
            const isEmpty = product && !product.centerCost && !product.storeCost && !product.priceExcludingTax;

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
                    bgcolor: isActive ? 'grey.900' : inactiveHoverColor,
                    transform: 'scale(1.15)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                }}
              />
            );
          })}
        </Box>
      )}

      {/* 全体集計サマリー（画面最下部） */}
      {fields.length > 0 && (
        <Accordion
          defaultExpanded
          sx={{
            mt: 3,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.08)' : 'primary.50',
            border: '2px solid',
            borderColor: 'primary.main'
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMore />}
            sx={{ minHeight: 48, '& .MuiAccordionSummary-content': { my: 1 } }}
          >
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'primary.main' }}>
              全体集計
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
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
                  {/* 出荷原価率 */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      出荷原価率
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="info.main">
                      {summary.shippingCostRate}%
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
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};
