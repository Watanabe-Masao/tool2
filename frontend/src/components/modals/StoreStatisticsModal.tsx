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
  ButtonGroup,
  Button,
  Chip,
} from '@mui/material';
import {
  Close,
  Store as StoreIcon,
  ShoppingCart as ProductIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
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
import { calculateEffectiveQuantityV2 } from '@/utils/unitConversion';

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
 * 商品別統計情報
 */
interface ProductStatistics {
  productIndex: number;
  productName: string;
  origin: string;
  specification: string;
  totalQuantity: number;
  salesAmount: number;
  costAmount: number;
  grossProfit: number;
  grossProfitMargin: number;
  [key: string]: string | number;
}

/**
 * カテゴリー別統計情報（店舗カテゴリ）
 */
interface CategoryStatistics {
  categoryName: string;
  storeCount: number;
  totalQuantity: number;
  salesAmount: number;
  costAmount: number;
  grossProfit: number;
  grossProfitMargin: number;
  [key: string]: string | number;
}

/**
 * 店舗別統計ダッシュボードモーダル
 *
 * 店舗別、商品別、カテゴリー別の分析ビューを提供します。
 */
// チャート用のカラーパレット
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

export const StoreStatisticsModal: React.FC<StoreStatisticsModalProps> = ({
  open,
  onClose,
  formData,
}) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<'store' | 'product' | 'category'>('store');

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

      // 1箱あたりの実効数量を計算（規格と入数から）
      const conversionResult = calculateEffectiveQuantityV2({
        specification: product.specification || '',
        specificationUnit: product.specificationUnit || '',
        quantityPerPackage: product.quantityPerPackage,
        packageUnit: product.packageUnit || '',
      });
      const effectiveQuantity = conversionResult.effectiveQuantity;

      // 1箱あたりの価格を計算
      const boxStoreCost = storeCost * effectiveQuantity;
      const boxPriceExcludingTax = priceExcludingTax * effectiveQuantity;

      product.storeAllocations.forEach((quantity, index) => {
        if (quantity > 0) {
          const storeCode = STORE_DATA[index].code;
          const stat = stats[storeCode];

          stat.allocationQuantity += quantity;
          stat.allocationAmount += boxStoreCost * quantity;
          stat.salesAmount += boxPriceExcludingTax * quantity;
          stat.grossProfit += (boxPriceExcludingTax - boxStoreCost) * quantity;
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

  /**
   * 商品別統計を計算
   */
  const productStatistics = useMemo<ProductStatistics[]>(() => {
    return formData.products.map((product, index) => {
      const totalQuantity = product.storeAllocations.reduce((sum, qty) => sum + qty, 0);
      const storeCost = product.storeCost || 0;
      const priceExcludingTax = product.priceExcludingTax || 0;

      // 1箱あたりの実効数量を計算（規格と入数から）
      const conversionResult = calculateEffectiveQuantityV2({
        specification: product.specification || '',
        specificationUnit: product.specificationUnit || '',
        quantityPerPackage: product.quantityPerPackage,
        packageUnit: product.packageUnit || '',
      });
      const effectiveQuantity = conversionResult.effectiveQuantity;

      // 1箱あたりの価格を計算
      const boxStoreCost = storeCost * effectiveQuantity;
      const boxPriceExcludingTax = priceExcludingTax * effectiveQuantity;

      const costAmount = boxStoreCost * totalQuantity;
      const salesAmount = boxPriceExcludingTax * totalQuantity;
      const grossProfit = salesAmount - costAmount;
      const grossProfitMargin = salesAmount > 0 ? (grossProfit / salesAmount) * 100 : 0;

      return {
        productIndex: index,
        productName: product.name || '未設定',
        origin: product.origin || '未設定',
        specification: product.specification || '未設定',
        totalQuantity,
        salesAmount,
        costAmount,
        grossProfit,
        grossProfitMargin,
      };
    }).filter((stat) => stat.totalQuantity > 0);
  }, [formData]);

  /**
   * カテゴリー別統計を計算（店舗カテゴリ別）
   */
  const categoryStatistics = useMemo<CategoryStatistics[]>(() => {
    // 簡易版：未分類のみを集計（実際の店舗カテゴリ機能は未実装のため）
    const stats: Record<string, CategoryStatistics> = {
      '全店舗': {
        categoryName: '全店舗',
        storeCount: 0,
        totalQuantity: 0,
        salesAmount: 0,
        costAmount: 0,
        grossProfit: 0,
        grossProfitMargin: 0,
      },
    };

    // 店舗別統計から集計
    storeStatistics.forEach((storeStat) => {
      const category = stats['全店舗'];
      category.storeCount += 1;
      category.totalQuantity += storeStat.allocationQuantity;
      category.salesAmount += storeStat.salesAmount;
      category.costAmount += storeStat.allocationAmount;
      category.grossProfit += storeStat.grossProfit;
    });

    // 値入率を計算
    Object.values(stats).forEach((stat) => {
      if (stat.salesAmount > 0) {
        stat.grossProfitMargin = (stat.grossProfit / stat.salesAmount) * 100;
      }
    });

    return Object.values(stats);
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
        sx={{ pb: 2 }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="700">
            統計ダッシュボード
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="ダッシュボードを閉じる">
            <Close />
          </IconButton>
        </Box>
        {/* ビューモード切り替え */}
        <ButtonGroup variant="outlined" size="small" fullWidth>
          <Button
            onClick={() => setViewMode('store')}
            variant={viewMode === 'store' ? 'contained' : 'outlined'}
            startIcon={<StoreIcon />}
          >
            店舗別分析
          </Button>
          <Button
            onClick={() => setViewMode('product')}
            variant={viewMode === 'product' ? 'contained' : 'outlined'}
            startIcon={<ProductIcon />}
          >
            商品別分析
          </Button>
          <Button
            onClick={() => setViewMode('category')}
            variant={viewMode === 'category' ? 'contained' : 'outlined'}
            startIcon={<CategoryIcon />}
          >
            カテゴリー別分析
          </Button>
        </ButtonGroup>
      </DialogTitle>
      <DialogContent dividers>
        {/* タブナビゲーション */}
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
          <Tab label="📊 データテーブル" />
          <Tab label="📈 ランキング" />
          <Tab label="📉 分布図" />
        </Tabs>

        {/* タブ1: データテーブル */}
        {activeTab === 0 && (
        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          {viewMode === 'store' && (
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
          )}
          {viewMode === 'product' && (
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: 'success.50' }}>商品番号</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: 'success.50' }}>産地</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: 'success.50' }}>商品名</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: 'success.50' }}>規格</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'success.50' }}>配分数</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'success.50' }}>売上金額</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'success.50' }}>粗利額</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'success.50' }}>値入率</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productStatistics.map((stat) => (
                  <TableRow key={stat.productIndex} hover>
                    <TableCell>
                      <Chip label={`#${stat.productIndex + 1}`} size="small" color="primary" />
                    </TableCell>
                    <TableCell>{stat.origin}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{stat.productName}</TableCell>
                    <TableCell>{stat.specification}</TableCell>
                    <TableCell align="right">{stat.totalQuantity.toLocaleString()}</TableCell>
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
                  <TableCell colSpan={4}>合計</TableCell>
                  <TableCell align="right">
                    {productStatistics.reduce((sum, s) => sum + s.totalQuantity, 0).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    ¥{productStatistics.reduce((sum, s) => sum + s.salesAmount, 0).toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'success.main' }}>
                    ¥{productStatistics.reduce((sum, s) => sum + s.grossProfit, 0).toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'info.main' }}>
                    {totalGrossProfitMargin.toFixed(1)}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
          {viewMode === 'category' && (
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: 'warning.50' }}>カテゴリ名</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'warning.50' }}>店舗数</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'warning.50' }}>配分数</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'warning.50' }}>売上金額</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'warning.50' }}>粗利額</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'warning.50' }}>値入率</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categoryStatistics.map((stat, index) => (
                  <TableRow key={index} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{stat.categoryName}</TableCell>
                    <TableCell align="right">{stat.storeCount}店舗</TableCell>
                    <TableCell align="right">{stat.totalQuantity.toLocaleString()}</TableCell>
                    <TableCell align="right">¥{stat.salesAmount.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>
                      ¥{stat.grossProfit.toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'info.main', fontWeight: 600 }}>
                      {stat.grossProfitMargin.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        )}

        {/* タブ2: ランキング（棒グラフ） */}
        {activeTab === 1 && (
          <Box>
            {viewMode === 'store' && (
              <>
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
              </>
            )}
            {viewMode === 'product' && (
              <>
                <Typography variant="subtitle1" fontWeight="700" gutterBottom>
                  商品別粗利額ランキング
                </Typography>
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart
                    data={[...productStatistics].sort((a, b) => b.grossProfit - a.grossProfit)}
                    layout="horizontal"
                    margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => `¥${value.toLocaleString()}`} />
                    <YAxis type="category" dataKey="productName" width={110} />
                    <Tooltip
                      formatter={(value: number) => [`¥${value.toLocaleString()}`]}
                      labelFormatter={(label) => label}
                    />
                    <Legend />
                    <Bar dataKey="grossProfit" name="粗利額" fill="#66bb6a" />
                    <Bar dataKey="salesAmount" name="売上金額" fill="#42a5f5" />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
            {viewMode === 'category' && (
              <>
                <Typography variant="subtitle1" fontWeight="700" gutterBottom>
                  カテゴリー別粗利額比較
                </Typography>
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart
                    data={[...categoryStatistics].sort((a, b) => b.grossProfit - a.grossProfit)}
                    layout="horizontal"
                    margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => `¥${value.toLocaleString()}`} />
                    <YAxis type="category" dataKey="categoryName" width={90} />
                    <Tooltip
                      formatter={(value: number) => [`¥${value.toLocaleString()}`]}
                    />
                    <Legend />
                    <Bar dataKey="grossProfit" name="粗利額" fill="#ff9800" />
                    <Bar dataKey="salesAmount" name="売上金額" fill="#5c6bc0" />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </Box>
        )}

        {/* タブ3: 分布図（円グラフ） */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {viewMode === 'store' && (
              <>
                <Typography variant="subtitle1" fontWeight="700" gutterBottom>
                  店舗別 値入率の分布
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
              </>
            )}
            {viewMode === 'product' && (
              <>
                <Typography variant="subtitle1" fontWeight="700" gutterBottom>
                  商品別 配分数の割合
                </Typography>
                <ResponsiveContainer width="100%" height={500}>
                  <PieChart>
                    <Pie
                      data={productStatistics}
                      dataKey="totalQuantity"
                      nameKey="productName"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      label={(entry: any) => `${entry.productName}: ${entry.totalQuantity} (${((entry.percent || 0) * 100).toFixed(1)}%)`}
                    >
                      {productStatistics.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value}個`, '配分数']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>

                <Box sx={{ mt: 3, width: '100%', maxWidth: 600 }}>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>商品名</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>配分数</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>割合</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {productStatistics.map((stat, index) => {
                          const totalQty = productStatistics.reduce((sum, s) => sum + s.totalQuantity, 0);
                          const percentage = (stat.totalQuantity / totalQty) * 100;
                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 16, height: 16, bgcolor: COLORS[index % COLORS.length], borderRadius: 0.5 }} />
                                  {stat.productName}
                                </Box>
                              </TableCell>
                              <TableCell align="right">{stat.totalQuantity.toLocaleString()}</TableCell>
                              <TableCell align="right">{percentage.toFixed(1)}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </>
            )}
            {viewMode === 'category' && (
              <>
                <Typography variant="subtitle1" fontWeight="700" gutterBottom>
                  カテゴリー別 売上金額の割合
                </Typography>
                <ResponsiveContainer width="100%" height={500}>
                  <PieChart>
                    <Pie
                      data={categoryStatistics}
                      dataKey="salesAmount"
                      nameKey="categoryName"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      label={(entry: any) => `${entry.categoryName}: ¥${entry.salesAmount.toLocaleString()} (${((entry.percent || 0) * 100).toFixed(1)}%)`}
                    >
                      {categoryStatistics.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`¥${value.toLocaleString()}`, '売上金額']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>

                <Box sx={{ mt: 3, width: '100%', maxWidth: 600 }}>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>カテゴリ名</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>売上金額</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>割合</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {categoryStatistics.map((stat, index) => {
                          const totalSales = categoryStatistics.reduce((sum, s) => sum + s.salesAmount, 0);
                          const percentage = (stat.salesAmount / totalSales) * 100;
                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 16, height: 16, bgcolor: COLORS[index % COLORS.length], borderRadius: 0.5 }} />
                                  {stat.categoryName}
                                </Box>
                              </TableCell>
                              <TableCell align="right">¥{stat.salesAmount.toLocaleString()}</TableCell>
                              <TableCell align="right">{percentage.toFixed(1)}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </>
            )}
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
