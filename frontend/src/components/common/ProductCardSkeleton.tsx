import React from 'react';
import { Card, CardContent, Skeleton, Box } from '@mui/material';

/**
 * 商品カードスケルトン
 *
 * データ読み込み中に表示するプレースホルダーコンポーネント。
 * 実際のコンテンツの構造を模倣し、スムーズなローディング体験を提供します。
 */
export const ProductCardSkeleton: React.FC = () => (
  <Card>
    <CardContent>
      {/* タイトル行 */}
      <Skeleton
        variant="text"
        width="60%"
        height={24}
        sx={{ mb: 1 }}
      />

      {/* サブタイトル行 */}
      <Skeleton
        variant="text"
        width="80%"
        height={20}
        sx={{ mb: 2 }}
      />

      {/* チップ/バッジ行 */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Skeleton
          variant="rounded"
          width={80}
          height={32}
        />
        <Skeleton
          variant="rounded"
          width={100}
          height={32}
        />
      </Box>

      {/* 詳細情報行 */}
      <Skeleton
        variant="text"
        width="70%"
        height={18}
        sx={{ mb: 0.5 }}
      />
      <Skeleton
        variant="text"
        width="50%"
        height={18}
      />
    </CardContent>
  </Card>
);

/**
 * プリセットアイテムスケルトン
 *
 * プリセットモーダルのリストアイテム用スケルトン
 */
export const PresetItemSkeleton: React.FC = () => (
  <Box sx={{ py: 1.5, px: 2, borderBottom: 1, borderColor: 'divider' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
      <Skeleton variant="text" width="40%" height={20} />
      <Skeleton variant="rounded" width={60} height={18} />
    </Box>
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <Skeleton variant="text" width={100} height={16} />
      <Skeleton variant="text" width={80} height={16} />
      <Skeleton variant="text" width={90} height={16} />
    </Box>
  </Box>
);

/**
 * リストスケルトン
 *
 * 複数のアイテムをローディング中に表示
 */
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <PresetItemSkeleton key={index} />
    ))}
  </>
);

/**
 * テーブル行スケルトン
 *
 * テーブルのローディング状態用
 */
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
  <Box sx={{ display: 'flex', gap: 2, py: 2, px: 2, borderBottom: 1, borderColor: 'divider' }}>
    {Array.from({ length: columns }).map((_, index) => (
      <Skeleton
        key={index}
        variant="text"
        width={`${100 / columns}%`}
        height={20}
      />
    ))}
  </Box>
);
