import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  LinearProgress,
  Alert,
  Divider,
  CircularProgress,
  TextField,
} from '@mui/material';
import { subDays, format } from 'date-fns';
import { useAuthContext } from '@/context/AuthContext';
import { getFirebaseFirestore } from '@/services/firebase/config';
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';
import { STORE_DATA } from '@/utils/constants';

/**
 * フィルタータイプ
 */
type FilterType = 'all' | 'sameProduct' | 'sameCategory';

/**
 * 店舗別比率データ
 */
export interface StoreRatio {
  storeCode: string;
  storeName: string;
  count: number;
  ratio: number;
}

/**
 * モーダルのProps
 */
interface HistoryAllocationModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (ratios: StoreRatio[]) => void;
  /** 現在の商品情報（同じ商品フィルタ用） */
  currentProduct?: {
    name: string;
    origin: string;
    categoryCode?: string;
  };
}

/**
 * 履歴ベース自動配分モーダル
 *
 * ユーザーが期間とフィルタを選択し、過去の配分履歴から
 * 店舗別の比率を計算して表示します。
 */
export const HistoryAllocationModal: React.FC<HistoryAllocationModalProps> = ({
  open,
  onClose,
  onApply,
  currentProduct,
}) => {
  const { user } = useAuthContext();

  // 期間選択（デフォルト: 過去7日間）
  const [startDate, setStartDate] = useState<string>(() =>
    format(subDays(new Date(), 7), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(() =>
    format(new Date(), 'yyyy-MM-dd')
  );

  // フィルタータイプ
  const [filterType, setFilterType] = useState<FilterType>('all');

  // 読み込み状態
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 計算結果
  const [storeRatios, setStoreRatios] = useState<StoreRatio[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [recordCount, setRecordCount] = useState(0);

  /**
   * 履歴から比率を計算
   */
  const calculateRatios = useCallback(async () => {
    if (!user?.uid || !startDate || !endDate) return;

    setLoading(true);
    setError(null);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      // 期間内のバッチを取得
      const batches = await firestoreService.getAllocationBatchesByDateRange(
        user.uid,
        startDate,
        endDate
      );

      // 各バッチの詳細を取得
      const allDetails: { storeAllocations: number[]; productName: string; origin: string; categoryCode?: string }[] = [];

      for (const batch of batches) {
        if (batch.id) {
          const details = await firestoreService.getAllocationDetails(batch.id);
          details.forEach((detail) => {
            allDetails.push({
              storeAllocations: detail.storeAllocations,
              productName: detail.productName,
              origin: detail.origin,
              categoryCode: detail.categoryCode,
            });
          });
        }
      }

      // フィルタ適用
      let filteredDetails = allDetails;

      if (filterType === 'sameProduct' && currentProduct) {
        filteredDetails = allDetails.filter(
          (d) => d.productName === currentProduct.name && d.origin === currentProduct.origin
        );
      } else if (filterType === 'sameCategory' && currentProduct?.categoryCode) {
        filteredDetails = allDetails.filter(
          (d) => d.categoryCode === currentProduct.categoryCode
        );
      }

      // 店舗別に集計
      const storeTotals: Record<string, number> = {};
      STORE_DATA.forEach((store) => {
        storeTotals[store.code] = 0;
      });

      filteredDetails.forEach((detail) => {
        detail.storeAllocations.forEach((qty, index) => {
          const store = STORE_DATA[index];
          if (store) {
            storeTotals[store.code] += qty;
          }
        });
      });

      // 合計を計算
      const total = Object.values(storeTotals).reduce((a, b) => a + b, 0);

      // 比率を計算
      const ratios: StoreRatio[] = STORE_DATA.map((store) => ({
        storeCode: store.code,
        storeName: store.name,
        count: storeTotals[store.code],
        ratio: total > 0 ? storeTotals[store.code] / total : 0,
      }));

      // 比率が高い順にソート（表示用）
      ratios.sort((a, b) => b.ratio - a.ratio);

      setStoreRatios(ratios);
      setTotalCount(total);
      setRecordCount(filteredDetails.length);
    } catch (err) {
      console.error('Failed to calculate ratios:', err);
      setError('履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, startDate, endDate, filterType, currentProduct]);

  /**
   * モーダルが開かれたとき、または条件が変わったときに再計算
   */
  useEffect(() => {
    if (open) {
      calculateRatios();
    }
  }, [open, calculateRatios]);

  /**
   * 適用ボタン
   */
  const handleApply = () => {
    onApply(storeRatios);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        履歴ベース自動配分
      </DialogTitle>

      <DialogContent dividers>
        {/* 期間選択 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            参照期間
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              type="date"
              label="開始日"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <Typography>〜</Typography>
            <TextField
              type="date"
              label="終了日"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </Box>

        {/* フィルター選択 */}
        <Box sx={{ mb: 3 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              参照データ
            </FormLabel>
            <RadioGroup
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
            >
              <FormControlLabel
                value="all"
                control={<Radio size="small" />}
                label="全商品の配分履歴を使用"
              />
              <FormControlLabel
                value="sameProduct"
                control={<Radio size="small" />}
                label={
                  currentProduct
                    ? `同じ商品のみ（${currentProduct.name} / ${currentProduct.origin}）`
                    : '同じ商品のみ（商品未選択）'
                }
                disabled={!currentProduct}
              />
              <FormControlLabel
                value="sameCategory"
                control={<Radio size="small" />}
                label={
                  currentProduct?.categoryCode
                    ? `同じカテゴリのみ（${currentProduct.categoryCode}）`
                    : '同じカテゴリのみ（カテゴリ未設定）'
                }
                disabled={!currentProduct?.categoryCode}
              />
            </RadioGroup>
          </FormControl>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* プレビュー */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            この条件での配分比率
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : totalCount === 0 ? (
            <Alert severity="warning">
              この条件に該当する配分履歴がありません
            </Alert>
          ) : (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                対象データ: {recordCount}件 / 合計: {totalCount.toLocaleString()}個
              </Typography>

              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {storeRatios
                  .filter((r) => r.ratio > 0)
                  .map((ratio) => (
                    <Box key={ratio.storeCode} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">
                          {ratio.storeCode} {ratio.storeName}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {ratio.count.toLocaleString()}個 ({(ratio.ratio * 100).toFixed(1)}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={ratio.ratio * 100}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                          },
                        }}
                      />
                    </Box>
                  ))}

                {storeRatios.filter((r) => r.ratio === 0).length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    ※ 配分0の店舗: {storeRatios.filter((r) => r.ratio === 0).length}店舗
                  </Typography>
                )}
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          キャンセル
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          disabled={loading || totalCount === 0}
        >
          この比率で配分
        </Button>
      </DialogActions>
    </Dialog>
  );
};
