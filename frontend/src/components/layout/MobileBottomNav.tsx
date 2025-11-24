import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme,
  useMediaQuery,
  Box,
  Typography,
  IconButton,
  Collapse,
  Chip,
  Stack,
} from '@mui/material';
import {
  AddCircle,
  CalendarToday,
  DarkMode,
  LightMode,
  ChevronLeft,
  ChevronRight,
  ExpandLess,
  ExpandMore,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { haptic } from '@/utils/hapticFeedback';
import { useThemeContext } from '@/context/ThemeContext';
import { useNavigationContext } from '@/context/NavigationContext';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * ナビゲーションアイテムの定義
 */
const navigationItems = [
  {
    label: '新規作成',
    icon: <AddCircle />,
    path: '/new-order',
    value: 'new-order',
  },
  {
    label: 'カレンダー',
    icon: <CalendarToday />,
    path: '/calendar',
    value: 'calendar',
  },
  {
    label: 'テーマ',
    value: 'theme',
    // アイコンは動的に変更
  },
];

/**
 * モバイル用ボトムナビゲーション
 *
 * モバイルデバイスで親指操作がしやすい下部ナビゲーションバー。
 * - タッチターゲットサイズ最適化
 * - ハプティックフィードバック対応
 * - アクティブ状態の視覚的強調
 * - スマートフォンのみ表示（タブレット・デスクトップでは非表示）
 * - ダークモード切り替え機能
 */
export const MobileBottomNav: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { mode: themeMode, toggleTheme } = useThemeContext();
  const {
    isStepNavigationActive,
    activeStep,
    totalSteps,
    formData,
    onPrevStep,
    onNextStep,
  } = useNavigationContext();

  // 進捗詳細の展開状態
  const [expanded, setExpanded] = useState(false);

  // モバイル以外では表示しない
  if (!isMobile) {
    return null;
  }

  // ステップナビゲーション表示中は専用UIを表示
  if (isStepNavigationActive && formData) {
    // 各ステップの完了状態を判定
    const totalDeliverySum = formData.products.reduce(
      (sum, product) => sum + (product.totalDelivery || 0),
      0
    );
    const totalAllocated = formData.products.reduce(
      (sum, product) =>
        sum + product.storeAllocations.reduce((s, val) => s + val, 0),
      0
    );
    const remaining = totalDeliverySum - totalAllocated;

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

    const completedCount = steps.filter((s) => s.completed).length;
    const progress = Math.round((completedCount / steps.length) * 100);

    return (
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
        }}
        elevation={3}
      >
        {/* 詳細情報（折りたたみ可能） */}
        <Collapse in={expanded}>
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
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

        {/* メインナビゲーション */}
        <Box
          sx={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1,
          }}
        >
          {/* 前のステップへ */}
          <BottomNavigationAction
            label="前へ"
            icon={<ChevronLeft />}
            onClick={() => {
              haptic('light');
              onPrevStep?.();
            }}
            disabled={!onPrevStep}
            sx={{
              flex: 1,
              maxWidth: '80px',
              '&.Mui-disabled': {
                opacity: 0.3,
              },
            }}
          />

          {/* 中央：進捗表示 + 展開ボタン */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => {
              haptic('light');
              setExpanded(!expanded);
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" fontWeight="600" color="primary">
                ステップ {activeStep + 1}/{totalSteps}
              </Typography>
              <IconButton size="small" sx={{ p: 0 }}>
                {expanded ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
              </IconButton>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {['店着日・帳合先', '商品情報', '価格・数量', '店舗配分', 'プレビュー'][activeStep] || ''} • {progress}%
            </Typography>
          </Box>

          {/* 次のステップへ */}
          <BottomNavigationAction
            label="次へ"
            icon={<ChevronRight />}
            onClick={() => {
              haptic('light');
              onNextStep?.();
            }}
            disabled={!onNextStep}
            sx={{
              flex: 1,
              maxWidth: '80px',
              '&.Mui-disabled': {
                opacity: 0.3,
              },
            }}
          />
        </Box>
      </Paper>
    );
  }

  // 現在のパスから値を取得
  const currentValue = navigationItems.find((item) =>
    item.path && location.pathname.startsWith(item.path)
  )?.value || 'new-order';

  /**
   * ナビゲーション変更ハンドラー
   */
  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    // ハプティックフィードバック
    haptic('light');

    // テーマ切り替えの場合
    if (newValue === 'theme') {
      toggleTheme();
      return;
    }

    // ページ遷移
    const item = navigationItems.find((item) => item.value === newValue);
    if (item && item.path) {
      history.push(item.path);
    }
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
      }}
      elevation={3}
    >
      <BottomNavigation
        value={currentValue}
        onChange={handleChange}
        showLabels
        sx={{
          height: '64px', // タッチターゲットサイズを確保
          '& .MuiBottomNavigationAction-root': {
            minWidth: '64px',
            padding: '8px 12px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&.Mui-selected': {
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.75rem',
                fontWeight: 600,
              },
              '& .MuiSvgIcon-root': {
                transform: 'scale(1.1)',
              },
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.7rem',
            marginTop: '4px',
          },
        }}
      >
        {navigationItems.map((item) => {
          // テーマ切り替えボタンは動的にアイコンを変更
          if (item.value === 'theme') {
            return (
              <BottomNavigationAction
                key={item.value}
                label={themeMode === 'dark' ? 'ライト' : 'ダーク'}
                value={item.value}
                icon={themeMode === 'dark' ? <LightMode /> : <DarkMode />}
                sx={{
                  '& .MuiSvgIcon-root': {
                    transition: 'transform 0.3s ease',
                  },
                  '&:active .MuiSvgIcon-root': {
                    transform: 'rotate(20deg) scale(1.1)',
                  },
                }}
              />
            );
          }

          return (
            <BottomNavigationAction
              key={item.value}
              label={item.label}
              value={item.value}
              icon={item.icon}
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
};
