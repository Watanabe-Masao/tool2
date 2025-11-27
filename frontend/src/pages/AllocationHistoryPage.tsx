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
} from '@mui/material';
import { Visibility, Refresh, CalendarMonth, Delete } from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
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
    if (!batch.id) return;

    setSelectedBatch(batch);
    setDetailsLoading(true);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      const fetchedDetails = await firestoreService.getAllocationDetails(batch.id);
      setDetails(fetchedDetails);
    } catch (err) {
      console.error('Failed to fetch batch details:', err);
      setError('詳細の取得に失敗しました');
    } finally {
      setDetailsLoading(false);
    }
  }, []);

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

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchHistory}
          disabled={loading}
        >
          更新
        </Button>
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
      ) : (
        /* 履歴一覧テーブル */
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
              {batches.map((batch) => (
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
