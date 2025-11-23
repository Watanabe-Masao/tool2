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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Grow,
} from '@mui/material';
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Warning as WarningIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  DeleteOutline,
  ClearAll,
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
  /** 商品削除ハンドラー */
  onRemoveProduct?: (index: number) => void;
  /** 商品フィールドクリアハンドラー */
  onClearProduct?: (index: number) => void;
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
  onRemoveProduct,
  onClearProduct,
}) => {
  const [expanded, setExpanded] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // カードコンテキストメニューの状態
  const [cardMenuAnchor, setCardMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuProductIndex, setMenuProductIndex] = useState<number | null>(null);
  const cardMenuOpen = Boolean(cardMenuAnchor);

  // ステップ2-5では商品情報モードを表示
  const isProductMode = activeStep >= 1 && activeStep <= 4 && activeProductIndex !== undefined;

  /**
   * カードメニューを閉じる
   */
  const handleCardMenuClose = () => {
    setCardMenuAnchor(null);
    setMenuProductIndex(null);
  };

  /**
   * カードメニューから削除
   */
  const handleCardMenuDelete = () => {
    if (menuProductIndex !== null && onRemoveProduct) {
      onRemoveProduct(menuProductIndex);
    }
    handleCardMenuClose();
  };

  /**
   * カードメニューからクリア
   */
  const handleCardMenuClear = () => {
    if (menuProductIndex !== null && onClearProduct) {
      onClearProduct(menuProductIndex);
    }
    handleCardMenuClose();
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
   * 商品カード表示用の横スクロールリスト
   */
  const renderProductCards = () => {
    if (!isProductMode || activeProductIndex === undefined) return null;

    return (
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ px: 2, display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {/* 前へボタン（画面左端） */}
          {activeProductIndex > 0 && onProductChange && (
            <IconButton
              size="small"
              onClick={() => onProductChange(activeProductIndex - 1)}
              sx={{
                position: 'absolute',
                left: -4,
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.4,
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': {
                  opacity: 0.7,
                  bgcolor: 'background.paper',
                },
                zIndex: 10,
              }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          )}

          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', flex: 1, textAlign: 'center' }}>
            商品 {activeProductIndex + 1} / {formData.products.length}
          </Typography>

          {/* 次へボタン（画面右端） */}
          {activeProductIndex < formData.products.length - 1 && onProductChange && (
            <IconButton
              size="small"
              onClick={() => onProductChange(activeProductIndex + 1)}
              sx={{
                position: 'absolute',
                right: -4,
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.4,
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': {
                  opacity: 0.7,
                  bgcolor: 'background.paper',
                },
                zIndex: 10,
              }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* Splideスライダー */}
        <Box sx={{ px: 2, pb: 2, overflow: 'hidden' }}>
          <Splide
            options={{
              type: 'slide',
              perPage: 'auto',
              gap: '8px',
              pagination: false,
              arrows: false,
              drag: true,
              autoWidth: true,
              start: 0,
              padding: { left: '4px', right: '4px' },
              updateOnMove: true,
              trimSpace: false,
              speed: 0,
              rewind: false,
              rewindSpeed: 0,
              flickPower: 800,
              dragMinThreshold: 1,
              waitForTransition: false,
              easing: 'linear',
              reducedMotion: true,
            }}
            aria-label="商品カードスライダー"
          >
            {formData.products.map((product, index) => {
              const isActive = index === activeProductIndex;
              const totalAllocated = product.storeAllocations.reduce((sum, val) => sum + val, 0);
              const hasBasicInfo = !!(product.name && product.origin);
              const isComplete = totalAllocated === product.totalDelivery && totalAllocated > 0;

              return (
                <SplideSlide key={index}>
                  <Card
                    onClick={() => onProductChange?.(index)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenuProductIndex(index);
                      setCardMenuAnchor(e.currentTarget);
                    }}
                    sx={{
                      minWidth: 160,
                      maxWidth: 160,
                      cursor: 'pointer',
                      border: isActive ? 2 : 1,
                      borderColor: isActive ? 'primary.main' : 'divider',
                      bgcolor: isActive ? 'primary.50' : 'background.paper',
                    }}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      {/* 商品番号とステータス */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.75rem' }}>
                          #{index + 1}
                        </Typography>
                        {isComplete ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        ) : hasBasicInfo ? (
                          <UncheckedIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                        ) : (
                          <UncheckedIcon sx={{ fontSize: 16, color: 'grey.400' }} />
                        )}
                      </Box>

                      {/* 品名 */}
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          mb: 0.5,
                        }}
                      >
                        {product.name || '未入力'}
                      </Typography>

                      {/* 産地 */}
                      {product.origin && (
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          {product.origin}
                        </Typography>
                      )}

                      {/* 配分状況 */}
                      {product.totalDelivery > 0 && (
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                          {totalAllocated} / {product.totalDelivery}
                        </Typography>
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

      {/* カード長押しメニュー */}
      <Menu
        anchorEl={cardMenuAnchor}
        open={cardMenuOpen}
        onClose={handleCardMenuClose}
        TransitionComponent={Grow}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        PaperProps={{
          elevation: 8,
          sx: {
            minWidth: 200,
            borderRadius: 2,
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiMenuItem-root': {
              borderRadius: 1,
              mx: 1,
              my: 0.5,
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateX(4px)',
              },
            },
          },
        }}
      >
        {onClearProduct && (
          <MenuItem
            onClick={handleCardMenuClear}
            sx={{
              color: 'warning.main',
              '&:hover': {
                bgcolor: 'warning.lighter',
              },
            }}
          >
            <ListItemIcon>
              <ClearAll sx={{ color: 'warning.main' }} />
            </ListItemIcon>
            <ListItemText
              primary="フィールドをクリア"
              secondary="入力内容を消去"
              primaryTypographyProps={{ fontWeight: 'medium' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        )}
        {onRemoveProduct && formData.products.length > 1 && (
          <MenuItem
            onClick={handleCardMenuDelete}
            sx={{
              color: 'error.main',
              '&:hover': {
                bgcolor: 'error.lighter',
              },
            }}
          >
            <ListItemIcon>
              <DeleteOutline sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText
              primary="商品を削除"
              secondary="この商品カードを削除"
              primaryTypographyProps={{ fontWeight: 'medium' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
};
