import { TableCell, type TableCellProps } from '@mui/material';

/**
 * TableHeaderCell Props
 */
export interface TableHeaderCellProps extends Omit<TableCellProps, 'sx'> {
  /** 子要素 */
  children: React.ReactNode;
  /** テキスト配置（デフォルト: left） */
  align?: 'left' | 'center' | 'right';
  /** 幅を指定（px） */
  width?: number;
  /** レスポンシブ表示設定（例: { xs: 'none', sm: 'table-cell' }） */
  display?: { xs?: string; sm?: string; md?: string; lg?: string };
}

/**
 * TableHeaderCell Component
 *
 * テーブルヘッダー用の統一されたスタイルを持つセルコンポーネント。
 * 全てのテーブルヘッダーで一貫したスタイル（フォント、色、パディング）を提供します。
 *
 * **特徴:**
 * - 統一されたスタイル（fontWeight: 700, fontSize: 0.75rem, color: grey.600）
 * - 固定パディング（py: 1.5）
 * - borderBottom: none（親テーブルで制御）
 * - レスポンシブ表示対応
 *
 * @example
 * ```tsx
 * <TableHead>
 *   <TableRow>
 *     <TableHeaderCell>納品日</TableHeaderCell>
 *     <TableHeaderCell>帳合先</TableHeaderCell>
 *     <TableHeaderCell align="right">商品数</TableHeaderCell>
 *     <TableHeaderCell align="right">合計</TableHeaderCell>
 *     <TableHeaderCell display={{ xs: 'none', sm: 'table-cell' }}>
 *       保存日時
 *     </TableHeaderCell>
 *     <TableHeaderCell align="center" width={80}>
 *       操作
 *     </TableHeaderCell>
 *   </TableRow>
 * </TableHead>
 * ```
 */
export const TableHeaderCell: React.FC<TableHeaderCellProps> = ({
  children,
  align = 'left',
  width,
  display,
  ...otherProps
}) => {
  return (
    <TableCell
      align={align}
      sx={{
        fontWeight: 700,
        fontSize: '0.75rem',
        color: 'grey.600',
        py: 1.5,
        borderBottom: 'none',
        ...(width && { width }),
        ...(display && { display }),
      }}
      {...otherProps}
    >
      {children}
    </TableCell>
  );
};
