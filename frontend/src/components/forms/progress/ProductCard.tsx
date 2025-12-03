import React from 'react';
import { Box, Typography, Stack, Card, CardContent } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { ProductCardProps } from './types';
import { getProductStatus } from './hooks/useProductStatus';

/**
 * 商品カードコンポーネント
 *
 * 商品の基本情報と入力状態を表示するコンパクトなカード
 */
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  index,
  isActive,
  isPressing,
  onSelect,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
}) => {
  const status = getProductStatus(product);

  return (
    <Box>
      {/* 商品番号（カード外） */}
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          textAlign: 'center',
          fontWeight: 700,
          color: isActive ? 'primary.main' : 'text.secondary',
          fontSize: '0.7rem',
          mb: 0.5,
        }}
      >
        商品 {index + 1}
      </Typography>

      <Card
        onClick={onSelect}
        onContextMenu={onContextMenu}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onMouseDown={onTouchStart}
        onMouseUp={onTouchEnd}
        onMouseLeave={onTouchEnd}
        sx={{
          minWidth: 180,
          maxWidth: 180,
          cursor: 'pointer',
          border: isActive ? 2 : 1,
          borderColor: isActive ? 'primary.main' : 'grey.300',
          bgcolor: isActive ? 'primary.50' : 'background.paper',
          transition: 'all 0.2s',
          transform: isPressing && isActive ? 'scale(0.95)' : 'scale(1)',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: 2,
          },
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          {/* 1行目: 帳合先 + ステータスアイコン */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.75,
            }}
          >
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
                minWidth: 0,
              }}
            >
              {product.supplier || '帳合先未設定'}
            </Typography>
            {/* ステータスアイコン（右側） */}
            <Stack direction="row" spacing={0.5}>
              {status.hasBasicInfo ? (
                <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
              ) : (
                <UncheckedIcon sx={{ fontSize: 14, color: 'grey.400' }} />
              )}
              {status.hasPricing ? (
                <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
              ) : (
                <UncheckedIcon sx={{ fontSize: 14, color: 'grey.400' }} />
              )}
              {status.hasAllocation ? (
                <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
              ) : status.hasOverAllocation ? (
                <WarningIcon sx={{ fontSize: 14, color: 'error.main' }} />
              ) : (
                <UncheckedIcon sx={{ fontSize: 14, color: 'grey.400' }} />
              )}
            </Stack>
          </Box>

          {/* 2行目: 産地 | 商品名 */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
            {product.origin && (
              <>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.65rem',
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {product.origin}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.65rem', color: 'text.secondary' }}
                >
                  |
                </Typography>
              </>
            )}
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {product.name || '商品名未入力'}
            </Typography>
          </Box>

          {/* 3行目: 規格 | 入数 */}
          {(product.specification || product.quantityPerPackage) && (
            <Box
              sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}
            >
              {product.specification && (
                <>
                  <Typography
                    variant="caption"
                    sx={{ fontSize: '0.65rem', color: 'text.secondary' }}
                  >
                    {product.specification}{product.unit ? ` ${product.unit}` : ''}
                  </Typography>
                  {product.quantityPerPackage && (
                    <Typography
                      variant="caption"
                      sx={{ fontSize: '0.65rem', color: 'text.secondary' }}
                    >
                      |
                    </Typography>
                  )}
                </>
              )}
              {product.quantityPerPackage && (
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.65rem', color: 'text.secondary' }}
                >
                  {product.quantityPerPackage}
                  {product.packageUnit || ''}
                </Typography>
              )}
            </Box>
          )}

          {/* 4行目: 店着原価 | 税込売価 */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
            {product.storeCost !== null ? (
              <>
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.65rem', color: 'text.secondary' }}
                >
                  原価 ¥{product.storeCost.toLocaleString()}
                </Typography>
                {product.priceExcludingTax !== null && (
                  <Typography
                    variant="caption"
                    sx={{ fontSize: '0.65rem', color: 'text.secondary' }}
                  >
                    |
                  </Typography>
                )}
              </>
            ) : (
              <Typography
                variant="caption"
                sx={{ fontSize: '0.65rem', color: 'text.disabled' }}
              >
                原価 未入力
              </Typography>
            )}
            {product.priceExcludingTax !== null ? (
              <Typography
                variant="caption"
                sx={{ fontSize: '0.65rem', color: 'text.secondary' }}
              >
                売価 ¥
                {Math.round(product.priceExcludingTax * 1.08).toLocaleString()}
              </Typography>
            ) : (
              product.storeCost === null && (
                <>
                  <Typography
                    variant="caption"
                    sx={{ fontSize: '0.65rem', color: 'text.secondary' }}
                  >
                    |
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontSize: '0.65rem', color: 'text.disabled' }}
                  >
                    売価 未入力
                  </Typography>
                </>
              )
            )}
          </Box>

          {/* 配分状況 */}
          {status.hasPricing && (
            <Box
              sx={{ mt: 0.5, pt: 0.5, borderTop: 1, borderColor: 'grey.200' }}
            >
              <Typography
                variant="caption"
                sx={{ fontSize: '0.65rem', color: 'text.secondary' }}
              >
                配分: {status.totalAllocated} / {product.totalDelivery}
                {status.remaining !== 0 && (
                  <Box
                    component="span"
                    sx={{
                      ml: 0.5,
                      color:
                        status.remaining > 0 ? 'warning.main' : 'error.main',
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
    </Box>
  );
};
