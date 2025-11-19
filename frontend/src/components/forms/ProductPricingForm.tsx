import React from 'react';
import { useWatch } from 'react-hook-form';
import type { Control, FieldErrors, FieldArrayWithId } from 'react-hook-form';
import { Box, Typography, Alert, Card, CardContent, Grid } from '@mui/material';
import { ProductFormCardPricing } from './ProductFormCardPricing';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * ProductPricingFormのProps
 */
interface ProductPricingFormProps {
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** Enterキー押下時のハンドラー */
  onEnterPress?: () => void;
  /** 商品フィールド配列 */
  fields: FieldArrayWithId<OrderFormData, 'products', 'id'>[];
}

/**
 * Step 4: 商品価格情報フォーム
 *
 * 商品の価格情報（原価、売価）を入力します。
 */
export const ProductPricingForm: React.FC<ProductPricingFormProps> = ({
  control,
  errors,
  onEnterPress,
  fields,
}) => {

  // 全商品のデータを監視
  const products = useWatch({ control, name: 'products' }) || [];

  // 全体の集計を計算
  const summary = React.useMemo(() => {
    let totalCenterCost = 0;
    let totalCenterCostWithFee = 0;
    let totalStoreCost = 0;
    let totalSellingPrice = 0;
    let totalProfit = 0;

    products.forEach((product) => {
      const centerCost = product.centerCost || 0;
      const centerFeeRate = product.centerFeeRate || 13;
      const storeCost = product.storeCost || 0;
      const sellingPrice = product.priceExcludingTax || 0;
      const quantityPerPackage = product.quantityPerPackage || 0;
      const totalDelivery = product.totalDelivery || 0;

      const centerCostWithFee = Math.round(centerCost * (1 + centerFeeRate / 100));
      const quantity = totalDelivery * quantityPerPackage;

      totalCenterCost += centerCost * quantity;
      totalCenterCostWithFee += centerCostWithFee * quantity;
      totalStoreCost += storeCost * quantity;
      totalSellingPrice += sellingPrice * quantity;
      totalProfit += (storeCost - centerCostWithFee) * quantity;
    });

    const averageProfitMargin = totalSellingPrice > 0
      ? ((totalSellingPrice - totalCenterCostWithFee) / totalSellingPrice * 100).toFixed(1)
      : '0.0';

    return {
      totalCenterCost,
      totalCenterCostWithFee,
      totalStoreCost,
      totalSellingPrice,
      totalProfit,
      averageProfitMargin,
    };
  }, [products]);

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
        商品情報2（価格）を入力してください（{fields.length}件の商品）
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        各商品の原価と売価、総納品数を入力してください。
      </Typography>

      {/* エラー表示 */}
      {errors.products && typeof errors.products.message === 'string' && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {errors.products.message}
        </Alert>
      )}

      {/* 商品リスト */}
      {fields.map((field, index) => (
        <ProductFormCardPricing
          key={field.id}
          index={index}
          control={control}
          errors={errors}
          onEnterPress={onEnterPress}
        />
      ))}

      {/* 全体集計サマリー */}
      {fields.length > 0 && (
        <Card variant="outlined" sx={{ mt: 2, bgcolor: 'primary.50', borderColor: 'primary.main', borderWidth: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: 'primary.main' }}>
              全体集計
            </Typography>

            <Grid container spacing={2}>
              {/* 1行目: 総原価 / 総売価 */}
              <Grid item xs={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    総原価（センター着）
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    ¥{summary.totalCenterCost.toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    総売価
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    ¥{summary.totalSellingPrice.toLocaleString()}
                  </Typography>
                </Box>
              </Grid>

              {/* 2行目: センターフィー込総原価 / 店着総原価 */}
              <Grid item xs={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    総原価（センターフィー込）
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    ¥{summary.totalCenterCostWithFee.toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    総原価（店着）
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    ¥{summary.totalStoreCost.toLocaleString()}
                  </Typography>
                </Box>
              </Grid>

              {/* 3行目: 全体差益 / 平均値入率 */}
              <Grid item xs={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    全体差益
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    ¥{summary.totalProfit.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    (店着原価 - センターフィー込原価) の合計
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    平均値入率
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="info.main">
                    {summary.averageProfitMargin}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    (総売価 - センターフィー込総原価) / 総売価
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
