import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';

/**
 * ステップの定義
 */
export interface FormStep {
  label: string;
  optional?: boolean;
}

/**
 * FormStepIndicatorのProps
 */
interface FormStepIndicatorProps {
  /** 現在のステップ（0-indexed） */
  activeStep: number;
  /** ステップの配列 */
  steps: FormStep[];
}

/**
 * フォームステップインジケーター
 *
 * ボタンなしのステップ表示のみ。スワイプナビゲーション用。
 */
export const FormStepIndicator: React.FC<FormStepIndicatorProps> = ({ activeStep, steps }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const maxSteps = steps.length;
  const progress = ((activeStep + 1) / maxSteps) * 100;

  return (
    <Box sx={{ mb: 2 }}>
      {/* プログレスバー */}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 6,
          borderRadius: 3,
          mb: 1,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': {
            borderRadius: 3,
            bgcolor: 'primary.main',
          },
        }}
      />

      {/* ステップ情報 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          ステップ {activeStep + 1} / {maxSteps}
        </Typography>
        <Typography variant="body2" fontWeight="medium" color="primary">
          {steps[activeStep].label}
        </Typography>
      </Box>

      {/* モバイル用のスワイプヒント */}
      {isMobile && activeStep === 0 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 1, opacity: 0.7 }}
        >
          左右にスワイプでページ移動
        </Typography>
      )}
    </Box>
  );
};
