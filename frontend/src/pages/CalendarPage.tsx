import React from 'react';
import { Container, Typography, Box } from '@mui/material';

/**
 * カレンダー表示ページ（仮実装）
 *
 * TODO: 過去の注文データをカレンダー形式で表示
 * - 月次カレンダービュー
 * - 日付クリックで注文詳細表示
 * - 既存注文への商品追加機能
 */
export const CalendarPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          カレンダー
        </Typography>
        <Typography color="text.secondary">
          過去の注文データをカレンダー形式で表示予定
        </Typography>
      </Box>
    </Container>
  );
};
