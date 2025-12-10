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
  Paper,
  Popover,
  Chip,
  Stack,
} from '@mui/material';
import { CalendarMonth, Today, DateRange } from '@mui/icons-material';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DayPicker, type DateRange as DateRangeType } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import './HistoryAllocationModal.css';
import { useAuthContext } from '@/context/AuthContext';
import { LAYER_Z_INDEX } from '@/constants/zIndex';
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
  const [dateRange, setDateRange] = useState<DateRangeType | undefined>(() => ({
    from: startOfDay(subDays(new Date(), 7)),
    to: endOfDay(new Date()),
  }));

  // カレンダーポップオーバー
  const [calendarAnchor, setCalendarAnchor] = useState<HTMLButtonElement | null>(null);

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
   * 期間プリセットを設定
   */
  const setPresetRange = useCallback((days: number) => {
    const to = endOfDay(new Date());
    const from = startOfDay(subDays(to, days));
    setDateRange({ from, to });
    setCalendarAnchor(null);
  }, []);

  /**
   * 履歴から比率を計算
   */
  const calculateRatios = useCallback(async () => {
    if (!user?.uid || !dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    setError(null);

    try {
      const db = getFirebaseFirestore();
      const firestoreService = new FirestoreServiceFacade(db);

      // Date型をyyyy-MM-dd文字列に変換
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');

      // 期間内のバッチを取得
      const batches = await firestoreService.getAllocationBatchesByDateRange(
        user.uid,
        startDate,
        endDate
      );

      // 各バッチの詳細を取得
      const allDetails: { storeAllocations: number[]; productName: string; origin: string; categoryCode?: string | null }[] = [];

      for (const batch of batches) {
        if (batch.id) {
          const details = await firestoreService.getAllocationDetails(user.uid, batch.id);
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
  }, [user?.uid, dateRange, filterType, currentProduct]);

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
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            参照期間
          </Typography>

          {/* プリセットボタン */}
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Chip
              icon={<Today />}
              label="過去7日間"
              onClick={() => setPresetRange(7)}
              color={dateRange?.from && dateRange?.to &&
                Math.abs(dateRange.to.getTime() - dateRange.from.getTime()) === 7 * 24 * 60 * 60 * 1000
                ? 'primary' : 'default'}
              variant={dateRange?.from && dateRange?.to &&
                Math.abs(dateRange.to.getTime() - dateRange.from.getTime()) === 7 * 24 * 60 * 60 * 1000
                ? 'filled' : 'outlined'}
            />
            <Chip
              icon={<DateRange />}
              label="過去14日間"
              onClick={() => setPresetRange(14)}
              color={dateRange?.from && dateRange?.to &&
                Math.abs(dateRange.to.getTime() - dateRange.from.getTime()) === 14 * 24 * 60 * 60 * 1000
                ? 'primary' : 'default'}
              variant={dateRange?.from && dateRange?.to &&
                Math.abs(dateRange.to.getTime() - dateRange.from.getTime()) === 14 * 24 * 60 * 60 * 1000
                ? 'filled' : 'outlined'}
            />
            <Chip
              icon={<CalendarMonth />}
              label="過去30日間"
              onClick={() => setPresetRange(30)}
              color={dateRange?.from && dateRange?.to &&
                Math.abs(dateRange.to.getTime() - dateRange.from.getTime()) === 30 * 24 * 60 * 60 * 1000
                ? 'primary' : 'default'}
              variant={dateRange?.from && dateRange?.to &&
                Math.abs(dateRange.to.getTime() - dateRange.from.getTime()) === 30 * 24 * 60 * 60 * 1000
                ? 'filled' : 'outlined'}
            />
          </Stack>

          {/* 期間表示とカレンダーボタン */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
            onClick={(e) => setCalendarAnchor(e.currentTarget as unknown as HTMLButtonElement)}
          >
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                選択中の期間
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {dateRange?.from && dateRange?.to
                  ? `${format(dateRange.from, 'yyyy年M月d日(E)', { locale: ja })} 〜 ${format(dateRange.to, 'yyyy年M月d日(E)', { locale: ja })}`
                  : '期間を選択してください'}
              </Typography>
            </Box>
            <CalendarMonth color="primary" />
          </Paper>

          {/* カレンダーポップオーバー */}
          <Popover
            open={Boolean(calendarAnchor)}
            anchorEl={calendarAnchor}
            onClose={() => setCalendarAnchor(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'center',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
            slotProps={{
              paper: {
                sx: {
                  zIndex: LAYER_Z_INDEX.SNACKBAR_OVERLAY, // Dialogより上に表示
                },
              },
            }}
          >
            <Box sx={{ p: 2 }}>
              <DayPicker
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                locale={ja}
                numberOfMonths={2}
                styles={{
                  caption: { fontWeight: 600 },
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                <Button size="small" onClick={() => setCalendarAnchor(null)}>
                  閉じる
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    setCalendarAnchor(null);
                    calculateRatios();
                  }}
                >
                  適用
                </Button>
              </Box>
            </Box>
          </Popover>
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
