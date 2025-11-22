import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { STORE_DATA } from '@/utils/constants';

/**
 * StoreStatisticsModalのProps
 */
interface StoreStatisticsModalProps {
  /** モーダルの開閉状態 */
  open: boolean;
  /** モーダルを閉じるハンドラ */
  onClose: () => void;
  /** フォームデータ */
  formData: OrderFormData;
}

/**
 * 店舗別統計情報
 */
interface StoreStatistics {
  storeCode: string;
  storeName: string;
  allocationQuantity: number;
  allocationAmount: number; // 配分金額（原価 × 数量）
  salesAmount: number; // 売上金額（売価 × 数量）
  grossProfit: number; // 粗利額（売上 - 原価）
  grossProfitMargin: number; // 値入率（粗利額 / 売上 × 100）
}

/**
 * 店舗別統計ダッシュボードモーダル
 *
 * 各店舗の配分金額、売上、粗利、値入率などを表示します。
 */
export const StoreStatisticsModal: React.FC<StoreStatisticsModalProps> = ({
  open,
  onClose,
  formData,
}) => {
  /**
   * 店舗別統計を計算
   */
  const storeStatistics = useMemo<StoreStatistics[]>(() => {
    const stats: Record<string, StoreStatistics> = {};

    // 各店舗を初期化
    STORE_DATA.forEach((store) => {
      stats[store.code] = {
        storeCode: store.code,
        storeName: store.name,
        allocationQuantity: 0,
        allocationAmount: 0,
        salesAmount: 0,
        grossProfit: 0,
        grossProfitMargin: 0,
      };
    });

    // 各商品の配分を集計
    formData.products.forEach((product) => {
      const storeCost = product.storeCost || 0;
      const priceExcludingTax = product.priceExcludingTax || 0;

      product.storeAllocations.forEach((quantity, index) => {
        if (quantity > 0) {
          const storeCode = STORE_DATA[index].code;
          const stat = stats[storeCode];

          stat.allocationQuantity += quantity;
          stat.allocationAmount += storeCost * quantity;
          stat.salesAmount += priceExcludingTax * quantity;
          stat.grossProfit += (priceExcludingTax - storeCost) * quantity;
        }
      });
    });

    // 値入率を計算
    Object.values(stats).forEach((stat) => {
      if (stat.salesAmount > 0) {
        stat.grossProfitMargin = (stat.grossProfit / stat.salesAmount) * 100;
      }
    });

    // 配分がある店舗のみを返す（店番でソート）
    return Object.values(stats)
      .filter((stat) => stat.allocationQuantity > 0)
      .sort((a, b) => a.storeCode.localeCompare(b.storeCode));
  }, [formData]);

  /**
   * 合計を計算
   */
  const totals = useMemo(() => {
    return storeStatistics.reduce(
      (acc, stat) => ({
        allocationQuantity: acc.allocationQuantity + stat.allocationQuantity,
        allocationAmount: acc.allocationAmount + stat.allocationAmount,
        salesAmount: acc.salesAmount + stat.salesAmount,
        grossProfit: acc.grossProfit + stat.grossProfit,
      }),
      {
        allocationQuantity: 0,
        allocationAmount: 0,
        salesAmount: 0,
        grossProfit: 0,
      }
    );
  }, [storeStatistics]);

  const totalGrossProfitMargin = totals.salesAmount > 0
    ? (totals.grossProfit / totals.salesAmount) * 100
    : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" fontWeight="700">
          店舗別統計ダッシュボード
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: 'primary.50' }}>店番</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: 'primary.50' }}>店舗名</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'primary.50' }}>配分数</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'primary.50' }}>配分金額<br />（原価）</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'primary.50' }}>売上金額<br />（売価）</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'primary.50' }}>粗利額</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'primary.50' }}>値入率</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {storeStatistics.map((stat) => (
                <TableRow key={stat.storeCode} hover>
                  <TableCell>{stat.storeCode}</TableCell>
                  <TableCell>{stat.storeName}</TableCell>
                  <TableCell align="right">{stat.allocationQuantity.toLocaleString()}</TableCell>
                  <TableCell align="right">¥{stat.allocationAmount.toLocaleString()}</TableCell>
                  <TableCell align="right">¥{stat.salesAmount.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>
                    ¥{stat.grossProfit.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'info.main', fontWeight: 600 }}>
                    {stat.grossProfitMargin.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
              {/* 合計行 */}
              <TableRow sx={{ bgcolor: 'grey.100', '& td': { fontWeight: 700, fontSize: '0.9rem' } }}>
                <TableCell colSpan={2}>合計</TableCell>
                <TableCell align="right">{totals.allocationQuantity.toLocaleString()}</TableCell>
                <TableCell align="right">¥{totals.allocationAmount.toLocaleString()}</TableCell>
                <TableCell align="right">¥{totals.salesAmount.toLocaleString()}</TableCell>
                <TableCell align="right" sx={{ color: 'success.main' }}>
                  ¥{totals.grossProfit.toLocaleString()}
                </TableCell>
                <TableCell align="right" sx={{ color: 'info.main' }}>
                  {totalGrossProfitMargin.toFixed(1)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* サマリー情報 */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" fontWeight="700" gutterBottom>
            統計サマリー
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                配分店舗数
              </Typography>
              <Typography variant="h6" fontWeight="700">
                {storeStatistics.length}店舗
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                総配分数
              </Typography>
              <Typography variant="h6" fontWeight="700">
                {totals.allocationQuantity.toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                総売上
              </Typography>
              <Typography variant="h6" fontWeight="700">
                ¥{totals.salesAmount.toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                総粗利額
              </Typography>
              <Typography variant="h6" fontWeight="700" color="success.main">
                ¥{totals.grossProfit.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
