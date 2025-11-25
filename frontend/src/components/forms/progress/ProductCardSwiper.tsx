import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import './FloatingProgressSummary.css';
import { ProductCard } from './ProductCard';
import type { ProductCardSwiperProps } from './types';

/**
 * 商品カードスライダー
 *
 * 商品カードを横スクロールで表示するコンポーネント
 */
export const ProductCardSwiper: React.FC<ProductCardSwiperProps> = ({
  products,
  activeProductIndex,
  isPressing,
  onProductSelect,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
}) => {
  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{ px: 2, display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
      >
        {/* 前へボタン（画面左端） */}
        {activeProductIndex > 0 && (
          <IconButton
            size="small"
            onClick={() => onProductSelect(activeProductIndex - 1)}
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

        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: 'text.secondary',
            flex: 1,
            textAlign: 'center',
          }}
        >
          商品 {activeProductIndex + 1} / {products.length}
        </Typography>

        {/* 次へボタン（画面右端） */}
        {activeProductIndex < products.length - 1 && (
          <IconButton
            size="small"
            onClick={() => onProductSelect(activeProductIndex + 1)}
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

      {/* Swiperスライダー */}
      <Box sx={{ px: 2, pb: 2, overflow: 'hidden' }}>
        <Swiper
          modules={[FreeMode]}
          slidesPerView="auto"
          spaceBetween={8}
          freeMode={true}
          speed={0}
          style={{ paddingLeft: '4px', paddingRight: '4px' }}
        >
          {products.map((product, index) => {
            const isActive = index === activeProductIndex;

            return (
              <SwiperSlide key={index} style={{ width: 'auto' }}>
                <ProductCard
                  product={product}
                  index={index}
                  isActive={isActive}
                  isPressing={isPressing}
                  onSelect={() => onProductSelect(index)}
                  onContextMenu={(e) => onContextMenu(e, index)}
                  onTouchStart={() => onTouchStart(index)}
                  onTouchEnd={onTouchEnd}
                />
              </SwiperSlide>
            );
          })}
        </Swiper>
      </Box>
    </Box>
  );
};
