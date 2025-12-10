import { Box } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { STORE_DATA } from '@/utils/constants';
import type { DetailGridRow } from '../types';

/**
 * 店舗カラムのセルレンダリング（純粋関数）
 *
 * @param params - GridのrenderCellパラメータ
 * @returns レンダリングされた要素
 */
export const renderStoreCell = (params: { value?: number }) => {
  const value = params.value || 0;
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: value > 0 ? '600' : 'normal',
        color: value > 0 ? 'primary.dark' : 'grey.400',
        bgcolor: value > 0 ? 'primary.50' : 'transparent',
      }}
    >
      {value > 0 ? value : '-'}
    </Box>
  );
};

/**
 * 店舗カラム定義を生成（純粋関数）
 *
 * @param isMobile - モバイル表示かどうか
 * @returns DataGridカラム定義の配列
 */
export const createStoreColumns = (isMobile: boolean): GridColDef<DetailGridRow>[] => {
  return STORE_DATA.map((store) => ({
    field: `store_${store.code}`,
    headerName: `${store.code}\n${store.name}`,
    width: isMobile ? 45 : 55,
    sortable: false as const,
    disableColumnMenu: true,
    type: 'number' as const,
    renderCell: renderStoreCell,
  }));
};
