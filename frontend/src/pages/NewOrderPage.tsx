import React from 'react';
import { Container, Typography, Box } from '@mui/material';

/**
 * 新規注文作成ページ（仮実装）
 *
 * TODO: 5ステップの注文フォームを実装
 * - Step 1: 店着日選択
 * - Step 2: 帳合先入力
 * - Step 3: 商品情報入力（複数商品対応）
 * - Step 4: 総納品数入力
 * - Step 5: 36店舗への配分入力
 */
export const NewOrderPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          新規作成
        </Typography>
        <Typography color="text.secondary">
          5ステップの注文フォームを実装予定
        </Typography>
      </Box>
    </Container>
  );
};
