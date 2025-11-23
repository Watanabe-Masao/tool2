import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Collapse,
  IconButton,
  Stack,
  Chip,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material';
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Warning as WarningIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/splide/dist/css/splide.min.css';
import './FloatingProgressSummary.css';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * FloatingProgressSummaryのProps
 */
interface FloatingProgressSummaryProps {
  /** フォームデータ */
  formData: OrderFormData;
  /** 現在のステップ */
  activeStep: number;
  /** 総ステップ数 */
  totalSteps: number;
  /** 現在の商品インデックス（ステップ2-4で使用） */
  activeProductIndex?: number;
  /** 商品切り替えハンドラー */
  onProductChange?: (index: number) => void;
  /** 高さ変更コールバック */
  onHeightChange?: (height: number) => void;
}

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
  activeStep,
  totalSteps,
  activeProductIndex,
  onProductChange,
  onHeightChange,
}) => {
  const [expanded, setExpanded] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // ドラッグ&ドロップ状態
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const longPressTimer = React.useRef<number | null>(null);
  const [cardOrder, setCardOrder] = useState<number[]>([]);

  // ステップ2-5では商品情報モードを表示
  const isProductMode = activeStep >= 1 && activeStep <= 4 && activeProductIndex !== undefined;

  /**
   * カード順序の初期化と更新
   */
  React.useEffect(() => {
    if (formData.products.length > 0) {
      setCardOrder((prevOrder) => {
        // 初期化
        if (prevOrder.length === 0) {
          return formData.products.map((_, i) => i);
        }

        // 商品が追加された場合、新しいインデックスを末尾に追加
        if (prevOrder.length < formData.products.length) {
          const newIndices = [];
          for (let i = prevOrder.length; i < formData.products.length; i++) {
            newIndices.push(i);
          }
          return [...prevOrder, ...newIndices];
        }

        // 商品が削除された場合、範囲外のインデックスを除去
        if (prevOrder.length > formData.products.length) {
          return prevOrder.filter(index => index < formData.products.length);
        }

        return prevOrder;
      });
    } else {
      // 商品がすべて削除された場合
      setCardOrder([]);
    }
  }, [formData.products.length]);

  /**
   * 長押し開始（ドラッグ開始）
   */
  const handleLongPressStart = (cardIndex: number) => {
    longPressTimer.current = window.setTimeout(() => {
      setDraggedCardIndex(cardIndex);
      setDropTargetIndex(cardIndex);
    }, 500); // 500ms長押しでドラッグ開始
  };

  /**
   * 長押しキャンセル
   */
  const handleLongPressCancel = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  /**
   * ドラッグ終了（ドロップ処理）
   */
  const handleDragEnd = () => {
    handleLongPressCancel();

    // ドラッグ中で、ドロップ先が有効な場合のみ順序を入れ替え
    if (draggedCardIndex !== null && dropTargetIndex !== null && draggedCardIndex !== dropTargetIndex) {
      const newOrder = [...cardOrder];
      const [removed] = newOrder.splice(draggedCardIndex, 1);
      newOrder.splice(dropTargetIndex, 0, removed);
      setCardOrder(newOrder);
    }

    setDraggedCardIndex(null);
    setDropTargetIndex(null);
  };

  /**
   * ドラッグオーバー（ドロップターゲット設定）
   */
  const handleDragEnter = (targetIndex: number) => {
    if (draggedCardIndex !== null) {
      setDropTargetIndex(targetIndex);
    }
  };

  /**
   * コンテナの高さを監視して親に通知
   */
  React.useEffect(() => {
    if (!containerRef.current || !onHeightChange) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        onHeightChange(height);
      }
    });

    resizeObserver.observe(containerRef.current);

    // 初回の高さを通知
    onHeightChange(containerRef.current.offsetHeight);

    return () => {
      resizeObserver.disconnect();
    };
  }, [onHeightChange, expanded, isProductMode, formData.products.length]);

  /**
   * 各商品の総納品数の合計を計算
   */
  const totalDeliverySum = formData.products.reduce(
    (sum, product) => sum + (product.totalDelivery || 0),
    0
  );

  /**
   * 配分済み数を計算
   */
  const totalAllocated = formData.products.reduce(
    (sum, product) =>
      sum + product.storeAllocations.reduce((s, val) => s + val, 0),
    0
  );

  /**
   * 残り配分数を計算
   */
  const remaining = totalDeliverySum - totalAllocated;

  /**
   * 各ステップの完了状態を判定
   */
  const steps = [
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
  ];

  /**
   * 全体の進捗率を計算
   */
  const completedCount = steps.filter((s) => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  /**
   * 商品の完了状態を判定
   */
  const getProductStatus = (product: OrderFormData['products'][0]) => {
    const hasBasicInfo = !!(product.name && product.origin);
    const hasPricing = !!(product.storeCost && product.priceExcludingTax && product.totalDelivery);
    const totalAllocated = product.storeAllocations.reduce((sum, val) => sum + val, 0);
    const hasAllocation = totalAllocated === product.totalDelivery && totalAllocated > 0;
    const hasOverAllocation = totalAllocated > product.totalDelivery;

    return {
      hasBasicInfo,
      hasPricing,
      hasAllocation,
      hasOverAllocation,
      totalAllocated,
      remaining: product.totalDelivery - totalAllocated,
    };
  };

  /**
   * 商品カード表示用の横スクロールリスト
   */
  const renderProductCards = () => {
    if (!isProductMode || activeProductIndex === undefined) return null;

    return (
      <Box>
        <Box sx={{ px: 2, display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            商品 {activeProductIndex + 1} / {formData.products.length}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          {/* 前へボタン */}
          {activeProductIndex > 0 && onProductChange && (
            <IconButton
              size="small"
              onClick={() => onProductChange(activeProductIndex - 1)}
              sx={{ bgcolor: 'action.hover' }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          )}
          {/* 次へボタン */}
          {activeProductIndex < formData.products.length - 1 && onProductChange && (
            <IconButton
              size="small"
              onClick={() => onProductChange(activeProductIndex + 1)}
              sx={{ bgcolor: 'action.hover' }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* ドラッグ&ドロップのヒント */}
        {draggedCardIndex === null && formData.products.length > 1 && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
              💡 スワイプで移動、長押しして順番を入れ替え
            </Typography>
          </Box>
        )}

        {/* Splideスライダー */}
        <Box sx={{ px: 2, pb: 2 }}>
          <Splide
            options={{
              type: 'slide',
              perPage: 'auto',
              gap: '8px',
              pagination: false,
              arrows: false,
              drag: draggedCardIndex === null, // ドラッグ中はSplideのドラッグを無効化
              autoWidth: true,
              start: 0, // 常に左端から開始
              padding: { left: 0, right: 0 },
              updateOnMove: false, // 位置が変わっても自動更新しない
              trimSpace: false,
              speed: 300, // スライド速度を設定
            }}
            aria-label="商品カードスライダー"
          >
            {(cardOrder.length > 0 ? cardOrder : formData.products.map((_, i) => i)).map((originalIndex, cardIndex) => {
            const product = formData.products[originalIndex];
            const status = getProductStatus(product);
            const isActive = originalIndex === activeProductIndex;
            const isBeingDragged = cardIndex === draggedCardIndex;
            const isDropTarget = cardIndex === dropTargetIndex && draggedCardIndex !== null;

            return (
              <SplideSlide key={originalIndex}>
                <Card
                onClick={() => draggedCardIndex === null && onProductChange && onProductChange(originalIndex)}
                onTouchStart={() => handleLongPressStart(cardIndex)}
                onTouchEnd={handleDragEnd}
                onTouchMove={handleLongPressCancel}
                onMouseDown={() => handleLongPressStart(cardIndex)}
                onMouseUp={handleDragEnd}
                onMouseEnter={() => handleDragEnter(cardIndex)}
                sx={{
                  minWidth: 180,
                  maxWidth: 180,
                  flexShrink: 0, // カードが縮まないように固定
                  cursor: draggedCardIndex !== null
                    ? (isBeingDragged ? 'grabbing' : 'default')
                    : 'pointer',
                  border: isActive ? 2 : 1,
                  borderColor: isDropTarget
                    ? 'success.main'
                    : isActive
                    ? 'primary.main'
                    : 'grey.300',
                  bgcolor: isBeingDragged
                    ? 'warning.50'
                    : isDropTarget
                    ? 'success.50'
                    : isActive
                    ? 'primary.50'
                    : 'background.paper',
                  opacity: isBeingDragged ? 0.8 : 1,
                  transform: isDropTarget ? 'scale(0.98)' : 'scale(1)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: draggedCardIndex === null ? 3 : 0,
                    transform: draggedCardIndex === null ? 'translateY(-2px)' : (isDropTarget ? 'scale(0.98)' : 'scale(1)'),
                  },
                }}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  {/* 1行目: 商品番号 + 帳合先 + ステータスアイコン */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
                      {draggedCardIndex !== null && isBeingDragged && (
                        <Typography variant="caption" sx={{ fontSize: '0.9rem' }}>
                          🔄
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                        #{originalIndex + 1}
                      </Typography>
                      {product.supplier && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.65rem',
                            color: 'text.secondary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {product.supplier}
                        </Typography>
                      )}
                    </Box>
                    {/* ステータスアイコン（右側） */}
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title={status.hasBasicInfo ? '基本情報完了' : '基本情報未完了'} arrow>
                        <Box>
                          {status.hasBasicInfo ? (
                            <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          ) : (
                            <UncheckedIcon sx={{ fontSize: 14, color: 'grey.400' }} />
                          )}
                        </Box>
                      </Tooltip>
                      <Tooltip title={status.hasPricing ? '価格・数量完了' : '価格・数量未完了'} arrow>
                        <Box>
                          {status.hasPricing ? (
                            <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          ) : (
                            <UncheckedIcon sx={{ fontSize: 14, color: 'grey.400' }} />
                          )}
                        </Box>
                      </Tooltip>
                      <Tooltip title={status.hasAllocation ? '配分完了' : status.hasOverAllocation ? '配分超過' : '配分未完了'} arrow>
                        <Box>
                          {status.hasAllocation ? (
                            <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          ) : status.hasOverAllocation ? (
                            <WarningIcon sx={{ fontSize: 14, color: 'error.main' }} />
                          ) : (
                            <UncheckedIcon sx={{ fontSize: 14, color: 'grey.400' }} />
                          )}
                        </Box>
                      </Tooltip>
                    </Stack>
                  </Box>

                  {/* 2行目: 産地 | 品名 */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
                    {product.origin && (
                      <>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                          {product.origin}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                          |
                        </Typography>
                      </>
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'text.primary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {product.name || '未入力'}
                    </Typography>
                  </Box>

                  {/* 3行目: 規格 | 入数+単位 */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
                    {product.specification && (
                      <>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                          {product.specification}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                          |
                        </Typography>
                      </>
                    )}
                    {product.quantityPerPackage && (
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                        {product.quantityPerPackage}{product.unit || ''}
                      </Typography>
                    )}
                  </Box>

                  {/* 4行目: 店着原価 | 税込売価（ステップ3以降のみ） */}
                  {activeStep >= 2 && status.hasPricing && (
                    <Box sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
                      {product.storeCost && (
                        <>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                            ¥{product.storeCost.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                            |
                          </Typography>
                        </>
                      )}
                      {product.priceExcludingTax && (
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                          ¥{Math.round(product.priceExcludingTax * 1.08).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* 配分状況 */}
                  {status.hasPricing && (
                    <Box sx={{ mt: 0.75, pt: 0.75, borderTop: 1, borderColor: 'grey.200' }}>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                        配分: {status.totalAllocated} / {product.totalDelivery}
                        {status.remaining !== 0 && (
                          <Box
                            component="span"
                            sx={{
                              ml: 0.5,
                              color: status.remaining > 0 ? 'warning.main' : 'error.main',
                              fontWeight: 700,
                            }}
                          >
                            ({status.remaining > 0 ? `+${status.remaining}` : status.remaining})
                          </Box>
                        )}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
              </SplideSlide>
            );
          })}
          </Splide>
        </Box>
      </Box>
    );
  };

  return (
    <Paper
      ref={containerRef}
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderRadius: '16px 16px 0 0',
        maxWidth: 'lg',
        margin: '0 auto',
      }}
    >
      {/* ヘッダー（常時表示） */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          cursor: 'pointer',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          borderRadius: expanded ? '16px 16px 0 0' : '16px 16px 0 0',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body1" fontWeight="bold">
            進捗: {progress}%
          </Typography>
          <Typography variant="body2">
            ステップ {activeStep + 1} / {totalSteps}
          </Typography>
        </Box>

        <IconButton
          size="small"
          sx={{ color: 'inherit' }}
        >
          {expanded ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        </IconButton>
      </Box>

      {/* 詳細（折りたたみ可能） */}
      <Collapse in={expanded}>
        {isProductMode ? (
          /* 商品モード: 商品カードを表示 */
          <Box sx={{ bgcolor: 'background.paper' }}>
            {renderProductCards()}
          </Box>
        ) : (
          /* 通常モード: 従来の進捗表示 + ステップ別ヒント */
          <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              入力状況
            </Typography>

            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {steps.map((step, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    opacity: index <= activeStep ? 1 : 0.5,
                  }}
                >
                  {/* アイコン */}
                  {step.completed ? (
                    <CheckCircleIcon fontSize="small" color="success" />
                  ) : step.warning ? (
                    <WarningIcon fontSize="small" color="error" />
                  ) : (
                    <UncheckedIcon fontSize="small" color="disabled" />
                  )}

                  {/* ラベル */}
                  <Typography
                    variant="body2"
                    sx={{
                      minWidth: '80px',
                      fontWeight: index === activeStep ? 'bold' : 'normal',
                    }}
                  >
                    {step.label}
                  </Typography>

                  {/* 値 */}
                  {step.value && (
                    <Chip
                      label={step.value}
                      size="small"
                      color={step.warning ? 'error' : step.completed ? 'success' : 'default'}
                      variant={step.completed ? 'filled' : 'outlined'}
                    />
                  )}
                </Box>
              ))}
            </Stack>

            {/* ステップ別のヒント表示 */}
            {activeStep === 0 && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.50', borderRadius: 1, border: 1, borderColor: 'info.200' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'info.main', display: 'block', mb: 0.5 }}>
                  💡 次のステップ
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  帳合先を選択したら、商品情報の入力に進みます
                </Typography>
              </Box>
            )}

            {activeStep === 4 && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'success.50', borderRadius: 1, border: 1, borderColor: 'success.200' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main', display: 'block', mb: 0.5 }}>
                  ✅ 最終確認
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                  すべての配分数が正しいか確認してください
                </Typography>
                {totalAllocated > 0 && remaining === 0 && (
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'success.dark', fontWeight: 600 }}>
                    配分完了！生成ボタンを押してExcelとPDFを作成できます
                  </Typography>
                )}
                {remaining !== 0 && (
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'warning.dark', fontWeight: 600 }}>
                    配分数の調整が必要です（残り: {remaining}個）
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </Collapse>
    </Paper>
  );
};
