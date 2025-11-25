import React from 'react';
import { Box, Typography, IconButton, useTheme, useMediaQuery } from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import type { ProgressHeaderProps } from './types';

/**
 * 進捗ヘッダーコンポーネント
 *
 * ステップナビゲーションと折りたたみ機能を提供
 */
export const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  activeStep,
  totalSteps,
  progress,
  showProgressSummary,
  isCollapsed,
  onPrevStep,
  onNextStep,
  onToggleCollapse,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        borderRadius: '16px 16px 0 0',
      }}
    >
      {/* 上段：ナビゲーションとステップ表示 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          py: isMobile ? 0.5 : 0.75,
          px: isMobile ? 0.5 : 1,
        }}
      >
        {/* 前へボタン */}
        <IconButton
          size="small"
          onClick={onPrevStep}
          disabled={!onPrevStep}
          sx={{
            color: 'inherit',
            p: 0.25,
            '&.Mui-disabled': {
              color: 'rgba(255, 255, 255, 0.3)',
            },
          }}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>

        {/* 中央：ステップ表示 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="caption"
            fontWeight="bold"
            sx={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}
          >
            ステップ {activeStep + 1} / {totalSteps}
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}
          >
            • {progress}%
          </Typography>
        </Box>

        {/* 次へボタン */}
        <IconButton
          size="small"
          onClick={onNextStep}
          disabled={!onNextStep}
          sx={{
            color: 'inherit',
            p: 0.25,
            '&.Mui-disabled': {
              color: 'rgba(255, 255, 255, 0.3)',
            },
          }}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* 下段：折りたたみトグル */}
      {showProgressSummary && (
        <Box
          onClick={onToggleCollapse}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            py: 0.25,
            cursor: 'pointer',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          {isCollapsed ? (
            <ExpandMoreIcon fontSize="small" sx={{ fontSize: '1rem' }} />
          ) : (
            <ExpandLessIcon fontSize="small" sx={{ fontSize: '1rem' }} />
          )}
        </Box>
      )}
    </Box>
  );
};
