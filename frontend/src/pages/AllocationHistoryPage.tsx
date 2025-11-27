import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Badge,
  Tooltip,
} from '@mui/material';
import { Visibility, Refresh, CalendarMonth, Delete, ViewList, CalendarToday } from '@mui/icons-material';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useAuthContext } from '@/context/AuthContext';
import { getFirebaseFirestore } from '@/services/firebase/config';
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';
import { STORE_DATA } from '@/utils/constants';
import type { AllocationBatch, AllocationDetail } from '@/types/allocationHistory';

/**
 * 配分履歴一覧ページ
 *
 * 過去の配分履歴を一覧表示し、詳細を確認できます。
 */
export const AllocationHistoryPage: React.FC = () => {
  const { user } = useAuthContext();

  const [batches, setBatches] = useState<AllocationBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 表示モード
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');

  // 詳細モーダル
  const [selectedBatch, setSelectedBatch] = useState<AllocationBatch | null>(null);
  const [details, setDetails] = useState<AllocationDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // 削除確認ダイアログ
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<AllocationBatch | null>(null);
  const [deleting, setDeleting] = useState(false);

  /**
   * 履歴を取得（過去30日間）
   */
  const fetchHistory = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      const fetchedBatches = await firestoreService.getAllocationBatchesByDateRange(
        user.uid,
        startDate,
        endDate
      );

      setBatches(fetchedBatches);
    } catch (err) {
      console.error('Failed to fetch allocation history:', err);
      setError('履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  /**
   * バッチの詳細を取得
   */
  const fetchBatchDetails = useCallback(async (batch: AllocationBatch) => {
    if (!batch.id || !user?.uid) return;

    setSelectedBatch(batch);
    setDetailsLoading(true);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      const fetchedDetails = await firestoreService.getAllocationDetails(user.uid, batch.id);
      setDetails(fetchedDetails);
    } catch (err) {
      console.error('Failed to fetch batch details:', err);
      setError(`詳細の取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setDetailsLoading(false);
    }
  }, [user?.uid]);

  /**
   * 初回読み込み
   */
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /**
   * 詳細モーダルを閉じる
   */
  const handleCloseDetails = () => {
    setSelectedBatch(null);
    setDetails([]);
  };

  /**
   * 削除確認ダイアログを開く
   */
  const handleOpenDeleteDialog = (batch: AllocationBatch) => {
    setBatchToDelete(batch);
    setDeleteDialogOpen(true);
  };

  /**
   * 削除確認ダイアログを閉じる
   */
  const handleCloseDeleteDialog = () => {
    setBatchToDelete(null);
    setDeleteDialogOpen(false);
  };

  /**
   * 配分履歴を削除
   */
  const handleDelete = async () => {
    if (!batchToDelete?.id || !user?.uid) return;

    setDeleting(true);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      const success = await firestoreService.deleteAllocationBatch(user.uid, batchToDelete.id);

      if (success) {
        // 一覧から削除
        setBatches((prev) => prev.filter((b) => b.id !== batchToDelete.id));
        handleCloseDeleteDialog();
      } else {
        setError('削除に失敗しました');
      }
    } catch (err) {
      console.error('Failed to delete batch:', err);
      setError(`削除に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setDeleting(false);
    }
  };

  /**
   * 日付ごとにバッチをグループ化
   */
  const batchesByDate = batches.reduce((acc, batch) => {
    const dateKey = batch.deliveryDate;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(batch);
    return acc;
  }, {} as Record<string, AllocationBatch[]>);

  /**
   * 特定の日付のバッチ数を取得
   */
  const getBatchCountForDate = (date: Date): number => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return batchesByDate[dateKey]?.length || 0;
  };

  /**
   * 特定の日付の合計商品数を取得
   */
  const getTotalProductsForDate = (date: Date): number => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayBatches = batchesByDate[dateKey] || [];
    return dayBatches.reduce((sum, b) => sum + b.productCount, 0);
  };

  /**
   * バッチを週ごとにグループ化
   */
  const batchesByWeek = batches.reduce((acc, batch) => {
    const batchDate = parseISO(batch.deliveryDate);
    const weekStart = startOfWeek(batchDate, { locale: ja, weekStartsOn: 0 }); // 日曜始まり
    const weekKey = format(weekStart, 'yyyy-MM-dd');

    if (!acc[weekKey]) {
      acc[weekKey] = {
        weekStart,
        weekEnd: endOfWeek(batchDate, { locale: ja, weekStartsOn: 0 }),
        batches: [],
      };
    }
    acc[weekKey].batches.push(batch);
    return acc;
  }, {} as Record<string, { weekStart: Date; weekEnd: Date; batches: AllocationBatch[] }>);

  // 週を新しい順にソート
  const sortedWeeks = Object.values(batchesByWeek).sort((a, b) =>
    b.weekStart.getTime() - a.weekStart.getTime()
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
            配分履歴
          </Typography>
          <Typography variant="body2" color="text.secondary">
            過去30日間の配分履歴を表示しています
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="calendar">
              <CalendarToday fontSize="small" sx={{ mr: 0.5 }} />
              カレンダー
            </ToggleButton>
            <ToggleButton value="table">
              <ViewList fontSize="small" sx={{ mr: 0.5 }} />
              リスト
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchHistory}
            disabled={loading}
          >
            更新
          </Button>
        </Stack>
      </Box>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 読み込み中 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : batches.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: 'center' }}>
          <CalendarMonth sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            配分履歴がありません
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            配分表を生成して「履歴を保存」すると、ここに表示されます
          </Typography>
        </Paper>
      ) : viewMode === 'calendar' ? (
        /* カレンダー表示 */
        <Paper sx={{ p: 3 }}>
          <Box
            sx={{
              '.rdp': {
                '--rdp-cell-size': '80px',
                '--rdp-accent-color': '#1976d2',
                '--rdp-background-color': '#e3f2fd',
                margin: '0 auto',
              },
              '.rdp-day': {
                height: '80px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                position: 'relative',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                },
              },
              '.rdp-day_selected': {
                backgroundColor: '#e3f2fd !important',
                border: '2px solid #1976d2',
              },
            }}
          >
            <DayPicker
              mode="single"
              locale={ja}
              month={new Date()}
              modifiers={{
                hasAllocations: (date) => getBatchCountForDate(date) > 0,
              }}
              modifiersStyles={{
                hasAllocations: {
                  backgroundColor: '#e3f2fd',
                  fontWeight: 'bold',
                },
              }}
              components={{
                DayContent: ({ date }) => {
                  const batchCount = getBatchCountForDate(date);
                  const productCount = getTotalProductsForDate(date);
                  const dateKey = format(date, 'yyyy-MM-dd');
                  const dayBatches = batchesByDate[dateKey] || [];

                  return (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        p: 0.5,
                        cursor: batchCount > 0 ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (dayBatches.length > 0) {
                          // 最初のバッチの詳細を表示
                          fetchBatchDetails(dayBatches[0]);
                        }
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {format(date, 'd')}
                      </Typography>
                      {batchCount > 0 && (
                        <Box sx={{ textAlign: 'center', width: '100%' }}>
                          <Chip
                            label={`${batchCount}件`}
                            size="small"
                            color="primary"
                            sx={{ mb: 0.5, fontSize: '0.7rem', height: '18px' }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.65rem',
                              color: 'text.secondary',
                              display: 'block',
                            }}
                          >
                            {productCount}品
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  );
                },
              }}
            />
          </Box>
        </Paper>
      ) : (
        /* テーブル表示（週単位） */
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>納品日</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>帳合先</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">
                  商品数
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">
                  合計数量
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>保存日時</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                  操作
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedWeeks.map((week, weekIdx) => (
                <React.Fragment key={weekIdx}>
                  {/* 週ヘッダー */}
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      sx={{
                        backgroundColor: 'grey.100',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        py: 1.5,
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarToday fontSize="small" color="primary" />
                        <Typography variant="subtitle2" fontWeight={700}>
                          {format(week.weekStart, 'M月d日', { locale: ja })} 〜{' '}
                          {format(week.weekEnd, 'M月d日(E)', { locale: ja })}
                        </Typography>
                        <Chip
                          label={`${week.batches.length}件`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Stack>
                    </TableCell>
                  </TableRow>
                  {/* 週内のバッチ */}
                  {week.batches.map((batch) => (
                    <TableRow
                      key={batch.id}
                      hover
                      sx={{
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <TableCell>
                        <Chip
                          icon={<CalendarMonth />}
                          label={format(new Date(batch.deliveryDate), 'M月d日(E)', { locale: ja })}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {batch.suppliers.map((supplier, idx) => (
                            <Chip key={idx} label={supplier} size="small" />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {batch.productCount}品
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} color="primary">
                          {batch.totalQuantity.toLocaleString()}個
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {batch.createdAt
                            ? format(batch.createdAt, 'yyyy/MM/dd HH:mm')
                            : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => fetchBatchDetails(batch)}
                          title="詳細を表示"
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleOpenDeleteDialog(batch)}
                          title="削除"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 詳細モーダル */}
      <Dialog
        open={Boolean(selectedBatch)}
        onClose={handleCloseDetails}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          配分履歴詳細
          {selectedBatch && (
            <Typography variant="subtitle2" color="text.secondary">
              納品日: {format(new Date(selectedBatch.deliveryDate), 'yyyy年M月d日(E)', { locale: ja })}
            </Typography>
          )}
        </DialogTitle>

        <DialogContent dividers>
          {detailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : details.length === 0 ? (
            <Typography color="text.secondary">詳細データがありません</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 600 }}>商品名</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>産地</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>規格</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">
                      合計
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>配分先</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {details.map((detail, idx) => {
                    const allocatedStores = detail.storeAllocations
                      .map((qty, storeIdx) => ({
                        store: STORE_DATA[storeIdx],
                        qty,
                      }))
                      .filter((item) => item.qty > 0);

                    return (
                      <TableRow key={idx} hover>
                        <TableCell>{detail.productName}</TableCell>
                        <TableCell>{detail.origin}</TableCell>
                        <TableCell>{detail.specification}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            {detail.totalDelivery}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            {allocatedStores.map(({ store, qty }) => (
                              <Chip
                                key={store.code}
                                label={`${store.code}: ${qty}`}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDetails}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'error.main' }}>
          配分履歴を削除しますか？
        </DialogTitle>

        <DialogContent>
          {batchToDelete && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                以下の配分履歴を削除します。この操作は取り消せません。
              </Typography>
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>納品日:</strong>{' '}
                  {format(new Date(batchToDelete.deliveryDate), 'yyyy年M月d日(E)', {
                    locale: ja,
                  })}
                </Typography>
                <Typography variant="body2">
                  <strong>帳合先:</strong> {batchToDelete.suppliers.join(', ')}
                </Typography>
                <Typography variant="body2">
                  <strong>商品数:</strong> {batchToDelete.productCount}品
                </Typography>
                <Typography variant="body2">
                  <strong>合計数量:</strong> {batchToDelete.totalQuantity.toLocaleString()}個
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleting}>
            キャンセル
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <Delete />}
          >
            {deleting ? '削除中...' : '削除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
