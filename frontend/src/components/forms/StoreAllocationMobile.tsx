import React, { useState, useMemo } from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  Box,
  Typography,
  TextField,
  Button,
  ButtonGroup,
  Chip,
  Stack,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Alert,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Close as CloseIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { STORE_DATA, STORE_COUNT } from '@/utils/constants';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * StoreAllocationMobileのProps
 */
interface StoreAllocationMobileProps {
  /** 商品のインデックス */
  productIndex: number;
  /** React Hook FormのControl */
  control: Control<OrderFormData>;
  /** エラー */
  errors: FieldErrors<OrderFormData>;
  /** 総納品数 */
  totalDelivery: number;
}

/**
 * 店舗配分入力（モバイル最適化版）
 *
 * 機能:
 * - 店舗検索による選択的入力
 * - クイック配分ボタン（均等配分、前回コピーなど）
 * - クイック数値入力ボタン（0, 1, 2, 3, 5, 10）
 * - 残り配分数のリアルタイム表示
 * - 配分済み店舗のチップ表示
 */
export const StoreAllocationMobile: React.FC<StoreAllocationMobileProps> = ({
  productIndex,
  control,
  errors,
  totalDelivery,
}) => {
  return (
    <Controller
      name={`products.${productIndex}.storeAllocations`}
      control={control}
      render={({ field }) => {
        const allocations = field.value || new Array(STORE_COUNT).fill(0);
        const onChange = field.onChange;

        return <StoreAllocationMobileContent
          allocations={allocations}
          onChange={onChange}
          totalDelivery={totalDelivery}
          errors={errors}
          productIndex={productIndex}
        />;
      }}
    />
  );
};

/**
 * StoreAllocationMobileContentのProps
 */
interface StoreAllocationMobileContentProps {
  allocations: number[];
  onChange: (allocations: number[]) => void;
  totalDelivery: number;
  errors: FieldErrors<OrderFormData>;
  productIndex: number;
}

/**
 * StoreAllocationMobileの内部コンテンツ
 */
const StoreAllocationMobileContent: React.FC<StoreAllocationMobileContentProps> = ({
  allocations,
  onChange,
  totalDelivery,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoreIndex, setSelectedStoreIndex] = useState<number | null>(null);

  /**
   * 合計配分数を計算
   */
  const totalAllocated = useMemo(
    () => allocations.reduce((sum, val) => sum + val, 0),
    [allocations]
  );

  /**
   * 残りの配分数を計算
   */
  const remaining = totalDelivery - totalAllocated;

  /**
   * 配分済み店舗を取得
   */
  const allocatedStores = useMemo(
    () =>
      STORE_DATA.map((store, index) => ({
        ...store,
        index,
        quantity: allocations[index] || 0,
      })).filter((store) => store.quantity > 0),
    [allocations]
  );

  /**
   * 検索フィルター
   */
  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return STORE_DATA.map((store, index) => ({ ...store, index })).filter(
      (store) =>
        store.name.toLowerCase().includes(query) ||
        store.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  /**
   * 配分数変更ハンドラー
   */
  const handleChangeAllocation = (index: number, value: number) => {
    const newAllocations = [...allocations];
    newAllocations[index] = Math.max(0, value);
    onChange(newAllocations);
  };

  /**
   * 店舗選択ハンドラー
   */
  const handleSelectStore = (index: number) => {
    setSelectedStoreIndex(index);
    setSearchQuery('');
  };

  /**
   * 配分削除ハンドラー
   */
  const handleRemoveAllocation = (index: number) => {
    handleChangeAllocation(index, 0);
    if (selectedStoreIndex === index) {
      setSelectedStoreIndex(null);
    }
  };

  /**
   * 均等配分
   */
  const handleEqualDistribution = () => {
    const perStore = Math.floor(totalDelivery / STORE_COUNT);
    const remainder = totalDelivery % STORE_COUNT;

    const newAllocations = new Array(STORE_COUNT).fill(perStore);
    // 余りを最初の店舗に追加
    if (remainder > 0) {
      newAllocations[0] += remainder;
    }

    onChange(newAllocations);
  };

  /**
   * 全クリア
   */
  const handleClearAll = () => {
    onChange(new Array(STORE_COUNT).fill(0));
    setSelectedStoreIndex(null);
  };

  /**
   * クイック入力ボタンの値
   */
  const quickValues = [0, 1, 2, 3, 5, 10];

  return (
    <Box>
      {/* ヘッダー */}
      <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
        店舗への配分数を入力
      </Typography>

      {/* 統計情報 */}
      <Card
        sx={{
          mb: 2,
          bgcolor: remaining === 0 ? 'success.light' : remaining < 0 ? 'error.light' : 'info.light',
        }}
      >
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" spacing={2} justifyContent="space-around">
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                総納品数
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {totalDelivery}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                配分済み
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {totalAllocated}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                残り
              </Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={remaining === 0 ? 'success.main' : remaining < 0 ? 'error.main' : 'primary.main'}
              >
                {remaining}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {remaining < 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          配分数が総納品数を超えています！ {Math.abs(remaining)} 個減らしてください。
        </Alert>
      )}

      {/* 一括操作ボタン */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleEqualDistribution}
          fullWidth
        >
          均等配分
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={handleClearAll}
          color="error"
          fullWidth
        >
          全クリア
        </Button>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      {/* 店舗検索 */}
      <TextField
        fullWidth
        placeholder="店舗を検索（店番または店舗名）"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 1.5 }}
      />

      {/* 検索結果 */}
      {filteredStores.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            検索結果 ({filteredStores.length}件)
          </Typography>
          <Stack spacing={0.5}>
            {filteredStores.map((store) => (
              <Button
                key={store.index}
                variant="outlined"
                onClick={() => handleSelectStore(store.index)}
                sx={{
                  justifyContent: 'space-between',
                  textAlign: 'left',
                }}
              >
                <Box>
                  <Typography variant="body2">
                    {store.code}: {store.name}
                  </Typography>
                </Box>
                {allocations[store.index] > 0 && (
                  <Chip label={`${allocations[store.index]}個`} size="small" color="primary" />
                )}
              </Button>
            ))}
          </Stack>
        </Box>
      )}

      {/* 選択中の店舗の入力 */}
      {selectedStoreIndex !== null && (
        <Card sx={{ mb: 2, bgcolor: 'primary.light' }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                {STORE_DATA[selectedStoreIndex].code}: {STORE_DATA[selectedStoreIndex].name}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setSelectedStoreIndex(null)}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {/* 数値入力 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <IconButton
                color="primary"
                onClick={() =>
                  handleChangeAllocation(
                    selectedStoreIndex,
                    allocations[selectedStoreIndex] - 1
                  )
                }
              >
                <RemoveIcon />
              </IconButton>

              <TextField
                type="number"
                value={allocations[selectedStoreIndex] || ''}
                onChange={(e) =>
                  handleChangeAllocation(selectedStoreIndex, parseInt(e.target.value) || 0)
                }
                inputProps={{
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  min: 0,
                  style: {
                    fontSize: '1.5rem',
                    textAlign: 'center',
                    padding: '12px',
                  },
                }}
                sx={{ flex: 1 }}
              />

              <IconButton
                color="primary"
                onClick={() =>
                  handleChangeAllocation(
                    selectedStoreIndex,
                    allocations[selectedStoreIndex] + 1
                  )
                }
              >
                <AddIcon />
              </IconButton>
            </Box>

            {/* クイック入力ボタン */}
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              クイック入力:
            </Typography>
            <ButtonGroup variant="outlined" size="small" fullWidth>
              {quickValues.map((value) => (
                <Button
                  key={value}
                  onClick={() => handleChangeAllocation(selectedStoreIndex, value)}
                >
                  {value}
                </Button>
              ))}
            </ButtonGroup>

            {/* 残り全部ボタン */}
            {remaining > 0 && (
              <Button
                variant="contained"
                fullWidth
                sx={{ mt: 1.5 }}
                onClick={() =>
                  handleChangeAllocation(
                    selectedStoreIndex,
                    allocations[selectedStoreIndex] + remaining
                  )
                }
              >
                残り全部 (+{remaining}個)
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 配分済み店舗一覧 */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          配分済み店舗 ({allocatedStores.length}店舗)
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {allocatedStores.map((store) => (
            <Chip
              key={store.index}
              label={`${store.code}: ${store.quantity}個`}
              onDelete={() => handleRemoveAllocation(store.index)}
              onClick={() => handleSelectStore(store.index)}
              color="primary"
              variant="filled"
              size="small"
              sx={{ mb: 0.5 }}
            />
          ))}
          {allocatedStores.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              まだ配分されていません
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
};
