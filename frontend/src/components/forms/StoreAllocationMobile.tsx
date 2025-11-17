import React, { useState, useMemo, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Stack,
  Card,
  CardContent,
  Alert,
  Divider,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
} from '@mui/material';
import { STORE_DATA, STORE_COUNT } from '@/utils/constants';
import type { OrderFormData } from '@/schemas/orderSchema';
import { StoreSettingsService } from '@/services/firebase/storeSettingsService';
import { useAuthContext } from '@/context/AuthContext';
import type { StoreSettings } from '@/types/storeSettings';

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
 * 店舗配分入力（モバイル最適化版・チェックボックス方式）
 *
 * 機能:
 * - 店舗設定で有効にした店舗のみ表示
 * - チェックボックスで配分する店舗を選択
 * - 選択した店舗の入力フィールドのみ表示
 * - 残り配分数のリアルタイム表示
 */
export const StoreAllocationMobile: React.FC<StoreAllocationMobileProps> = ({
  productIndex,
  control,
  errors,
  totalDelivery,
}) => {
  const { user } = useAuthContext();
  const [storeSettings, setStoreSettings] = useState<Record<string, StoreSettings>>({});
  const [loading, setLoading] = useState(true);

  // 店舗設定を読み込み
  useEffect(() => {
    const loadStoreSettings = async () => {
      if (!user) return;

      try {
        const data = await StoreSettingsService.getAll(user.uid);
        const settingsMap: Record<string, StoreSettings> = {};
        data.forEach((setting) => {
          settingsMap[setting.storeCode] = setting;
        });
        setStoreSettings(settingsMap);
      } catch (error) {
        console.error('Error loading store settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStoreSettings();
  }, [user]);

  // 有効な店舗のみフィルタ
  const enabledStores = useMemo(() => {
    return STORE_DATA.filter((store) => {
      const setting = storeSettings[store.code];
      return setting?.enabled ?? true; // デフォルトは有効
    });
  }, [storeSettings]);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">店舗設定を読み込んでいます...</Alert>
      </Box>
    );
  }

  return (
    <Controller
      name={`products.${productIndex}.storeAllocations`}
      control={control}
      render={({ field }) => {
        const allocations = field.value || new Array(STORE_COUNT).fill(0);
        const onChange = field.onChange;

        return (
          <StoreAllocationMobileContent
            allocations={allocations}
            onChange={onChange}
            totalDelivery={totalDelivery}
            errors={errors}
            productIndex={productIndex}
            enabledStores={enabledStores}
          />
        );
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
  enabledStores: typeof STORE_DATA;
}

/**
 * StoreAllocationMobileの内部コンテンツ
 */
const StoreAllocationMobileContent: React.FC<StoreAllocationMobileContentProps> = ({
  allocations,
  onChange,
  totalDelivery,
  enabledStores,
}) => {
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());

  // 初期選択状態を設定（配分数が0より大きい店舗）
  useEffect(() => {
    const initialSelected = new Set<string>();
    STORE_DATA.forEach((store, index) => {
      if (allocations[index] > 0) {
        initialSelected.add(store.code);
      }
    });
    setSelectedStores(initialSelected);
  }, []); // 初回のみ実行

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
   * 選択した店舗のリスト
   */
  const selectedStoresList = useMemo(() => {
    return enabledStores.filter((store) => selectedStores.has(store.code));
  }, [enabledStores, selectedStores]);

  /**
   * 配分数変更ハンドラー
   */
  const handleChangeAllocation = (storeCode: string, value: number) => {
    const storeIndex = STORE_DATA.findIndex((s) => s.code === storeCode);
    if (storeIndex === -1) return;

    const newAllocations = [...allocations];
    newAllocations[storeIndex] = Math.max(0, value);
    onChange(newAllocations);
  };

  /**
   * 店舗選択トグル
   */
  const handleToggleStore = (storeCode: string) => {
    const newSelected = new Set(selectedStores);
    if (newSelected.has(storeCode)) {
      newSelected.delete(storeCode);
      // 選択解除時は配分数を0にする
      handleChangeAllocation(storeCode, 0);
    } else {
      newSelected.add(storeCode);
    }
    setSelectedStores(newSelected);
  };

  /**
   * 均等配分（選択した店舗のみ）
   */
  const handleEqualDistribution = () => {
    if (selectedStores.size === 0) return;

    const perStore = Math.floor(totalDelivery / selectedStores.size);
    const remainder = totalDelivery % selectedStores.size;

    const newAllocations = [...allocations];
    let remainderDistributed = 0;

    STORE_DATA.forEach((store, index) => {
      if (selectedStores.has(store.code)) {
        newAllocations[index] = perStore;
        if (remainderDistributed < remainder) {
          newAllocations[index] += 1;
          remainderDistributed++;
        }
      } else {
        newAllocations[index] = 0;
      }
    });

    onChange(newAllocations);
  };

  /**
   * 全クリア
   */
  const handleClearAll = () => {
    onChange(new Array(STORE_COUNT).fill(0));
    setSelectedStores(new Set());
  };

  /**
   * 全店舗選択
   */
  const handleSelectAll = () => {
    const allCodes = new Set(enabledStores.map((s) => s.code));
    setSelectedStores(allCodes);
  };

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
        <Button variant="outlined" size="small" onClick={handleSelectAll} fullWidth>
          全選択
        </Button>
        <Button variant="outlined" size="small" onClick={handleEqualDistribution} fullWidth disabled={selectedStores.size === 0}>
          均等配分
        </Button>
        <Button variant="outlined" size="small" onClick={handleClearAll} color="error" fullWidth>
          全クリア
        </Button>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      {/* 店舗選択チェックボックス */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            配分する店舗を選択 ({selectedStores.size}/{enabledStores.length})
          </Typography>
          <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
            {enabledStores.map((store) => {
              const storeIndex = STORE_DATA.findIndex((s) => s.code === store.code);
              const quantity = allocations[storeIndex] || 0;

              return (
                <FormControlLabel
                  key={store.code}
                  control={
                    <Checkbox
                      checked={selectedStores.has(store.code)}
                      onChange={() => handleToggleStore(store.code)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <Typography variant="body2">
                        {store.code}: {store.name}
                      </Typography>
                      {quantity > 0 && (
                        <Chip label={`${quantity}個`} size="small" color="primary" sx={{ ml: 1 }} />
                      )}
                    </Box>
                  }
                  sx={{ width: '100%', m: 0 }}
                />
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* 選択した店舗の入力フィールド */}
      {selectedStoresList.length > 0 && (
        <>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            配分数を入力 ({selectedStoresList.length}店舗)
          </Typography>
          <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
            {selectedStoresList.map((store) => {
              const storeIndex = STORE_DATA.findIndex((s) => s.code === store.code);
              const quantity = allocations[storeIndex] || 0;

              return (
                <ListItem
                  key={store.code}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {store.code}: {store.name}
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={quantity}
                    onChange={(e) => handleChangeAllocation(store.code, parseInt(e.target.value) || 0)}
                    inputProps={{
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                      min: 0,
                      style: { textAlign: 'right' },
                    }}
                    sx={{ width: 80 }}
                  />
                </ListItem>
              );
            })}
          </List>
        </>
      )}

      {selectedStoresList.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          配分する店舗を選択してください
        </Alert>
      )}
    </Box>
  );
};
