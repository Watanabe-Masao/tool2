import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack } from '@mui/material';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MODAL_Z_INDEX } from '@/utils/constants';

/**
 * AllocationDateRangePicker Props
 */
export interface AllocationDateRangePickerProps {
  /** ダイアログが開いているか */
  open: boolean;
  /** 現在の日付範囲 */
  currentRange: { start: string; end: string } | null;
  /** ダイアログを閉じる */
  onClose: () => void;
  /** 日付範囲が選択された時 */
  onSelect: (range: { start: string; end: string }) => void;
}

/**
 * AllocationDateRangePicker Component
 *
 * 日付範囲選択ダイアログ。
 * 開始日と終了日を選択して配分履歴を表示する範囲を指定します。
 *
 * @example
 * ```tsx
 * <AllocationDateRangePicker
 *   open={datePickerOpen}
 *   currentRange={selectedDateRange}
 *   onClose={() => setDatePickerOpen(false)}
 *   onSelect={(range) => handleDateRangeSelect(range)}
 * />
 * ```
 */
export const AllocationDateRangePicker: React.FC<AllocationDateRangePickerProps> = ({
  open,
  currentRange,
  onClose,
  onSelect,
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (open && currentRange) {
      setStartDate(currentRange.start);
      setEndDate(currentRange.end);
    }
  }, [open, currentRange]);

  const handleSubmit = () => {
    if (startDate && endDate) {
      onSelect({ start: startDate, end: endDate });
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth sx={{ zIndex: MODAL_Z_INDEX.NESTED_DIALOG }}>
      <DialogTitle>日付範囲を選択</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="開始日"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="終了日"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            inputProps={{ min: startDate }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!startDate || !endDate}>
          適用
        </Button>
      </DialogActions>
    </Dialog>
  );
};
