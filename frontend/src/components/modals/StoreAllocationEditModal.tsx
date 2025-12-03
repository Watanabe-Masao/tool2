import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  Divider,
  Grid,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close, Lock, LockOpen } from '@mui/icons-material';
import type { OrderFormData } from '@/schemas/orderSchema';
import { STORE_DATA } from '@/utils/constants';

/**
 * StoreAllocationEditModalのProps
 */
interface StoreAllocationEditModalProps {
  /** モーダル表示状態 */
  open: boolean;
  /** 閉じるハンドラ */
  onClose: () => void;
  /** フォームデータ */
  formData: OrderFormData;
  /** 編集対象の商品インデックス */
  productIndex: number;
  /** 配分数変更ハンドラ */
  onAllocationChange: (productIndex: number, storeIndex: number, value: number) => void;
  /** ロックされた店舗 */
  lockedStores: Set<string>;
  /** ロック状態変更ハンドラ */
  onToggleLock: (storeCode: string) => void;
}

/**
 * 店舗配分編集モーダル
 *
 * FloatingProgressSummaryのカードを長押しすると表示される
 * 36店舗すべての配分数を1画面で編集できる
 */
export const StoreAllocationEditModal: React.FC<StoreAllocationEditModalProps> = ({
  open,
  onClose,
  formData,
  productIndex,
  onAllocationChange,
  lockedStores,
  onToggleLock,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const product = formData.products[productIndex];

  // ローカル状態（編集中の値）
  const [localAllocations, setLocalAllocations] = useState<Record<string, number>>({});

  // モーダルが開いた時に現在の配分を読み込む
  React.useEffect(() => {
    if (open && product) {
      const allocations: Record<string, number> = {};
      STORE_DATA.forEach((store, index) => {
        allocations[store.code] = product.storeAllocations?.[index] || 0;
      });
      setLocalAllocations(allocations);
    }
  }, [open, product]);

  // 合計を計算
  const totalAllocated = Object.values(localAllocations).reduce((sum, val) => sum + val, 0);
  const difference = (product.totalDelivery ?? 0) - totalAllocated;

  // 値を変更
  const handleValueChange = (storeCode: string, value: number) => {
    setLocalAllocations(prev => ({
      ...prev,
      [storeCode]: Math.max(0, value),
    }));
  };

  // 適用して閉じる
  const handleApply = () => {
    STORE_DATA.forEach((store, index) => {
      const newValue = localAllocations[store.code] || 0;
      const currentValue = product.storeAllocations?.[index] || 0;
      if (newValue !== currentValue) {
        onAllocationChange(productIndex, index, newValue);
      }
    });
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          maxHeight: isMobile ? '100vh' : '90vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              店舗配分編集
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {product.name || '未入力'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {product.origin && `${product.origin} / `}
              {product.specification || ''}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      {/* 合計表示 */}
      <Box sx={{ px: 3, py: 2, bgcolor: 'background.default' }}>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary" display="block">
              配分合計
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {totalAllocated}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary" display="block">
              納品数
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {product.totalDelivery}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary" display="block">
              差異
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: difference === 0 ? 'success.main' : difference > 0 ? 'warning.main' : 'error.main',
              }}
            >
              {difference > 0 ? `+${difference}` : difference}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <Divider />

      <DialogContent sx={{ p: 2 }}>
        <Grid container spacing={isMobile ? 1.5 : 2}>
          {STORE_DATA.map((store) => {
            const isLocked = lockedStores.has(store.code);
            const value = localAllocations[store.code] || 0;

            return (
              <Grid item xs={6} sm={4} md={3} key={store.code}>
                <Box
                  sx={{
                    p: 1.5,
                    border: 1,
                    borderColor: isLocked ? 'warning.main' : 'grey.300',
                    borderRadius: 1,
                    bgcolor: isLocked ? 'warning.lighter' : value > 0 ? 'primary.lighter' : 'background.paper',
                    transition: 'all 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', lineHeight: 1.2 }}>
                        {store.code}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        {store.name}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => onToggleLock(store.code)}
                      sx={{ p: 0.5 }}
                    >
                      {isLocked ? (
                        <Lock sx={{ fontSize: '1rem', color: 'warning.main' }} />
                      ) : (
                        <LockOpen sx={{ fontSize: '1rem', color: 'action.active' }} />
                      )}
                    </IconButton>
                  </Box>
                  <TextField
                    type="number"
                    value={value || ''}
                    disabled={isLocked}
                    onChange={(e) => {
                      const newValue = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                      handleValueChange(store.code, newValue);
                    }}
                    variant="outlined"
                    size="small"
                    fullWidth
                    InputProps={{
                      sx: {
                        fontSize: isMobile ? '1rem' : '0.9rem',
                        fontWeight: 600,
                        textAlign: 'center',
                      },
                      inputProps: {
                        min: 0,
                        style: { textAlign: 'center' },
                      },
                    }}
                  />
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          キャンセル
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          color="primary"
          sx={{ minWidth: 100 }}
        >
          適用
        </Button>
      </DialogActions>
    </Dialog>
  );
};
