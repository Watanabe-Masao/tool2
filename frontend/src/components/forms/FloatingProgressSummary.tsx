import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Collapse,
  IconButton,
  Stack,
  Chip,
} from '@mui/material';
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Warning as WarningIcon,
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
}) => {
  const [expanded, setExpanded] = useState(false);

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
      </Collapse>
    </Paper>
  );
};
