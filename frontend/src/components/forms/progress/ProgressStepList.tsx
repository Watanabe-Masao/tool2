import React from 'react';
import { Box, Typography, Stack, Chip } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { ProgressStepListProps } from './types';

/**
 * 進捗ステップリスト
 *
 * 各ステップの完了状態を一覧表示
 */
export const ProgressStepList: React.FC<ProgressStepListProps> = ({
  steps,
  activeStep,
}) => {
  return (
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
                color={
                  step.warning ? 'error' : step.completed ? 'success' : 'default'
                }
                variant={step.completed ? 'filled' : 'outlined'}
              />
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
};
