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
  Tabs,
  Tab,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
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
// チャート用のカラーパレット
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

export const StoreStatisticsModal: React.FC<StoreStatisticsModalProps> = ({
  open,
  onClose,
  formData,
}) => {
  const [activeTab, setActiveTab] = React.useState(0);

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

  /**
   * トップ10店舗（粗利額順）
   */
  const top10Stores = useMemo(() => {
    return [...storeStatistics]
      .sort((a, b) => b.grossProfit - a.grossProfit)
      .slice(0, 10);
  }, [storeStatistics]);

  /**
   * 値入率分布用データ
   */
  const marginDistribution = useMemo(() => {
    const ranges = [
      { name: '0-10%', min: 0, max: 10, count: 0 },
      { name: '10-20%', min: 10, max: 20, count: 0 },
      { name: '20-30%', min: 20, max: 30, count: 0 },
      { name: '30-40%', min: 30, max: 40, count: 0 },
      { name: '40%+', min: 40, max: 100, count: 0 },
    ];

    storeStatistics.forEach((stat) => {
      const range = ranges.find((r) => stat.grossProfitMargin >= r.min && stat.grossProfitMargin < r.max);
      if (range) range.count++;
    });

    return ranges.filter((r) => r.count > 0);
  }, [storeStatistics]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      aria-labelledby="store-statistics-dialog-title"
      aria-describedby="store-statistics-dialog-description"
    >
      <DialogTitle
        id="store-statistics-dialog-title"
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}
      >
        <Typography variant="h6" fontWeight="700">
          店舗別統計ダッシュボード
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="ダッシュボードを閉じる">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {/* タブナビゲーション */}
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
          <Tab label="📊 データテーブル" />
          <Tab label="📈 売上ランキング" />
          <Tab label="🥧 値入率分布" />
        </Tabs>

        {/* タブ1: データテーブル */}
        {activeTab === 0 && (
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
        )}

        {/* タブ2: 売上ランキング（棒グラフ） */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="subtitle1" fontWeight="700" gutterBottom>
              粗利額トップ10店舗
            </Typography>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={top10Stores} layout="horizontal" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `¥${value.toLocaleString()}`} />
                <YAxis type="category" dataKey="storeCode" width={80} />
                <Tooltip
                  formatter={(value: number) => [`¥${value.toLocaleString()}`, '粗利額']}
                  labelFormatter={(label) => `店番: ${label}`}
                />
                <Legend />
                <Bar dataKey="grossProfit" name="粗利額" fill="#82ca9d" />
                <Bar dataKey="salesAmount" name="売上金額" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* タブ3: 値入率分布（円グラフ） */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight="700" gutterBottom>
              値入率の分布
            </Typography>
            <ResponsiveContainer width="100%" height={500}>
              <PieChart>
                <Pie
                  data={marginDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  label={(entry: any) => `${entry.name}: ${entry.count}店舗 (${((entry.percent || 0) * 100).toFixed(1)}%)`}
                >
                  {marginDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}店舗`, '店舗数']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            {/* 分布詳細テーブル */}
            <Box sx={{ mt: 3, width: '100%', maxWidth: 600 }}>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>値入率範囲</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>店舗数</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>割合</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {marginDistribution.map((range, index) => {
                      const percentage = (range.count / storeStatistics.length) * 100;
                      return (
                        <TableRow key={range.name}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 16, height: 16, bgcolor: COLORS[index % COLORS.length], borderRadius: 0.5 }} />
                              {range.name}
                            </Box>
                          </TableCell>
                          <TableCell align="right">{range.count}店舗</TableCell>
                          <TableCell align="right">{percentage.toFixed(1)}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        )}

        {/* サマリー情報（全タブ共通） */}
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
