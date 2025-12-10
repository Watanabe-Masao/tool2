import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Paper, Collapse, useTheme, useMediaQuery } from '@mui/material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useNavigationContext } from '@/context/NavigationContext';
import { StoreAllocationEditModal } from '@/components/modals/StoreAllocationEditModal';
import { useOrderFormStore } from '@/stores/orderFormStore';
import { ProgressHeader } from './ProgressHeader';
import { ProgressStepList } from './ProgressStepList';
import { StepHint } from './StepHint';
import { ProductCardSwiper } from './ProductCardSwiper';
import { CardContextMenu } from './CardContextMenu';
import { useLongPress } from './hooks/useLongPress';
import type { FloatingProgressSummaryProps, StepInfo, CardMenuState, AllocationModalState } from './types';
import { LAYER_Z_INDEX } from '@/constants/zIndex';

/**
 * フローティング進捗サマリー
 *
 * 画面下部に固定表示され、現在の入力状況を常時確認できます。
 * - 折りたたみ可能
 * - 各ステップの完了状態を表示
 * - コンパクトな表示
 */
export const FloatingProgressSummary: React.FC<FloatingProgressSummaryProps> = ({
  formData,
  totalSteps,
  onHeightChange,
  onRemoveProduct,
  onClearProduct,
  onPrevStep,
  onNextStep,
  onAllocationChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showProgressSummary } = useNavigationContext();
  const containerRef = useRef<HTMLDivElement>(null);

  // Zustand Store（UI状態）
  const activeStep = useOrderFormStore((state) => state.activeStep);
  const activeProductIndex = useOrderFormStore((state) => state.activeProductIndex);
  const setActiveProductIndex = useOrderFormStore((state) => state.setActiveProductIndex);
  const lockedStores = useOrderFormStore((state) => state.lockedStores);
  const toggleStoreLock = useOrderFormStore((state) => state.toggleStoreLock);
  const isProgressSummaryCollapsed = useOrderFormStore((state) => state.isProgressSummaryCollapsed);
  const toggleProgressSummaryCollapse = useOrderFormStore((state) => state.toggleProgressSummaryCollapse);

  // カードメニュー状態
  const [cardMenu, setCardMenu] = useState<CardMenuState>({
    anchorEl: null,
    productIndex: null,
  });

  // 配分編集モーダル状態
  const [allocationModal, setAllocationModal] = useState<AllocationModalState>({
    open: false,
    productIndex: null,
  });

  // 長押し対象の商品インデックス
  const [longPressTargetIndex, setLongPressTargetIndex] = useState<number | null>(null);

  // 長押しフック
  const { isPressing, handleStart: longPressStart, handleEnd: longPressEnd } = useLongPress({
    duration: 500,
    onLongPress: () => {
      if (longPressTargetIndex !== null && onAllocationChange && activeStep === 4) {
        setAllocationModal({ open: true, productIndex: longPressTargetIndex });
      }
    },
  });

  // ステップ2-5では商品情報モードを表示
  const isProductMode = activeStep >= 1 && activeStep <= 4 && activeProductIndex !== undefined;

  /**
   * 進捗サマリーが非表示になる際にフォーカスを外す（aria-hidden警告を防ぐ）
   */
  useEffect(() => {
    if (!showProgressSummary && containerRef.current) {
      const focusedElement = document.activeElement as HTMLElement;
      if (containerRef.current.contains(focusedElement)) {
        focusedElement.blur();
      }
    }
  }, [showProgressSummary]);

  /**
   * コンテナの高さを監視して親に通知
   */
  useEffect(() => {
    if (!containerRef.current || !onHeightChange) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        onHeightChange(height);
      }
    });

    resizeObserver.observe(containerRef.current);
    onHeightChange(containerRef.current.offsetHeight);

    return () => {
      resizeObserver.disconnect();
    };
  }, [onHeightChange, showProgressSummary, isProductMode, formData.products.length, isProgressSummaryCollapsed]);

  /**
   * 各商品の総納品数の合計を計算
   */
  const totalDeliverySum = useMemo(
    () => formData.products.reduce((sum, product) => sum + (product.totalDelivery || 0), 0),
    [formData.products]
  );

  /**
   * 配分済み数を計算
   */
  const totalAllocated = useMemo(
    () =>
      formData.products.reduce(
        (sum, product) => sum + product.storeAllocations.reduce((s, val) => s + val, 0),
        0
      ),
    [formData.products]
  );

  /**
   * 残り配分数を計算
   */
  const remaining = totalDeliverySum - totalAllocated;

  /**
   * 各ステップの完了状態を判定
   */
  const steps: StepInfo[] = useMemo(
    () => [
      {
        label: '店着日',
        completed: !!formData.deliveryDate,
        value: formData.deliveryDate
          ? format(formData.deliveryDate, 'M月d日(E)', { locale: ja })
          : null,
      },
      {
        label: '帳合先',
        completed: !!formData.suppliers && formData.suppliers.length > 0,
        value: formData.suppliers?.join(', ') || null,
      },
      {
        label: '商品情報',
        completed:
          formData.products.length > 0 &&
          formData.products.every((p) => p.name && p.origin),
        value:
          formData.products.length > 0
            ? `${formData.products[0].name}${formData.products.length > 1 ? ` 他${formData.products.length - 1}件` : ''}`
            : null,
      },
      {
        label: '総納品数',
        completed: totalDeliverySum > 0,
        value: totalDeliverySum > 0 ? `${totalDeliverySum}個` : null,
      },
      {
        label: '店舗配分',
        completed: remaining === 0 && totalAllocated > 0,
        value:
          totalAllocated > 0
            ? remaining === 0
              ? '完了'
              : `残り${remaining}個`
            : null,
        warning: remaining < 0,
      },
    ],
    [formData.deliveryDate, formData.suppliers, formData.products, totalDeliverySum, totalAllocated, remaining]
  );

  /**
   * 全体の進捗率を計算
   */
  const completedCount = steps.filter((s) => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  // イベントハンドラー
  const handleCardMenuOpen = (event: React.MouseEvent<HTMLElement>, productIndex: number) => {
    event.preventDefault();
    setCardMenu({ anchorEl: event.currentTarget, productIndex });
  };

  const handleCardMenuClose = () => {
    setCardMenu({ anchorEl: null, productIndex: null });
  };

  const handleTouchStart = (productIndex: number) => {
    setLongPressTargetIndex(productIndex);
    longPressStart();
  };

  const handleTouchEnd = () => {
    longPressEnd();
    setLongPressTargetIndex(null);
  };

  const handleAllocationModalClose = () => {
    setAllocationModal({ open: false, productIndex: null });
  };

  const handleToggleLock = (storeCode: string) => {
    if (allocationModal.productIndex !== null) {
      toggleStoreLock(allocationModal.productIndex, storeCode);
    }
  };

  return (
    <Paper
      ref={containerRef}
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: isMobile ? '64px' : 0,
        left: 0,
        right: 0,
        zIndex: LAYER_Z_INDEX.FIXED_FLOATING, // フローティング進捗サマリー用
        borderRadius: '16px 16px 0 0',
        maxWidth: 'lg',
        margin: '0 auto',
      }}
    >
      {/* ヘッダー */}
      <ProgressHeader
        activeStep={activeStep}
        totalSteps={totalSteps}
        progress={progress}
        showProgressSummary={showProgressSummary}
        isCollapsed={isProgressSummaryCollapsed}
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        onToggleCollapse={toggleProgressSummaryCollapse}
      />

      {/* 詳細（折りたたみ可能） */}
      <Collapse in={showProgressSummary && !isProgressSummaryCollapsed} timeout="auto" unmountOnExit>
        {isProductMode ? (
          /* 商品モード: 商品カードを表示 */
          <Box sx={{ bgcolor: 'background.paper' }}>
            <ProductCardSwiper
              products={formData.products}
              activeProductIndex={activeProductIndex!}
              isPressing={isPressing}
              onProductSelect={setActiveProductIndex}
              onContextMenu={handleCardMenuOpen}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            />
          </Box>
        ) : (
          /* 通常モード: 従来の進捗表示 + ステップ別ヒント */
          <>
            <ProgressStepList steps={steps} activeStep={activeStep} />
            <Box sx={{ px: 2, pb: 2 }}>
              <StepHint
                activeStep={activeStep}
                totalAllocated={totalAllocated}
                remaining={remaining}
              />
            </Box>
          </>
        )}
      </Collapse>

      {/* カードコンテキストメニュー */}
      <CardContextMenu
        anchorEl={cardMenu.anchorEl}
        onClose={handleCardMenuClose}
        onClear={
          onClearProduct && cardMenu.productIndex !== null
            ? () => onClearProduct(cardMenu.productIndex!)
            : undefined
        }
        onDelete={
          onRemoveProduct && cardMenu.productIndex !== null
            ? () => onRemoveProduct(cardMenu.productIndex!)
            : undefined
        }
        canDelete={formData.products.length > 1}
      />

      {/* 配分編集モーダル */}
      {allocationModal.productIndex !== null && onAllocationChange && lockedStores && (
        <StoreAllocationEditModal
          open={allocationModal.open}
          onClose={handleAllocationModalClose}
          formData={formData}
          productIndex={allocationModal.productIndex}
          onAllocationChange={onAllocationChange}
          lockedStores={lockedStores.get(allocationModal.productIndex) || new Set()}
          onToggleLock={handleToggleLock}
        />
      )}
    </Paper>
  );
};
