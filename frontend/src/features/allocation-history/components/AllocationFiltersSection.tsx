import {
  Box,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Chip,
  Button,
} from '@mui/material';
import { FilterList } from '@mui/icons-material';
import { MODAL_Z_INDEX, ELEMENT_OFFSET } from '@/utils/constants';
import type { AllocationHistoryFilters, AllocationHistoryTableData } from '../hooks';
import { formatAllocationDate } from '../utils';

/**
 * AllocationFiltersSection Props
 */
export interface AllocationFiltersSectionProps {
  /** フィルター状態 */
  filters: AllocationHistoryFilters;
  /** テーブルデータ（利用可能なフィルター値） */
  tableData: AllocationHistoryTableData;
}

/**
 * AllocationFiltersSection Component
 *
 * 配分履歴のフィルター設定セクション（Phase C最適化済み）。
 * 商品名/産地/規格/日付の4つのフィルターを提供します。
 *
 * **Phase C 最適化:**
 * - formatAllocationDate 関数導入（~10行削減）
 *
 * **機能:**
 * - 商品名フィルター（複数選択）
 * - 産地フィルター（複数選択）
 * - 規格フィルター（複数選択）
 * - 日付フィルター（複数選択）
 * - フィルタークリアボタン
 *
 * @example
 * ```tsx
 * <AllocationFiltersSection
 *   filters={allocationHistory.filters}
 *   tableData={allocationHistory.tableData}
 * />
 * ```
 */
export const AllocationFiltersSection: React.FC<AllocationFiltersSectionProps> = ({
  filters,
  tableData,
}) => {
  const { filters: filterState, setFilters, resetFilters, hasActiveFilters } = filters;
  const { availableFilterValues } = tableData;

  return (
    <Box>
      <Typography
        variant="subtitle2"
        fontWeight={600}
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <FilterList fontSize="small" />
        フィルター
      </Typography>
      <Stack spacing={2}>
        {/* 商品名フィルター */}
        <FormControl fullWidth size="small">
          <InputLabel>商品名</InputLabel>
          <Select
            multiple
            value={filterState.productNames}
            onChange={(e) => setFilters({ ...filterState, productNames: e.target.value as string[] })}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
            MenuProps={{
              sx: { zIndex: MODAL_Z_INDEX.NESTED_DIALOG + ELEMENT_OFFSET.SELECT_MENU },
            }}
          >
            {availableFilterValues.productNames.map((name) => (
              <MenuItem key={name} value={name}>
                <Checkbox checked={filterState.productNames.includes(name)} />
                <ListItemText primary={name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 産地フィルター */}
        <FormControl fullWidth size="small">
          <InputLabel>産地</InputLabel>
          <Select
            multiple
            value={filterState.origins}
            onChange={(e) => setFilters({ ...filterState, origins: e.target.value as string[] })}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
            MenuProps={{
              sx: { zIndex: MODAL_Z_INDEX.NESTED_DIALOG + ELEMENT_OFFSET.SELECT_MENU },
            }}
          >
            {availableFilterValues.origins.map((origin) => (
              <MenuItem key={origin} value={origin}>
                <Checkbox checked={filterState.origins.includes(origin)} />
                <ListItemText primary={origin} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 規格フィルター */}
        <FormControl fullWidth size="small">
          <InputLabel>規格</InputLabel>
          <Select
            multiple
            value={filterState.specifications}
            onChange={(e) => setFilters({ ...filterState, specifications: e.target.value as string[] })}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
            MenuProps={{
              sx: { zIndex: MODAL_Z_INDEX.NESTED_DIALOG + ELEMENT_OFFSET.SELECT_MENU },
            }}
          >
            {availableFilterValues.specifications.map((spec) => (
              <MenuItem key={spec} value={spec}>
                <Checkbox checked={filterState.specifications.includes(spec)} />
                <ListItemText primary={spec} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 日付フィルター */}
        <FormControl fullWidth size="small">
          <InputLabel>日付</InputLabel>
          <Select
            multiple
            value={filterState.dates}
            onChange={(e) => setFilters({ ...filterState, dates: e.target.value as string[] })}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={formatAllocationDate(value, 'short')} size="small" />
                ))}
              </Box>
            )}
            MenuProps={{
              sx: { zIndex: MODAL_Z_INDEX.NESTED_DIALOG + ELEMENT_OFFSET.SELECT_MENU },
            }}
          >
            {availableFilterValues.dates.map((date) => (
              <MenuItem key={date} value={date}>
                <Checkbox checked={filterState.dates.includes(date)} />
                <ListItemText primary={formatAllocationDate(date, 'medium')} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* フィルタークリアボタン */}
        {hasActiveFilters() && (
          <Button size="small" variant="outlined" onClick={resetFilters}>
            フィルターをクリア
          </Button>
        )}
      </Stack>
    </Box>
  );
};
