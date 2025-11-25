import React from 'react';
import { Box, Typography } from '@mui/material';
import type { StepHintProps } from './types';

/**
 * ステップヒントコンポーネント
 *
 * 現在のステップに応じたヒントを表示
 */
export const StepHint: React.FC<StepHintProps> = ({
  activeStep,
  totalAllocated,
  remaining,
}) => {
  // ステップ0（店着日選択後）のヒント
  if (activeStep === 0) {
    return (
      <Box
        sx={{
          mt: 2,
          p: 1.5,
          bgcolor: 'info.50',
          borderRadius: 1,
          border: 1,
          borderColor: 'info.200',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: 'info.main',
            display: 'block',
            mb: 0.5,
          }}
        >
          次のステップ
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontSize: '0.7rem', color: 'text.secondary' }}
        >
          帳合先を選択したら、商品情報の入力に進みます
        </Typography>
      </Box>
    );
  }

  // ステップ4（配分確認）のヒント
  if (activeStep === 4) {
    return (
      <Box
        sx={{
          mt: 2,
          p: 1.5,
          bgcolor: 'success.50',
          borderRadius: 1,
          border: 1,
          borderColor: 'success.200',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: 'success.main',
            display: 'block',
            mb: 0.5,
          }}
        >
          最終確認
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.7rem',
            color: 'text.secondary',
            display: 'block',
            mb: 0.5,
          }}
        >
          すべての配分数が正しいか確認してください
        </Typography>
        {totalAllocated > 0 && remaining === 0 && (
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.7rem',
              color: 'success.dark',
              fontWeight: 600,
            }}
          >
            配分完了！生成ボタンを押してExcelとPDFを作成できます
          </Typography>
        )}
        {remaining !== 0 && (
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.7rem',
              color: 'warning.dark',
              fontWeight: 600,
            }}
          >
            配分数の調整が必要です（残り: {remaining}個）
          </Typography>
        )}
      </Box>
    );
  }

  return null;
};
