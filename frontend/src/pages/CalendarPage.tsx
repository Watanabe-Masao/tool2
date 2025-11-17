import React from 'react';
import { Container, Typography, Box, Card, CardContent, Alert } from '@mui/material';
import { CalendarMonth } from '@mui/icons-material';

/**
 * カレンダービューページ
 *
 * 過去の注文をカレンダー形式で表示します。
 * 現在は基本実装のみで、将来的に以下の機能を追加予定:
 * - 月間カレンダービュー
 * - 日付ごとの注文一覧
 * - 注文の詳細表示
 * - 注文の編集・削除
 *
 * TODO (Phase 6):
 * - React Big Calendarまたは@mui/x-date-pickers Calendarの統合
 * - Firestoreから注文履歴を取得
 * - カレンダーにイベントとして表示
 * - クリックで詳細モーダル表示
 */
export const CalendarPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
          <Box sx={{ py: 4 }}>
            {/* ページヘッダー */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              <CalendarMonth sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <Typography variant="h4" component="h1">
                カレンダー
              </Typography>
            </Box>

            {/* お知らせ */}
            <Alert severity="info" sx={{ mb: 4 }}>
              カレンダービュー機能は今後のアップデートで実装予定です。
            </Alert>

            {/* プレースホルダーコンテンツ */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  今後実装予定の機能
                </Typography>
                <Box component="ul" sx={{ pl: 2 }}>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    📅 月間カレンダービュー
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    📝 日付ごとの注文一覧表示
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    🔍 注文の詳細表示
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    ✏️ 注文の編集・削除機能
                  </Typography>
                  <Typography component="li" variant="body2">
                    🔄 Firestoreとの連携
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* 開発メモ */}
            <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" component="div">
                <strong>開発メモ:</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
                カレンダー実装には以下のライブラリの使用を検討:
              </Typography>
              <Typography variant="caption" color="text.secondary" component="ul" sx={{ pl: 2, mt: 1 }}>
                <li>react-big-calendar: 多機能なカレンダーコンポーネント</li>
                <li>@mui/x-date-pickers: MUIネイティブのカレンダー</li>
                <li>FullCalendar: 高度なカレンダー機能</li>
              </Typography>
            </Box>
          </Box>
        </Container>
  );
};
