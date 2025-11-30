import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton } from '@mui/material';
import { Visibility, Delete } from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { AllocationBatch } from '@/types/allocationHistory';
import type { SupplierPreset } from '@/components/calendar/GlassCalendar';
import { getSupplierColorByName, getSupplierColorWithOpacity } from '@/constants/supplierColors';
import { StatusBadge, TableHeaderCell } from '@/components/ui';

/**
 * 週ごとのバッチグループ
 */
export interface WeekBatchGroup {
  weekStart: Date;
  weekEnd: Date;
  batches: AllocationBatch[];
}

/**
 * AllocationHistoryTable Props
 */
export interface AllocationHistoryTableProps {
  /** 週ごとにグループ化されたバッチデータ */
  weeks: WeekBatchGroup[];
  /** 帳合先プリセット（色表示用） */
  supplierPresets: SupplierPreset[];
  /** 詳細表示ボタンクリック */
  onViewDetails: (batch: AllocationBatch) => void;
  /** 削除ボタンクリック */
  onDelete: (batch: AllocationBatch) => void;
}

/**
 * AllocationHistoryTable Component
 *
 * 配分履歴をテーブル形式で表示するコンポーネント。
 * 週ごとにグループ化し、各バッチの納品日、帳合先、商品数、合計、操作を表示します。
 *
 * **機能:**
 * - 週ごとのグループヘッダー表示
 * - 帳合先の色分け表示
 * - レスポンシブデザイン（モバイル対応）
 * - 詳細表示・削除アクション
 *
 * @example
 * ```tsx
 * <AllocationHistoryTable
 *   weeks={sortedWeeks}
 *   supplierPresets={supplierPresets}
 *   onViewDetails={fetchBatchDetails}
 *   onDelete={handleOpenDeleteDialog}
 * />
 * ```
 */
export const AllocationHistoryTable: React.FC<AllocationHistoryTableProps> = ({
  weeks,
  supplierPresets,
  onViewDetails,
  onDelete,
}) => {
  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'grey.200',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                bgcolor: 'grey.50',
                borderBottom: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              <TableHeaderCell>納品日</TableHeaderCell>
              <TableHeaderCell>帳合先</TableHeaderCell>
              <TableHeaderCell align="right">商品数</TableHeaderCell>
              <TableHeaderCell align="right">合計</TableHeaderCell>
              <TableHeaderCell display={{ xs: 'none', sm: 'table-cell' }}>保存日時</TableHeaderCell>
              <TableHeaderCell align="center" width={80}>操作</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weeks.map((week, weekIdx) => (
              <React.Fragment key={weekIdx}>
                {/* 週ヘッダー */}
                <TableRow>
                  <TableCell
                    colSpan={6}
                    sx={{
                      background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                      py: 1,
                      px: 2,
                      borderBottom: '1px solid',
                      borderColor: 'grey.200',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'grey.700',
                        }}
                      >
                        {format(week.weekStart, 'M/d', { locale: ja })} - {format(week.weekEnd, 'M/d(E)', { locale: ja })}
                      </Typography>
                      <StatusBadge variant="primary">
                        {week.batches.length}件
                      </StatusBadge>
                    </Box>
                  </TableCell>
                </TableRow>
                {/* 週内のバッチ */}
                {week.batches.map((batch) => (
                  <TableRow
                    key={batch.id}
                    sx={{
                      transition: 'background-color 0.15s ease',
                      '&:hover': {
                        bgcolor: 'rgba(99, 102, 241, 0.04)',
                      },
                      '&:last-child td': {
                        borderBottom: weekIdx < weeks.length - 1 ? '1px solid' : 'none',
                        borderColor: 'grey.100',
                      },
                    }}
                  >
                    <TableCell sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'grey.100' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: 1,
                            bgcolor: 'grey.100',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'grey.700' }}>
                            {format(new Date(batch.deliveryDate), 'd')}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'grey.600' }}>
                          {format(new Date(batch.deliveryDate), 'E', { locale: ja })}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'grey.100' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {batch.suppliers.map((supplier, idx) => {
                          const supplierColor = getSupplierColorByName(supplier, supplierPresets);
                          return (
                            <Box
                              key={idx}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                bgcolor: getSupplierColorWithOpacity(supplierColor, 0.1),
                                borderLeft: `3px solid ${supplierColor}`,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  color: supplierColor,
                                }}
                              >
                                {supplier}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'grey.100' }}>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'grey.700' }}>
                        {batch.productCount}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'grey.100' }}>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'primary.main' }}>
                        {batch.totalQuantity.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{
                        py: 1.25,
                        borderBottom: '1px solid',
                        borderColor: 'grey.100',
                        display: { xs: 'none', sm: 'table-cell' },
                      }}
                    >
                      <Typography sx={{ fontSize: '0.7rem', color: 'grey.500' }}>
                        {batch.createdAt
                          ? format(batch.createdAt, 'M/d HH:mm')
                          : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'grey.100' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.25 }}>
                        <IconButton
                          size="small"
                          onClick={() => onViewDetails(batch)}
                          aria-label="配分詳細を表示"
                          sx={{
                            p: 0.5,
                            color: 'grey.500',
                            '&:hover': {
                              bgcolor: 'primary.50',
                              color: 'primary.main',
                            },
                          }}
                        >
                          <Visibility sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => onDelete(batch)}
                          aria-label="配分履歴を削除"
                          sx={{
                            p: 0.5,
                            color: 'grey.400',
                            '&:hover': {
                              bgcolor: 'error.50',
                              color: 'error.main',
                            },
                          }}
                        >
                          <Delete sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
