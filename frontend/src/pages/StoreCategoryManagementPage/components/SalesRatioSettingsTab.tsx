/**
 * 販売構成比設定タブ
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Checkbox,
  Grid,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Popover,
  FormControlLabel,
  FormGroup,
  IconButton,
  Chip,
} from '@mui/material';
import { FilterList as FilterListIcon } from '@mui/icons-material';
import { STORE_DATA } from '@/utils/constants';
import type { StoreCategory } from '@/types/storeCategory';
import type { StoreSettings } from '@/types/storeSettings';

interface SalesRatioSettingsTabProps {
  storeSettings: Record<string, StoreSettings>;
  categories: StoreCategory[];
  selectedCategoryFilter: string[];
  onSettingChange: (storeCode: string, field: 'salesRatio' | 'enabled', value: number | boolean) => void;
  onSave: () => Promise<void>;
  onCategoryFilterChange: (categoryId: string) => void;
  onClearCategoryFilter: () => void;
  onLoadCategories: () => void;
}

export const SalesRatioSettingsTab: React.FC<SalesRatioSettingsTabProps> = ({
  storeSettings,
  categories,
  selectedCategoryFilter,
  onSettingChange,
  onSave,
  onCategoryFilterChange,
  onClearCategoryFilter,
  onLoadCategories,
}) => {
  const [categoryFilterAnchorEl, setCategoryFilterAnchorEl] = useState<null | HTMLElement>(null);

  // 販売構成比設定タブで表示する店舗をフィルター
  const getFilteredStoresForSettings = () => {
    if (selectedCategoryFilter.length === 0) {
      return STORE_DATA;
    }

    const filteredStoreIds = new Set<string>();
    categories.forEach((category) => {
      if (selectedCategoryFilter.includes(category.id)) {
        category.storeIds.forEach((storeId) => filteredStoreIds.add(storeId));
      }
    });

    return STORE_DATA.filter((store) => filteredStoreIds.has(store.code));
  };

  const filteredStoresForSettings = getFilteredStoresForSettings();

  // 販売構成比の合計を計算
  const calculateTotalSalesRatio = (): number => {
    let total = 0;
    for (const store of filteredStoresForSettings) {
      const setting = storeSettings[store.code];
      const salesRatio = setting?.salesRatio ?? 0;
      total += salesRatio;
    }
    return total;
  };

  const totalSalesRatio = calculateTotalSalesRatio();
  const salesRatioDifference = 100 - totalSalesRatio;

  const handleFilterClick = (e: React.MouseEvent<HTMLElement>) => {
    setCategoryFilterAnchorEl(e.currentTarget);
    onLoadCategories();
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          各店舗の販売構成比を設定します。配分画面で使用する店舗にチェックを入れてください。
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {selectedCategoryFilter.length > 0 && (
            <Chip
              label={`${selectedCategoryFilter.length}件のカテゴリー`}
              size="small"
              onDelete={onClearCategoryFilter}
            />
          )}
          <IconButton
            onClick={handleFilterClick}
            color={selectedCategoryFilter.length > 0 ? 'primary' : 'default'}
            size="small"
          >
            <FilterListIcon />
          </IconButton>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>使用</TableCell>
                  <TableCell>店番</TableCell>
                  <TableCell>店舗名</TableCell>
                  <TableCell align="right" sx={{ minWidth: { xs: 80, sm: 120 } }}>販売構成比（%）</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStoresForSettings.map((store) => {
                  const setting = storeSettings[store.code];
                  const enabled = setting?.enabled ?? true;
                  const salesRatio = setting?.salesRatio ?? 0;

                  return (
                    <TableRow key={store.code}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={enabled}
                          onChange={(e) => onSettingChange(store.code, 'enabled', e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>{store.code}</TableCell>
                      <TableCell>{store.name}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={salesRatio}
                          onChange={(e) =>
                            onSettingChange(store.code, 'salesRatio', parseFloat(e.target.value) || 0)
                          }
                          inputProps={{
                            min: 0,
                            max: 100,
                            step: 0.1,
                            style: { textAlign: 'right', fontSize: '0.875rem' },
                          }}
                          sx={{
                            width: { xs: 60, sm: 100 },
                            '& .MuiInputBase-input': {
                              py: { xs: 0.5, sm: 1 },
                            },
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 販売構成比の合計と差異 */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6}>
                <Typography variant="body2" fontWeight="medium">
                  販売構成比 合計:
                </Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'right' }}>
                <Typography
                  variant="body1"
                  fontWeight="bold"
                  color={Math.abs(salesRatioDifference) < 0.01 ? 'success.main' : 'text.primary'}
                >
                  {totalSalesRatio.toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" fontWeight="medium">
                  100%との差異:
                </Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'right' }}>
                <Typography
                  variant="body1"
                  fontWeight="bold"
                  color={Math.abs(salesRatioDifference) < 0.01 ? 'success.main' : 'error.main'}
                >
                  {salesRatioDifference > 0 ? '+' : ''}{salesRatioDifference.toFixed(1)}%
                </Typography>
              </Grid>
            </Grid>
            {Math.abs(salesRatioDifference) >= 0.01 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                販売構成比の合計が100%になるように調整してください。
              </Alert>
            )}
          </Box>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={onSave}>
              保存
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* カテゴリーフィルターPopover */}
      <Popover
        open={Boolean(categoryFilterAnchorEl)}
        anchorEl={categoryFilterAnchorEl}
        onClose={() => setCategoryFilterAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            カテゴリーで絞り込み
          </Typography>
          {categories.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              カテゴリーがありません
            </Typography>
          ) : (
            <FormGroup>
              {categories.map((category) => (
                <FormControlLabel
                  key={category.id}
                  control={
                    <Checkbox
                      checked={selectedCategoryFilter.includes(category.id)}
                      onChange={() => onCategoryFilterChange(category.id)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      {category.name} ({category.storeIds.length})
                    </Typography>
                  }
                />
              ))}
            </FormGroup>
          )}
        </Box>
      </Popover>
    </>
  );
};
