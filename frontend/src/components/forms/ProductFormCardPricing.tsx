import React, { useState, useEffect, useRef } from 'react';
import { Controller, useWatch, useFormContext } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  Card,
  CardContent,
  TextField,
  Grid,
  Typography,
  Box,
  Button,
  Tooltip,
  IconButton,
  Popover,
  InputAdornment,
} from '@mui/material';
import { History, Calculate } from '@mui/icons-material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { usePricingHistory } from '@/hooks/usePricingHistory';
import type { PricingHistoryItem } from '@/hooks/usePricingHistory';
import { PricingHistoryModal } from '@/components/modals/PricingHistoryModal';
import { useNotification } from '@/context/NotificationContext';
import { calculateUnitPriceFromBoxPrice, checkUnitCompatibility } from '@/utils/unitConversion';
import { calculateProductMetrics } from '@/utils/productCalculations';
import { useSupplierPresets } from '@/hooks/useSupplierPresets';

/**
 * ProductFormCardPricingのProps
 */
interface ProductFormCardPricingProps {
  /** 商品のインデックス */
  index: number;
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** Enterキー押下時のハンドラー */
  onEnterPress?: () => void;
}

/**
 * 商品価格情報フォームカード
 *
 * 1つの商品の価格情報を入力するフォームです。
 * 原価（店原）と売価（本体価格）を入力します。
 */
export const ProductFormCardPricing: React.FC<ProductFormCardPricingProps> = ({
  index,
  control,
  errors,
  onEnterPress,
}) => {
  const productErrors = errors.products?.[index];
  const { setValue } = useFormContext<OrderFormData>();
  const { showSuccess } = useNotification();

  // 価格履歴の取得
  const {
    pricingHistory,
    findMatchingHistory,
    deletePricingHistory,
    savePricingHistory,
  } = usePricingHistory();

  // 帳合先プリセットの取得
  const { presets } = useSupplierPresets();

  // 価格履歴モーダルの開閉状態
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // 箱単価計算ヘルパーの状態
  const [calcAnchorEl, setCalcAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [boxPrice, setBoxPrice] = useState<string>('');
  const isCalcOpen = Boolean(calcAnchorEl);

  // 各フィールドを監視
  const supplier = useWatch({ control, name: `products.${index}.supplier` });
  const productName = useWatch({ control, name: `products.${index}.name` });
  const origin = useWatch({ control, name: `products.${index}.origin` });
  const specification = useWatch({ control, name: `products.${index}.specification` });
  const quantityPerPackage = useWatch({ control, name: `products.${index}.quantityPerPackage` });
  const unit = useWatch({ control, name: `products.${index}.unit` });
  const packageUnit = useWatch({ control, name: `products.${index}.packageUnit` });
  const centerCost = useWatch({ control, name: `products.${index}.centerCost` });
  const storeCost = useWatch({ control, name: `products.${index}.storeCost` });
  const priceExcludingTax = useWatch({ control, name: `products.${index}.priceExcludingTax` });
  const totalDelivery = useWatch({ control, name: `products.${index}.totalDelivery` }) || 0;
  const centerFeeRate = useWatch({ control, name: `products.${index}.centerFeeRate` }) ?? 13;

  // 最後に自動読み込みした商品の組み合わせを記録（無限ループ防止）
  const lastAutoLoadedKey = useRef<string | null>(null);
  // センターフィーが手動で変更されたかどうかを追跡
  const isCenterFeeManuallyChanged = useRef<boolean>(false);

  /**
   * 帳合先変更時にプリセットからセンターフィー率を自動設定
   */
  useEffect(() => {
    if (!supplier) return;

    // センターフィーが手動で変更されている場合はスキップ
    if (isCenterFeeManuallyChanged.current) return;

    // 一致するプリセットを検索
    const preset = presets.find((p) => p.supplier === supplier);
    if (preset && preset.centerFeeRate !== undefined) {
      // プリセットからセンターフィー率を設定
      setValue(`products.${index}.centerFeeRate`, preset.centerFeeRate, { shouldValidate: true });
    }
  }, [supplier, presets, setValue, index]);

  /**
   * 履歴がある場合、最新のものを自動読み込み
   */
  useEffect(() => {
    // 商品名、規格、入数がすべて入力されている場合のみ
    if (!productName || !specification || !quantityPerPackage) {
      return;
    }

    // 一致する履歴を取得
    const matchingHistory = findMatchingHistory(productName, specification, quantityPerPackage);
    if (matchingHistory.length === 0) {
      return;
    }

    // 現在の組み合わせのキーを生成
    const currentKey = `${productName}-${specification}-${quantityPerPackage}`;

    // すでに同じ組み合わせで自動読み込み済みの場合はスキップ
    if (lastAutoLoadedKey.current === currentKey) {
      return;
    }

    // 価格情報がすでに入力されている場合はスキップ（ユーザーが手動入力した可能性）
    if (centerCost || storeCost || priceExcludingTax) {
      return;
    }

    // 最新の履歴（配列の最初の要素）を自動読み込み
    const latestHistory = matchingHistory[0];
    setValue(`products.${index}.centerCost`, latestHistory.centerCost);
    setValue(`products.${index}.storeCost`, latestHistory.storeCost);
    setValue(`products.${index}.priceExcludingTax`, latestHistory.priceExcludingTax);
    setValue(`products.${index}.unit`, latestHistory.unit);
    setValue(`products.${index}.packageUnit`, latestHistory.packageUnit);
    if (latestHistory.centerFeeRate !== undefined) {
      setValue(`products.${index}.centerFeeRate`, latestHistory.centerFeeRate);
    }

    // 自動読み込み済みとして記録
    lastAutoLoadedKey.current = currentKey;

    console.log(`[ProductFormCardPricing] Auto-loaded latest pricing history for ${productName} (${specification})`);
  }, [productName, specification, quantityPerPackage, findMatchingHistory, centerCost, storeCost, priceExcludingTax, setValue, index]);

  // 共通の計算関数を使用（ProductPricingFormと同じロジック）
  const metrics = React.useMemo(() => {
    const product = {
      centerCost,
      centerFeeRate,
      storeCost,
      priceExcludingTax,
      totalDelivery,
      quantityPerPackage,
      packageUnit,
      unit,
    } as any; // OrderFormData['products'][number]型にキャスト
    return calculateProductMetrics(product);
  }, [centerCost, centerFeeRate, storeCost, priceExcludingTax, totalDelivery, quantityPerPackage, packageUnit, unit]);

  // 個別の値を取り出す
  const centerCostWithFee = metrics.centerCostWithFee;
  const effectiveQuantity = metrics.effectiveQuantity;
  const profitAmount = metrics.profitAmount;

  // 値入率を計算（(売価 - 店着原価) / 売価 × 100）
  const profitMargin = priceExcludingTax && storeCost
    ? ((priceExcludingTax - storeCost) / priceExcludingTax * 100).toFixed(1)
    : '0.0';

  /**
   * 価格履歴を選択
   */
  const handleSelectHistory = (history: PricingHistoryItem) => {
    setValue(`products.${index}.centerCost`, history.centerCost);
    setValue(`products.${index}.storeCost`, history.storeCost);
    setValue(`products.${index}.priceExcludingTax`, history.priceExcludingTax);
    setValue(`products.${index}.unit`, history.unit);
    setValue(`products.${index}.packageUnit`, history.packageUnit);
    if (history.centerFeeRate !== undefined) {
      setValue(`products.${index}.centerFeeRate`, history.centerFeeRate);
    }
    showSuccess('価格履歴を読み込みました');
  };

  /**
   * 現在の価格情報を手動で保存
   */
  const handleSaveHistory = async () => {
    if (!productName || !specification || !quantityPerPackage || !unit) {
      showSuccess('商品名、規格、入数を入力してください');
      return;
    }

    if (!centerCost || !storeCost || !priceExcludingTax) {
      showSuccess('原価と売価を入力してください');
      return;
    }

    try {
      await savePricingHistory(
        productName,
        specification,
        quantityPerPackage,
        unit,
        packageUnit || '',
        centerCost,
        storeCost,
        priceExcludingTax,
        centerFeeRate
      );
      showSuccess('価格履歴を保存しました');
    } catch (error) {
      console.error('[ProductFormCardPricing] Failed to save pricing history:', error);
    }
  };

  /**
   * 一致する履歴の数を取得
   */
  const matchingHistoryCount =
    productName && specification && quantityPerPackage
      ? findMatchingHistory(productName, specification, quantityPerPackage).length
      : 0;

  /**
   * Enterキー押下時のハンドラー
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnterPress && e.target instanceof HTMLInputElement) {
      if (e.target.type !== 'textarea') {
        e.preventDefault();
        onEnterPress();
      }
    }
  };

  /**
   * 箱単価計算ポップオーバーを開く
   */
  const handleCalcOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setCalcAnchorEl(event.currentTarget);
    setBoxPrice('');
  };

  /**
   * 箱単価計算ポップオーバーを閉じる
   */
  const handleCalcClose = () => {
    setCalcAnchorEl(null);
    setBoxPrice('');
  };

  /**
   * 単位互換性チェック
   */
  const unitCompatibility = checkUnitCompatibility(fullUnit, packageUnit || '');

  /**
   * 箱単価から単位単価を計算
   */
  const boxPriceValue = boxPrice ? parseFloat(boxPrice) : 0;
  const calculationResult = calculateUnitPriceFromBoxPrice({
    boxPrice: boxPriceValue,
    quantityPerPackage,
    packageUnit: packageUnit || '',
    unit: fullUnit,
  });

  /**
   * 計算結果をセンター着原価に適用
   */
  const handleApplyCalculation = () => {
    if (calculationResult.isValid) {
      setValue(`products.${index}.centerCost`, calculationResult.unitPrice);
      showSuccess(`センター着原価に${calculationResult.unitPrice}円を設定しました`);
      handleCalcClose();
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }} onKeyDown={handleKeyDown}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* 1. 商品名のチップ表示: （産地）（商品名）（規格）（入数＋単位） */}
        <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.3, alignItems: 'center' }}>
          <Typography variant="subtitle2" fontWeight="medium" sx={{ mr: 0.5 }}>
            商品 {index + 1}:
          </Typography>
          {origin && (
            <Box
              component="span"
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'grey.200',
                color: 'text.primary',
                fontSize: '0.75rem',
              }}
            >
              {origin}
            </Box>
          )}
          {productName && (
            <Box
              component="span"
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'grey.200',
                color: 'text.primary',
                fontSize: '0.75rem',
              }}
            >
              {productName}
            </Box>
          )}
          {specification && (
            <Box
              component="span"
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'grey.200',
                color: 'text.primary',
                fontSize: '0.75rem',
              }}
            >
              {specification}{unit ? ` ${unit}` : ''}
            </Box>
          )}
          {quantityPerPackage && (
            <Box
              component="span"
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'grey.200',
                color: 'text.primary',
                fontSize: '0.75rem',
              }}
            >
              {quantityPerPackage}{packageUnit}
            </Box>
          )}
          {/* 単位変換表示 */}
          {unitConversionResult.isConverted && (
            <Box
              component="span"
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                bgcolor: 'info.light',
                color: 'info.contrastText',
                fontSize: '0.7rem',
                fontWeight: 500,
              }}
            >
              → {effectiveQuantity}単位
            </Box>
          )}
        </Box>

        {/* 価格履歴ボタン */}
        <Box sx={{ mb: 1.5, display: 'flex', gap: 1 }}>
          <Tooltip
            title={
              matchingHistoryCount > 0
                ? `この商品の価格履歴が${matchingHistoryCount}件あります`
                : '価格履歴から読み込む'
            }
          >
            <Button
              size="small"
              variant="outlined"
              startIcon={<History />}
              onClick={() => setHistoryModalOpen(true)}
              sx={{ fontSize: '0.75rem' }}
            >
              履歴から読込 {matchingHistoryCount > 0 && `(${matchingHistoryCount})`}
            </Button>
          </Tooltip>
          <Tooltip title="現在の価格情報を履歴として保存">
            <Button
              size="small"
              variant="outlined"
              onClick={handleSaveHistory}
              disabled={
                !productName ||
                !specification ||
                !quantityPerPackage ||
                !centerCost ||
                !storeCost ||
                !priceExcludingTax
              }
              sx={{ fontSize: '0.75rem' }}
            >
              履歴に保存
            </Button>
          </Tooltip>
        </Box>

        {/* 2. 総納品数 / センターフィー率 */}
        <Grid container spacing={1} sx={{ mb: 1.5 }}>
          <Grid item xs={6}>
            <Controller
              name={`products.${index}.totalDelivery`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="総納品数"
                  placeholder="例: 100"
                  size="small"
                  fullWidth
                  error={!!productErrors?.totalDelivery}
                  helperText={productErrors?.totalDelivery?.message}
                  required
                  inputProps={{ min: 1, step: 1 }}
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseInt(value, 10) : 0);
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="センターフィー（%）"
              value={centerFeeRate ? `${centerFeeRate}%` : '-'}
              size="small"
              fullWidth
              InputProps={{
                readOnly: true,
              }}
              sx={{
                '& .MuiInputBase-input': {
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'grey.100',
                  fontWeight: 'medium',
                  color: (theme) => theme.palette.mode === 'dark' ? 'grey.400' : 'text.secondary',
                },
              }}
            />
          </Grid>
        </Grid>

        {/* 3. センター着原価 / センターフィー込原価 */}
        <Grid container spacing={1} sx={{ mb: 1.5 }}>
          <Grid item xs={6}>
            <Controller
              name={`products.${index}.centerCost`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="センター着原価"
                  placeholder="例: 500"
                  size="small"
                  fullWidth
                  error={!!productErrors?.centerCost}
                  helperText={productErrors?.centerCost?.message}
                  required
                  inputProps={{ min: 0, step: 1 }}
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseFloat(value) : 0);
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="箱単価から計算">
                          <IconButton
                            size="small"
                            onClick={handleCalcOpen}
                            sx={{ p: 0.25 }}
                          >
                            <Calculate fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="センターフィー込原価"
              value={centerCostWithFee ? `¥${centerCostWithFee.toLocaleString()}` : '-'}
              size="small"
              fullWidth
              InputProps={{
                readOnly: true,
              }}
              sx={{
                '& .MuiInputBase-input': {
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'grey.100',
                  fontWeight: 'medium',
                  color: (theme) => theme.palette.mode === 'dark' ? 'grey.400' : 'text.secondary',
                },
              }}
            />
          </Grid>
        </Grid>

        {/* 4. 店着原価 / 差益 */}
        <Grid container spacing={1} sx={{ mb: 1.5 }}>
          <Grid item xs={6}>
            <Controller
              name={`products.${index}.storeCost`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="店原（原価）"
                  placeholder="例: 600"
                  size="small"
                  fullWidth
                  error={!!productErrors?.storeCost}
                  helperText={productErrors?.storeCost?.message}
                  required
                  inputProps={{ min: 0, step: 1 }}
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseFloat(value) : 0);
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="差益（全体）"
              value={profitAmount ? `¥${profitAmount.toLocaleString()}` : '-'}
              size="small"
              fullWidth
              InputProps={{
                readOnly: true,
              }}
              sx={{
                '& .MuiInputBase-input': {
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'grey.100',
                  color: profitAmount < 0
                    ? 'error.main'
                    : (theme) => theme.palette.mode === 'dark' ? 'grey.400' : 'text.secondary',
                  fontWeight: 'medium',
                },
              }}
            />
          </Grid>
        </Grid>

        {/* 5. 本体価格 / 値入率 */}
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Controller
              name={`products.${index}.priceExcludingTax`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="本体価格（税抜・売価）"
                  placeholder="例: 1000"
                  size="small"
                  fullWidth
                  error={!!productErrors?.priceExcludingTax}
                  helperText={productErrors?.priceExcludingTax?.message}
                  required
                  inputProps={{ min: 0, step: 1 }}
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseFloat(value) : 0);
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="値入率"
              value={`${profitMargin}%`}
              size="small"
              fullWidth
              InputProps={{
                readOnly: true,
              }}
              sx={{
                '& .MuiInputBase-input': {
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'grey.100',
                  fontWeight: 'medium',
                  color: (theme) => theme.palette.mode === 'dark' ? 'grey.400' : 'text.secondary',
                },
              }}
            />
          </Grid>
        </Grid>

        {/* カード下部：単位あたり・箱あたりの情報 */}
        {(centerCostWithFee || storeCost) && (
          <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'grey.300' }}>
            {/* 単位あたりの情報 */}
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold', color: 'text.secondary' }}>
              {fullUnit ? `${fullUnit}の情報` : '1単位あたりの情報'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
              {centerCostWithFee > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block' }}>
                    センターフィー込原価
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    ¥{centerCostWithFee.toLocaleString()}
                  </Typography>
                </Box>
              )}
              {storeCost > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block' }}>
                    店着原価
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    ¥{storeCost.toLocaleString()}
                  </Typography>
                </Box>
              )}
              {centerCostWithFee > 0 && storeCost > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block' }}>
                    差益
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 'medium',
                      color: (storeCost - centerCostWithFee) < 0 ? 'error.main' : 'text.primary'
                    }}
                  >
                    ¥{(storeCost - centerCostWithFee).toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* 1箱あたりの情報 */}
            {effectiveQuantity > 1 && (
              <>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold', color: 'text.secondary' }}>
                  1箱あたりの情報（{effectiveQuantity}単位）
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {centerCostWithFee > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block' }}>
                        センターフィー込原価
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        ¥{(centerCostWithFee * effectiveQuantity).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  {storeCost > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block' }}>
                        店着原価
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        ¥{(storeCost * effectiveQuantity).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  {centerCostWithFee > 0 && storeCost > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block' }}>
                        差益
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 'medium',
                          color: (storeCost - centerCostWithFee) < 0 ? 'error.main' : 'text.primary'
                        }}
                      >
                        ¥{((storeCost - centerCostWithFee) * effectiveQuantity).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Box>
        )}
      </CardContent>

      {/* 価格履歴選択モーダル */}
      <PricingHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        onSelect={handleSelectHistory}
        onDelete={deletePricingHistory}
        histories={pricingHistory}
        productName={productName}
        specification={specification}
        quantityPerPackage={quantityPerPackage ?? undefined}
      />

      {/* 箱単価から計算ポップオーバー */}
      <Popover
        open={isCalcOpen}
        anchorEl={calcAnchorEl}
        onClose={handleCalcClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2, width: 280 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
            箱単価から単位単価を計算
          </Typography>

          {/* 商品情報表示 */}
          <Box
            sx={{
              mb: 1.5,
              p: 1,
              bgcolor: unitCompatibility.isCompatible
                ? (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'grey.100'
                : 'error.light',
              borderRadius: 1
            }}
          >
            <Typography variant="caption" sx={{ color: unitCompatibility.isCompatible ? 'text.secondary' : 'error.dark', display: 'block' }}>
              規格: {unit || '未設定'}
            </Typography>
            <Typography variant="caption" sx={{ color: unitCompatibility.isCompatible ? 'text.secondary' : 'error.dark', display: 'block' }}>
              入数: {quantityPerPackage ? `${quantityPerPackage}${packageUnit || ''}` : '未設定'}
            </Typography>
            {!unitCompatibility.isCompatible && (
              <Typography variant="caption" sx={{ color: 'error.dark', fontWeight: 'medium', display: 'block', mt: 0.5 }}>
                ⚠ {unitCompatibility.warningMessage}
              </Typography>
            )}
            {unitCompatibility.isCompatible && unitConversionResult.isConverted && (
              <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 'medium', display: 'block' }}>
                → {effectiveQuantity}単位として計算
              </Typography>
            )}
          </Box>

          {/* 箱単価入力 */}
          <TextField
            label="箱単価（1箱あたり）"
            type="number"
            size="small"
            fullWidth
            value={boxPrice}
            onChange={(e) => setBoxPrice(e.target.value)}
            placeholder="例: 2500"
            inputProps={{ min: 0, step: 1 }}
            sx={{ mb: 1.5 }}
            autoFocus
            disabled={!unitCompatibility.isCompatible || !quantityPerPackage}
          />

          {/* 計算結果表示 */}
          {boxPrice && (
            <Box sx={{ mb: 1.5, p: 1, bgcolor: calculationResult.isValid ? 'success.light' : 'warning.light', borderRadius: 1 }}>
              {calculationResult.isValid ? (
                <>
                  <Typography variant="caption" sx={{ color: 'success.dark', display: 'block' }}>
                    {calculationResult.conversionDescription}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                    単位単価: ¥{calculationResult.unitPrice.toLocaleString()}
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" sx={{ color: 'warning.dark' }}>
                  {calculationResult.errorMessage}
                </Typography>
              )}
            </Box>
          )}

          {/* ボタン */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              fullWidth
              onClick={handleApplyCalculation}
              disabled={!calculationResult.isValid}
            >
              適用
            </Button>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={handleCalcClose}
            >
              キャンセル
            </Button>
          </Box>
        </Box>
      </Popover>
    </Card>
  );
};
