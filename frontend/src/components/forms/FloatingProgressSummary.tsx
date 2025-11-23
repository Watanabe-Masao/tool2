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
}) => {
  const [expanded, setExpanded] = useState(false);

  // ステップ2-4では商品情報モードを表示
  const isProductMode = activeStep >= 1 && activeStep <= 3 && activeProductIndex !== undefined;

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
  const getProductStatus = (product: OrderFormData['products'][0], index: number) => {
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
      <Box sx={{ px: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
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

        {/* 横スクロール可能な商品カードリスト */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': {
              height: 4,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: 2,
            },
          }}
        >
          {formData.products.map((product, index) => {
            const status = getProductStatus(product, index);
            const isActive = index === activeProductIndex;

            return (
              <Card
                key={index}
                onClick={() => onProductChange && onProductChange(index)}
                sx={{
                  minWidth: 200,
                  maxWidth: 200,
                  cursor: 'pointer',
                  border: isActive ? 2 : 1,
                  borderColor: isActive ? 'primary.main' : 'grey.300',
                  bgcolor: isActive ? 'primary.50' : 'background.paper',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  {/* 商品番号 */}
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block', mb: 0.5 }}>
                    商品 #{index + 1}
                  </Typography>

                  {/* 商品名 */}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      mb: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {product.name || '未入力'}
                  </Typography>

                  {/* ステータスアイコン */}
                  <Stack direction="row" spacing={0.5}>
                    {/* 基本情報 */}
                    <Tooltip title={status.hasBasicInfo ? '基本情報完了' : '基本情報未完了'} arrow>
                      <Box>
                        {status.hasBasicInfo ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        ) : (
                          <UncheckedIcon sx={{ fontSize: 16, color: 'grey.400' }} />
                        )}
                      </Box>
                    </Tooltip>

                    {/* 価格・数量 */}
                    <Tooltip title={status.hasPricing ? '価格・数量完了' : '価格・数量未完了'} arrow>
                      <Box>
                        {status.hasPricing ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        ) : (
                          <UncheckedIcon sx={{ fontSize: 16, color: 'grey.400' }} />
                        )}
                      </Box>
                    </Tooltip>

                    {/* 配分 */}
                    <Tooltip title={status.hasAllocation ? '配分完了' : status.hasOverAllocation ? '配分超過' : '配分未完了'} arrow>
                      <Box>
                        {status.hasAllocation ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        ) : status.hasOverAllocation ? (
                          <WarningIcon sx={{ fontSize: 16, color: 'error.main' }} />
                        ) : (
                          <UncheckedIcon sx={{ fontSize: 16, color: 'grey.400' }} />
                        )}
                      </Box>
                    </Tooltip>
                  </Stack>

                  {/* 配分状況 */}
                  {status.hasPricing && (
                    <Box sx={{ mt: 1 }}>
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
            );
          })}
        </Box>
      </Box>
    );
  };

  return (
    <Paper
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
          /* 通常モード: 従来の進捗表示 */
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
          </Box>
        )}
      </Collapse>
    </Paper>
  );
};
