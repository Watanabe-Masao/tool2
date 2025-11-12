#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
配分表テンプレート作成スクリプト（改善版 v2.0）
元のExcelファイルと全く同じ構造・書式・数式を持つファイルを作成します

改善点:
- 型ヒントの追加
- エラーハンドリングの強化
- 設定クラスの分離
- 定数管理の改善
- データの構造化
"""

from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Dict, Union
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, Alignment, Border, Side, NamedStyle
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet
from openpyxl.workbook import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.page import PageMargins


@dataclass
class ProductData:
    """商品データクラス"""
    delivery_date: Optional[str] = None
    origin: Optional[str] = None
    standard: Optional[str] = None
    product_name: Optional[str] = None
    store_cost: Optional[float] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    total_delivery: Optional[int] = None
    delivery_dest: Optional[str] = None
    store_quantities: Dict[str, int] = field(default_factory=dict)


@dataclass
class TemplateConfig:
    """テンプレート設定クラス"""

    # 列幅設定（ピクセル換算値）
    pixel_100: float = 13.5714285714  # 100ピクセル
    pixel_50: float = 6.4285714286    # 50ピクセル

    # 行エリア定義
    title_area_start: int = 1
    title_area_end: int = 6
    header_area_start: int = 7
    header_area_end: int = 8
    data_area_start: int = 9

    # ブロック設定
    block_size: int = 3  # 1ブロック = 3行（data/detail/blank）
    num_blocks: int = 1  # デフォルトは1ブロック（1商品分）

    # 列インデックス
    col_a: int = 1
    col_b: int = 2
    col_c: int = 3
    col_d: int = 4
    col_e: int = 5
    col_f: int = 6
    col_g: int = 7
    col_h: int = 8
    col_i: int = 9
    col_j: int = 10   # 店舗列開始
    col_as: int = 45  # 店舗列終了
    col_at: int = 46  # 合計
    col_au: int = 47  # 納品数
    col_av: int = 48  # 帳合先
    col_aw: int = 49  # 非表示列
    col_ax: int = 50  # センター送信

    # 色定義
    color_red: str = 'FF0000'
    color_blue: str = '0000FF'

    # 出力ファイル名
    default_output_path: str = '配分表_テンプレート.xlsx'


@dataclass
class StoreData:
    """店舗データクラス"""
    codes: List[Tuple[str, Union[str, int]]] = field(default_factory=list)
    names: List[Tuple[str, str, int]] = field(default_factory=list)

    @classmethod
    def get_default_data(cls) -> 'StoreData':
        """デフォルトの店舗データを取得"""
        # 店舗コード（セル位置, コード）
        codes_list = [
            ('J7', '01'), ('K7', '02'), ('L7', '03'), ('M7', '05'),
            ('N7', '06'), ('O7', '07'), ('P7', '08'), ('Q7', '23'),
            ('R7', '24'), ('S7', 26), ('T7', 28), ('U7', 30),
            ('V7', 32), ('W7', 34), ('X7', 36), ('Y7', 37),
            ('Z7', 39), ('AA7', 40), ('AB7', 41), ('AC7', 43),
            ('AD7', 45), ('AE7', 47), ('AF7', 48), ('AG7', 305),
            ('AH7', 307), ('AI7', 308), ('AJ7', 311), ('AK7', 313),
            ('AL7', 314), ('AM7', 317), ('AN7', 318), ('AO7', 341),
            ('AP7', 342), ('AQ7', 343), ('AR7', 344), ('AS7', 911),
        ]

        # 店舗名（セル位置, 店舗名, フォントサイズ）
        names_list = [
            ('J8', '朝倉', 10), ('K8', '伊野', 9), ('L8', '高須', 9),
            ('M8', '愛宕', 9), ('N8', '神田', 9), ('O8', '毎日屋\n土佐道路', 6),
            ('P8', '山手', 9), ('Q8', '桟橋', 9), ('R8', '大橋通', 9),
            ('S8', 'アクシス\n南国', 6), ('T8', '瀬戸', 9), ('U8', '清水', 11),
            ('V8', '四万十', 11), ('W8', 'アクシス\nいの', 6),
            ('X8', '土佐\n道路東', 9), ('Y8', 'とさのさと\n御座', 6),
            ('Z8', '六泉寺', 6), ('AA8', '薊野', 9), ('AB8', '中万々', 8),
            ('AC8', '高岡', 8), ('AD8', '久米', 9), ('AE8', '森松', 9),
            ('AF8', '束本', 9), ('AG8', '仁井田', 9), ('AH8', '窪川', 9),
            ('AI8', 'さが', 9), ('AJ8', '丸味', 9), ('AK8', 'ｻﾝｸﾞﾘｰﾝ', 9),
            ('AL8', '大月', 9), ('AM8', '西土佐', 9), ('AN8', '十和', 9),
            ('AO8', '吾川', 9), ('AP8', '池川', 9), ('AQ8', '上八川', 9),
            ('AR8', '下八川', 9), ('AS8', '惣菜', 9),
        ]

        return cls(codes=codes_list, names=names_list)


class BorderFactory:
    """罫線生成ファクトリークラス"""

    THIN = Side(style='thin')
    MEDIUM = Side(style='medium')
    HAIR = Side(style='hair')

    @classmethod
    def create(cls, top: Optional[str] = None, bottom: Optional[str] = None,
               left: Optional[str] = None, right: Optional[str] = None) -> Border:
        """罫線を作成

        Args:
            top: 上罫線 ('thin', 'medium', 'hair', None)
            bottom: 下罫線
            left: 左罫線
            right: 右罫線

        Returns:
            Border: 罫線オブジェクト
        """
        style_map = {
            'thin': cls.THIN,
            'medium': cls.MEDIUM,
            'hair': cls.HAIR,
            None: None,
        }
        return Border(
            top=style_map.get(top),
            bottom=style_map.get(bottom),
            left=style_map.get(left),
            right=style_map.get(right),
        )


class StyleManager:
    """スタイル管理クラス - 頻繁に使うスタイルを事前定義して高速化"""

    @staticmethod
    def create_named_styles(wb: Workbook, cfg: 'TemplateConfig') -> None:
        """
        ワークブックにNamedStyleを登録（高速化のため）

        Args:
            wb: ワークブック
            cfg: テンプレート設定
        """
        # 共通の中央揃え
        center_align = Alignment(horizontal='center', vertical='center')

        styles_to_create = [
            # ヘッダー用スタイル
            ('header_16_bold', Font(size=16, bold=True), Alignment(horizontal='distributed', vertical='distributed')),
            ('header_20_bold', Font(size=20, bold=True), center_align),
            ('header_11_bold', Font(size=11, bold=True), center_align),
            ('header_10', Font(size=10), center_align),
            ('header_9', Font(size=9), center_align),
            ('header_8', Font(size=8), center_align),

            # データ用スタイル
            ('data_14_bold', Font(size=14, bold=True), center_align),
            ('data_14_bold_right', Font(size=14, bold=True), Alignment(horizontal='right')),
            ('data_16_bold', Font(size=16, bold=True), center_align),
            ('data_12_bold', Font(size=12, bold=True), center_align),
            ('data_12_blue', Font(size=12, color=cfg.color_blue), center_align),
            ('data_14_red', Font(size=14, bold=True, color=cfg.color_red), center_align),
            ('data_11_bold', Font(size=11, bold=True), center_align),
        ]

        for style_name, font, alignment in styles_to_create:
            # 既存のスタイルをスキップ
            if style_name in wb.named_styles:
                continue

            style = NamedStyle(name=style_name)
            style.font = font
            style.alignment = alignment
            wb.add_named_style(style)


class HaibunTemplateCreator:
    """配分表テンプレート作成クラス

    シート構造:
    - 1～6行: タイトルエリア（商品連絡書、配分、担当バイヤー、期間など）
    - 7～8行: ヘッダーエリア（列ヘッダー、店舗名など）
    - 9～17行: データエリア（3行×3ブロック = 9行）
        - 9～11行: 商品1の入力ブロック
        - 12～14行: 商品2の入力ブロック
        - 15～17行: 商品3の入力ブロック

    各商品ブロック（3行構成）:
    - 1行目（data_row）: 商品情報行（納品日、産地、規格、店着原価、税抜など）
    - 2行目（detail_row）: 詳細情報行（品名、税込、入数、店舗配分数など）
    - 3行目（blank_row）: 空白行（detail_rowと結合）
    """

    def __init__(self, config: Optional[TemplateConfig] = None,
                 store_data: Optional[StoreData] = None):
        """初期化

        Args:
            config: テンプレート設定（省略時はデフォルト）
            store_data: 店舗データ（省略時はデフォルト）
        """
        self.config = config or TemplateConfig()
        self.store_data = store_data or StoreData.get_default_data()
        self.wb: Workbook = openpyxl.Workbook()
        self.ws: Worksheet = self.wb.active
        self.ws.title = '配分書'

        # NamedStyleを事前登録（高速化）
        StyleManager.create_named_styles(self.wb, self.config)

    def create_template(self, output_path: Optional[str] = None, buyer_name: Optional[str] = None,
                       products: Optional[List[ProductData]] = None) -> str:
        """テンプレートを作成

        Args:
            output_path: 出力ファイルパス（省略時は設定のデフォルト値）
            buyer_name: 担当バイヤー名（省略可）
            products: 商品データリスト（省略可）

        Returns:
            str: 作成したファイルのパス

        Raises:
            PermissionError: ファイルの書き込み権限がない場合
            Exception: その他のエラー
        """
        if output_path is None:
            output_path = self.config.default_output_path

        try:
            print("配分表テンプレートを作成中...")

            # 1. 基本設定
            self._setup_columns()
            self._setup_rows()

            # 2. タイトルエリア（1～6行）
            self._setup_header_area(buyer_name=buyer_name)

            # 3. ヘッダーエリア（7～8行）
            self._setup_column_headers()

            # 4. データエリア（9～17行: 3商品ブロック）
            self._setup_data_rows(products=products)

            # 5. 罫線設定
            self._setup_borders()

            # 6. 名前定義
            self._setup_named_ranges()

            # 7. 印刷設定
            self._setup_print_settings()

            # ファイル保存
            self.wb.save(output_path)
            print(f"✓ ファイルを作成しました: {output_path}")
            return output_path

        except PermissionError as e:
            print(f"✗ エラー: ファイル '{output_path}' が開かれているか、書き込み権限がありません")
            raise
        except Exception as e:
            print(f"✗ 予期しないエラーが発生しました: {type(e).__name__}: {e}")
            raise

    # ----------------- 基本設定 -----------------
    def _setup_columns(self) -> None:
        """列幅と非表示設定"""
        cfg = self.config

        # 非表示列
        for col in ['A', 'F', 'AW']:
            self.ws.column_dimensions[col].hidden = True

        # 基本列幅
        basic_widths: Dict[str, float] = {
            'A': 6.3984375, 'B': 7.296875, 'C': 7.296875, 'D': 10.0,
            'E': 13.3984375, 'F': 6.19921875, 'G': 8.3984375, 'H': 13.0,
            'I': cfg.pixel_100,
        }
        for col, width in basic_widths.items():
            self.ws.column_dimensions[col].width = width

        # 店舗列（J～AS）: 50px
        for col_idx in range(cfg.col_j, cfg.col_as + 1):
            col_letter = get_column_letter(col_idx)
            self.ws.column_dimensions[col_letter].width = cfg.pixel_50

        # 特殊列幅
        special_widths: Dict[str, float] = {
            'AT': 7.09765625, 'AU': 13.0, 'AV': 12.8984375,
            'AW': 8.09765625, 'AX': 8.09765625
        }
        for col, width in special_widths.items():
            self.ws.column_dimensions[col].width = width

    def _setup_rows(self) -> None:
        """行高と非表示設定"""
        cfg = self.config

        # 固定行の高さ（ピクセル×0.75=ポイント）
        row_heights: Dict[int, float] = {
            1: 30.0,    # 40ピクセル
            2: 32.25,   # 非表示
            3: 22.5,    # 30ピクセル
            4: 22.5,    # 30ピクセル
            5: 18.75,   # 25ピクセル
            6: 18.75,   # 25ピクセル
            7: 13.5,
            8: 16.5
        }

        # データ行の高さを動的に生成
        for block_idx in range(cfg.num_blocks):
            base_row = cfg.data_area_start + (block_idx * cfg.block_size)
            row_heights[base_row] = 16.2      # data_row
            row_heights[base_row + 1] = 16.8  # detail_row
            row_heights[base_row + 2] = 16.2  # blank_row

        for row, height in row_heights.items():
            self.ws.row_dimensions[row].height = height

        # 2行目は非表示
        self.ws.row_dimensions[2].hidden = True

    # ----------------- タイトル/ヘッダー -----------------
    def _setup_header_area(self, buyer_name: Optional[str] = None) -> None:
        """タイトルエリア（1～6行）

        Args:
            buyer_name: 担当バイヤー名（省略可）
        """
        # タイトル（G1:Y1）
        self.ws.merge_cells('G1:Y1')
        self._set_cell('G1', '商  品  連  絡  書 <高  知> <愛  媛>', style_name='header_16_bold')

        # B3:H4結合
        self.ws.merge_cells('B3:H4')

        # 配分（I3:Z4）
        self.ws.merge_cells('I3:Z4')
        self._set_cell('I3', '配分', style_name='header_20_bold')

        # 担当バイヤー（AB4:AD4）
        self._set_cell('AB4', '担当バイヤー', style_name='header_8')
        self.ws.merge_cells('AB4:AD4')

        # AE4:AT4結合（担当バイヤー名を入力）
        self.ws.merge_cells('AE4:AT4')
        if buyer_name:
            self._set_cell('AE4', buyer_name, style_name='header_11_bold')

        # AB4～AT4の中太線設定
        self._setup_row4_medium_border()

        # B5:G6結合 - 細線枠（上線なし）
        self.ws.merge_cells('B5:G6')
        self.ws['B5'].border = BorderFactory.create(None, 'thin', 'thin', 'thin')

        # 期間（H5:H6）
        self._set_cell('H5', '期間', style_name='header_10')
        self.ws.merge_cells('H5:H6')

        # I5:Z6結合 - 細線枠
        self.ws.merge_cells('I5:Z6')
        self.ws['I5'].border = BorderFactory.create('thin', 'thin', 'thin', 'thin')

    def _setup_row4_medium_border(self) -> None:
        """行4の中太線設定（AB～AT）"""
        self.ws['AB4'].border = BorderFactory.create('medium', 'medium', 'medium', 'medium')

        for col in ['AC', 'AD']:
            self.ws[f'{col}4'].border = BorderFactory.create('medium', 'medium', None, 'medium')

        for col_idx in range(31, 47):  # AE(31)～AT(46)
            col_letter = get_column_letter(col_idx)
            if col_idx == 31:
                self.ws[f'{col_letter}4'].border = BorderFactory.create('medium', 'medium', 'medium', None)
            elif col_idx == 46:
                self.ws[f'{col_letter}4'].border = BorderFactory.create('medium', 'medium', None, 'medium')
            else:
                self.ws[f'{col_letter}4'].border = BorderFactory.create('medium', 'medium', None, None)

    def _setup_column_headers(self) -> None:
        """ヘッダーエリア（7～8行）"""
        # 7行目ヘッダー
        headers_row7: List[Tuple[str, str, int, bool]] = [
            ('A7', '商品コード', 10, False),
            ('B7', '店着日', 10, False),
            ('D7', '産地', 10, False),
            ('E7', '規  格', 10, False),
            ('F7', ' LFC着', 10, False),
            ('G7', '店着原価', 8, False),
            ('H7', '税抜', 9, False),
            ('I7', 'ｹｰｽ', 9, False),
        ]
        for addr, val, size, bold in headers_row7:
            self._set_cell(addr, val, font=Font(size=size, bold=bold),
                           alignment=Alignment(horizontal='center', vertical='center'))

        # F7に通貨書式
        self.ws['F7'].number_format = r'"¥"#,##0;[Red]"¥"\-#,##0'

        # 店舗コード
        for cell_addr, value in self.store_data.codes:
            self._set_cell(cell_addr, value,
                           font=Font(size=10, bold=True),
                           alignment=Alignment(horizontal='center', vertical='center'))
            if isinstance(value, str) and value in ['01', '08']:
                self.ws[cell_addr].number_format = '@'

        # 合計・納品数・帳合先
        self._set_cell('AT7', '合計', alignment=Alignment(horizontal='center', vertical='center'))
        self.ws.merge_cells('AT7:AT8')

        self._set_cell('AU7', '納品数',
                       alignment=Alignment(horizontal='center', vertical='center'),
                       border=BorderFactory.create('thin', 'thin', 'thin', 'thin'))

        self._set_cell('AV7', '帳合先', alignment=Alignment(horizontal='center', vertical='distributed'))
        self.ws.merge_cells('AV7:AV8')

        # 行8
        self._setup_row8_headers()

    def _setup_row8_headers(self) -> None:
        """8行目のヘッダー設定"""
        # A-G列 一部結合
        self.ws.merge_cells('A7:A8')
        self.ws.merge_cells('B7:C8')

        # D7:E7 産地/規格の罫線処理のため一旦空白行として扱う
        # 8行目のみD8:E8（品名）を設定
        self._set_cell('D8', '品 名', font=Font(size=10),
                       alignment=Alignment(horizontal='center', vertical='center'))
        self.ws.merge_cells('D8:E8')

        self.ws.merge_cells('F7:F8')
        self.ws.merge_cells('G7:G8')

        # H8, I8
        self._set_cell('H8', '税込', font=Font(size=9),
                       alignment=Alignment(horizontal='center', vertical='center'))
        self._set_cell('I8', '入数', font=Font(size=11, bold=True),
                       alignment=Alignment(horizontal='center', vertical='center'))

        # 店舗名
        for cell_addr, name, size in self.store_data.names:
            self._set_cell(cell_addr, name, font=Font(size=size),
                           alignment=Alignment(horizontal='center', vertical='center'))
            if cell_addr in ['AD8', 'AE8', 'AF8']:
                self.ws[cell_addr].number_format = '@'

        # 差異
        self._set_cell('AU8', '差異',
                       alignment=Alignment(horizontal='center', vertical='center'),
                       border=BorderFactory.create('thin', 'thin', 'thin', 'thin'))

    # ----------------- データ行 -----------------
    def _setup_data_rows(self, products: Optional[List[ProductData]] = None) -> None:
        """データ行（9-17行）の設定

        Args:
            products: 商品データリスト（省略可）
        """
        cfg = self.config
        block_start_rows = [
            cfg.data_area_start + (i * cfg.block_size)
            for i in range(cfg.num_blocks)
        ]

        for idx, data_row in enumerate(block_start_rows):
            detail_row = data_row + 1
            blank_row = data_row + 2

            # 該当する商品データを取得（存在する場合）
            product_data = products[idx] if products and idx < len(products) else None

            self._setup_input_fields(data_row, detail_row, product_data)
            self._setup_formulas(data_row, detail_row, blank_row)
            self._setup_cell_merges(data_row, detail_row, blank_row)
            self._merge_store_columns(detail_row, blank_row)

    def _setup_input_fields(self, data_row: int, detail_row: int, product_data: Optional[ProductData] = None) -> None:
        """入力欄のフォント/体裁とデータ入力

        Args:
            data_row: 商品情報行番号
            detail_row: 詳細情報行番号
            product_data: 商品データ（省略可）
        """
        cfg = self.config

        # 店着日（B列）
        delivery_date_value = None
        if product_data and product_data.delivery_date:
            try:
                # YYYY-MM-DD形式の文字列をdatetimeオブジェクトに変換
                delivery_date_value = datetime.strptime(product_data.delivery_date, '%Y-%m-%d')
            except (ValueError, TypeError):
                pass  # 日付変換に失敗した場合は空欄にする

        self.ws[f'B{data_row}'].number_format = 'm/d(aaa)'
        self._set_cell(f'B{data_row}', delivery_date_value,
                       font=Font(size=14, bold=True),
                       alignment=Alignment(horizontal='center', vertical='center'))

        # 産地（D列 data_row）
        origin_value = product_data.origin if product_data else None
        self._set_cell(f'D{data_row}', origin_value,
                       font=Font(size=11, bold=True),
                       alignment=Alignment(horizontal='center', vertical='center'))

        # 規格（E列 data_row）
        standard_value = product_data.standard if product_data else None
        self._set_cell(f'E{data_row}', standard_value,
                       font=Font(size=11, bold=True, color=cfg.color_red),
                       alignment=Alignment(horizontal='center', vertical='center'))

        # 品名（D列 detail_row）
        product_name_value = product_data.product_name if product_data else None
        self._set_cell(f'D{detail_row}', product_name_value,
                       font=Font(size=11, bold=True),
                       alignment=Alignment(horizontal='center', vertical='center'))

        # 店着原価（G列 data_row）
        store_cost_value = product_data.store_cost if product_data else None
        self._set_cell(f'G{data_row}', store_cost_value,
                       font=Font(size=16, bold=True),
                       alignment=Alignment(horizontal='center', vertical='center'))

        # 税抜売価（H列 data_row）
        price_value = product_data.price if product_data else None
        self._set_cell(f'H{data_row}', price_value,
                       font=Font(size=12, bold=True),
                       alignment=Alignment(horizontal='center', vertical='center'))

        # 入数（I列 detail_row, blank_row結合セル）
        quantity_value = product_data.quantity if product_data else None
        self._set_cell(f'I{detail_row}', quantity_value,
                       font=Font(size=14, bold=True),
                       alignment=Alignment(horizontal='center', vertical='center'))

        # 納品数（AU列 data_row）
        total_delivery_value = product_data.total_delivery if product_data else None
        self._set_cell(f'AU{data_row}', total_delivery_value,
                       font=Font(size=12, color=cfg.color_blue),
                       alignment=Alignment(horizontal='center', vertical='center'))

        # 帳合先（AV列 data_row）
        delivery_dest_value = product_data.delivery_dest if product_data else None
        self._set_cell(f'AV{data_row}', delivery_dest_value,
                       font=Font(size=12, bold=True),
                       alignment=Alignment(horizontal='center', vertical='center'))

        # 店舗配分数（J～AS列 detail_row）
        if product_data and product_data.store_quantities:
            self._populate_store_quantities(detail_row, product_data.store_quantities)

    def _populate_store_quantities(self, detail_row: int, store_quantities: Dict[str, int]) -> None:
        """店舗配分数をセルに入力

        Args:
            detail_row: 詳細情報行番号
            store_quantities: 店舗コードと配分数の辞書
        """
        # 店舗コードと列の対応マップ
        store_code_to_column = {
            '01': 'J', '02': 'K', '03': 'L', '05': 'M',
            '06': 'N', '07': 'O', '08': 'P', '23': 'Q',
            '24': 'R', '26': 'S', '28': 'T', '30': 'U',
            '32': 'V', '34': 'W', '36': 'X', '37': 'Y',
            '39': 'Z', '40': 'AA', '41': 'AB', '43': 'AC',
            '45': 'AD', '47': 'AE', '48': 'AF', '305': 'AG',
            '307': 'AH', '308': 'AI', '311': 'AJ', '313': 'AK',
            '314': 'AL', '317': 'AM', '318': 'AN', '341': 'AO',
            '342': 'AP', '343': 'AQ', '344': 'AR', '911': 'AS',
        }

        # 各店舗の配分数を入力
        for store_code, quantity in store_quantities.items():
            column = store_code_to_column.get(store_code)
            if column and quantity:
                self._set_cell(
                    f'{column}{detail_row}', quantity,
                    font=Font(size=11, bold=True),
                    alignment=Alignment(horizontal='center', vertical='center')
                )

    def _setup_formulas(self, data_row: int, detail_row: int, blank_row: int) -> None:
        """数式設定

        Args:
            data_row: 商品情報行番号
            detail_row: 詳細情報行番号
            blank_row: 空白行番号
        """
        cfg = self.config

        # 合計（AT列）
        self.ws[f'AT{data_row}'].value = f'=SUM(J{detail_row}:AS{blank_row})'
        self._set_cell(f'AT{data_row}', None,
                       font=Font(size=14, bold=True),
                       alignment=Alignment(horizontal='right'))

        # 税込価格（H列）
        self.ws[f'H{detail_row}'].value = f'=H{data_row}*1.08'
        self._set_cell(f'H{detail_row}', None,
                       font=Font(size=16, bold=True),
                       alignment=Alignment(horizontal='center'))
        self.ws[f'H{detail_row}'].number_format = r'#,##0_ ;[Red]\-#,##0\ '

        # 差異（AU列）
        self.ws[f'AU{detail_row}'].value = f'=AU{data_row}-AT{data_row}'
        self._set_cell(f'AU{detail_row}', None,
                       font=Font(size=14, bold=True, color=cfg.color_red),
                       alignment=Alignment(horizontal='center'))

        # センター送信済チェック（AX列）
        self.ws[f'AX{data_row}'].value = f'=IF(ISTEXT(AW{data_row}),"ｾﾝﾀｰ送信済"," ")'
        self._set_cell(f'AX{data_row}', None,
                       font=Font(size=16, bold=True),
                       alignment=Alignment(horizontal='center'))

    def _setup_cell_merges(self, data_row: int, detail_row: int, blank_row: int) -> None:
        """セル結合設定

        Args:
            data_row: 商品情報行番号
            detail_row: 詳細情報行番号
            blank_row: 空白行番号
        """
        # 3行すべて結合
        self.ws.merge_cells(f'B{data_row}:C{blank_row}')    # 店着日
        self.ws.merge_cells(f'G{data_row}:G{blank_row}')    # 店着原価
        self.ws.merge_cells(f'AT{data_row}:AT{blank_row}')  # 合計
        self.ws.merge_cells(f'AV{data_row}:AV{blank_row}')  # 帳合先
        self.ws.merge_cells(f'AX{data_row}:AY{blank_row}')  # センター送信

        # 2-3行のみ結合（1行目は独立）
        self.ws.merge_cells(f'D{detail_row}:E{blank_row}')  # 産地/品名
        self.ws.merge_cells(f'F{detail_row}:F{blank_row}')  # LFC着
        self.ws.merge_cells(f'H{detail_row}:H{blank_row}')  # 税込
        self.ws.merge_cells(f'I{detail_row}:I{blank_row}')  # 入数
        self.ws.merge_cells(f'AU{detail_row}:AU{blank_row}')  # 差異
        self.ws.merge_cells(f'AW{detail_row}:AW{blank_row}')  # AW列（非表示）

    def _merge_store_columns(self, detail_row: int, blank_row: int) -> None:
        """店舗列（J～AS）の結合

        Args:
            detail_row: 詳細情報行番号
            blank_row: 空白行番号
        """
        cfg = self.config
        for col_idx in range(cfg.col_j, cfg.col_as + 1):
            col_letter = get_column_letter(col_idx)
            self.ws.merge_cells(f'{col_letter}{detail_row}:{col_letter}{blank_row}')

    # ----------------- 罫線 -----------------
    def _setup_borders(self) -> None:
        """罫線設定"""
        self._setup_header_borders()
        self._setup_data_row_borders()

    def _setup_header_borders(self) -> None:
        """ヘッダー部分（7-8行）の罫線"""
        for col_idx in range(1, 49):  # A～AV
            col_letter = get_column_letter(col_idx)

            cell7 = self.ws[f'{col_letter}7']
            if col_idx == 1:  # A
                cell7.border = BorderFactory.create('thin', 'thin', 'medium', 'thin')
            elif col_idx in [2, 3]:  # B-C
                if col_idx == 2:
                    cell7.border = BorderFactory.create('thin', 'thin', 'thin', 'thin')
                else:
                    cell7.border = Border(top=BorderFactory.THIN, right=BorderFactory.THIN)
            elif col_idx in [4, 5]:  # D-E
                cell7.border = BorderFactory.create('thin', 'hair', 'thin', 'thin')
            elif col_idx in [6, 7, 9]:  # F,G,I
                cell7.border = BorderFactory.create('thin', 'thin', 'thin', 'thin')
            elif col_idx == 8:  # H
                cell7.border = BorderFactory.create('thin', 'hair', 'thin', 'thin')
            elif 10 <= col_idx <= 45:  # J～AS
                cell7.border = BorderFactory.create('thin', 'thin', 'thin', 'thin')
            elif col_idx in [46, 47, 48]:  # AT, AU, AV
                cell7.border = BorderFactory.create('thin', 'thin', 'thin', 'thin')

            cell8 = self.ws[f'{col_letter}8']
            if col_idx in [2, 3]:
                if col_idx == 2:
                    cell8.border = Border(bottom=BorderFactory.THIN, left=BorderFactory.THIN)
                else:
                    cell8.border = Border(bottom=BorderFactory.THIN, right=BorderFactory.THIN)
            elif col_idx == 4:  # D8（D8:E8結合の開始セル）
                cell8.border = BorderFactory.create('thin', 'thin', 'thin', None)
            elif col_idx == 5:  # E8（D8:E8結合の終了セル）
                # 結合セルの終端なので上下右の罫線を設定
                cell8.border = BorderFactory.create('thin', 'thin', None, 'thin')
            elif col_idx in [8, 9]:  # H8, I8
                cell8.border = BorderFactory.create(None, 'thin', 'thin', 'thin')
            elif 10 <= col_idx <= 45:
                cell8.border = BorderFactory.create('thin', 'thin', 'thin', 'thin')
            elif col_idx in [46, 47, 48]:  # AT, AU, AV
                cell8.border = BorderFactory.create('thin', 'thin', 'thin', 'thin')

    def _setup_data_row_borders(self) -> None:
        """データ行の罫線（ブロック数に応じて動的生成）"""
        cfg = self.config

        # データエリアの終了行を計算
        last_data_row = cfg.data_area_start + (cfg.num_blocks * cfg.block_size) - 1

        for row in range(cfg.data_area_start, last_data_row + 1):
            for col_idx in range(1, 50):  # A～AX
                col_letter = get_column_letter(col_idx)
                cell = self.ws[f'{col_letter}{row}']
                border = self._get_data_row_border(col_idx, row)
                if border:
                    cell.border = border

    def _get_data_row_border(self, col_idx: int, row: int) -> Optional[Border]:
        """データ行の罫線パターンを返す

        Args:
            col_idx: 列インデックス
            row: 行番号

        Returns:
            Border or None: 罫線オブジェクト
        """
        if col_idx == 1:  # A
            return Border(left=BorderFactory.MEDIUM, right=BorderFactory.THIN)

        # B-C, G, AT, AV: 3行結合
        if col_idx in [2, 3, 7, 46, 48]:
            return self._get_merged_3row_border(row)

        # D-E, F, H, I, J-AS, AU: 1行独立＋2行結合
        if (4 <= col_idx <= 6) or (col_idx in [8, 9]) or (10 <= col_idx <= 45) or (col_idx == 47):
            return self._get_split_merge_border(row)

        return None

    def _get_merged_3row_border(self, row: int) -> Border:
        """3行すべて結合の罫線

        Args:
            row: 行番号

        Returns:
            Border: 罫線オブジェクト
        """
        cfg = self.config
        # 行がどのブロックのどの位置にいるか判定
        relative_row = (row - cfg.data_area_start) % cfg.block_size

        if relative_row == 0:      # data_row（上端）
            return BorderFactory.create('thin', None, 'thin', 'thin')
        elif relative_row == 2:    # blank_row（下端）
            return BorderFactory.create(None, 'thin', 'thin', 'thin')
        else:                      # detail_row（中間）
            return Border(left=BorderFactory.THIN, right=BorderFactory.THIN)

    def _get_split_merge_border(self, row: int) -> Border:
        """1行独立＋2行結合の罫線

        Args:
            row: 行番号

        Returns:
            Border: 罫線オブジェクト
        """
        cfg = self.config
        # 行がどのブロックのどの位置にいるか判定
        relative_row = (row - cfg.data_area_start) % cfg.block_size

        if relative_row == 0:      # data_row（独立）
            return BorderFactory.create('thin', 'thin', 'thin', 'thin')
        elif relative_row == 1:    # detail_row（結合上部）
            return BorderFactory.create('thin', None, 'thin', 'thin')
        elif relative_row == 2:    # blank_row（結合下部）
            return BorderFactory.create(None, 'thin', 'thin', 'thin')
        return BorderFactory.create('thin', 'thin', 'thin', 'thin')

    # ----------------- 名前定義 -----------------
    def _setup_named_ranges(self) -> None:
        """セルに名前を定義（ブロック数に応じて動的生成）"""
        cfg = self.config

        for block_idx in range(cfg.num_blocks):
            block_num = block_idx + 1  # 1から始まる番号
            data_row = cfg.data_area_start + (block_idx * cfg.block_size)
            detail_row = data_row + 1
            blank_row = data_row + 2

            # 基本情報の名前定義
            self._define_basic_names(data_row, detail_row, blank_row, block_num)

            # 店舗配分の名前定義
            self._define_store_names(detail_row, blank_row, block_num)

    def _define_basic_names(self, data_row: int, detail_row: int,
                           blank_row: int, block_num: int) -> None:
        """基本情報の名前定義

        Args:
            data_row: 商品情報行番号
            detail_row: 詳細情報行番号
            blank_row: 空白行番号
            block_num: ブロック番号（1から始まる）
        """
        # 店着日 (B:C列、3行結合)
        name = f'店着日_{block_num}'
        defined_name = DefinedName(name, attr_text=f"'配分書'!$B${data_row}:$C${blank_row}")
        self.wb.defined_names[name] = defined_name

        # 産地 (D列、data_rowのみ)
        name = f'産地_{block_num}'
        defined_name = DefinedName(name, attr_text=f"'配分書'!$D${data_row}")
        self.wb.defined_names[name] = defined_name

        # 規格 (E列、data_rowのみ)
        name = f'規格_{block_num}'
        defined_name = DefinedName(name, attr_text=f"'配分書'!$E${data_row}")
        self.wb.defined_names[name] = defined_name

        # 品名 (D:E列、detail_row～blank_row結合)
        name = f'品名_{block_num}'
        defined_name = DefinedName(name, attr_text=f"'配分書'!$D${detail_row}:$E${blank_row}")
        self.wb.defined_names[name] = defined_name

        # 店着原価 (G列、3行結合)
        name = f'店着原価_{block_num}'
        defined_name = DefinedName(name, attr_text=f"'配分書'!$G${data_row}:$G${blank_row}")
        self.wb.defined_names[name] = defined_name

        # 税抜売価 (H列、data_rowのみ)
        name = f'税抜売価_{block_num}'
        defined_name = DefinedName(name, attr_text=f"'配分書'!$H${data_row}")
        self.wb.defined_names[name] = defined_name

        # 入数 (I列、detail_row～blank_row結合)
        name = f'入数_{block_num}'
        defined_name = DefinedName(name, attr_text=f"'配分書'!$I${detail_row}:$I${blank_row}")
        self.wb.defined_names[name] = defined_name

        # 総納品数 (AU列、data_rowのみ)
        name = f'総納品数_{block_num}'
        defined_name = DefinedName(name, attr_text=f"'配分書'!$AU${data_row}")
        self.wb.defined_names[name] = defined_name

        # 帳合先 (AV列、3行結合)
        name = f'帳合先_{block_num}'
        defined_name = DefinedName(name, attr_text=f"'配分書'!$AV${data_row}:$AV${blank_row}")
        self.wb.defined_names[name] = defined_name

    def _define_store_names(self, detail_row: int, blank_row: int,
                           block_num: int) -> None:
        """店舗配分の名前定義

        Args:
            detail_row: 詳細情報行番号
            blank_row: 空白行番号
            block_num: ブロック番号（1から始まる）
        """
        # 店舗コードと列の対応リスト
        store_codes = [
            ('01', 'J'), ('02', 'K'), ('03', 'L'), ('05', 'M'),
            ('06', 'N'), ('07', 'O'), ('08', 'P'), ('23', 'Q'),
            ('24', 'R'), ('26', 'S'), ('28', 'T'), ('30', 'U'),
            ('32', 'V'), ('34', 'W'), ('36', 'X'), ('37', 'Y'),
            ('39', 'Z'), ('40', 'AA'), ('41', 'AB'), ('43', 'AC'),
            ('45', 'AD'), ('47', 'AE'), ('48', 'AF'), ('305', 'AG'),
            ('307', 'AH'), ('308', 'AI'), ('311', 'AJ'), ('313', 'AK'),
            ('314', 'AL'), ('317', 'AM'), ('318', 'AN'), ('341', 'AO'),
            ('342', 'AP'), ('343', 'AQ'), ('344', 'AR'), ('911', 'AS'),
        ]

        for store_code, col_letter in store_codes:
            name = f'store{store_code}配分数_{block_num}'
            cell_range = f"'配分書'!${col_letter}${detail_row}:${col_letter}${blank_row}"
            defined_name = DefinedName(name, attr_text=cell_range)
            self.wb.defined_names[name] = defined_name

    # ----------------- ユーティリティ -----------------
    def _set_cell(self, cell_addr: str, value: Optional[any] = None,
                  font: Optional[Font] = None,
                  alignment: Optional[Alignment] = None,
                  border: Optional[Border] = None,
                  style_name: Optional[str] = None) -> None:
        """セルに値と書式を設定

        Args:
            cell_addr: セルアドレス（例: 'A1'）
            value: セル値
            font: フォント（style_nameより優先）
            alignment: 配置（style_nameより優先）
            border: 罫線
            style_name: NamedStyleの名前（高速化用）
        """
        cell = self.ws[cell_addr]
        if value is not None:
            cell.value = value

        # NamedStyleを使う（高速）
        if style_name and not font and not alignment:
            cell.style = style_name
        else:
            # 従来の方法（互換性のため）
            if font:
                cell.font = font
            if alignment:
                cell.alignment = alignment

        if border:
            cell.border = border

    # ----------------- 印刷設定 -----------------
    def _setup_print_settings(self) -> None:
        """印刷設定（A4横、全列を1ページに収める）"""
        # ページ設定
        self.ws.page_setup.orientation = self.ws.ORIENTATION_LANDSCAPE  # 横向き
        self.ws.page_setup.paperSize = self.ws.PAPERSIZE_A4  # A4サイズ

        # ページに合わせる設定を有効化
        self.ws.page_setup.fitToPage = True
        self.ws.page_setup.fitToWidth = 1   # 幅を1ページに収める
        self.ws.page_setup.fitToHeight = 0  # 高さは自動（0=制限なし）

        # 余白設定（単位：インチ）
        self.ws.page_margins = PageMargins(
            left=0.5,    # 左余白
            right=0.5,   # 右余白
            top=0.75,    # 上余白
            bottom=0.75, # 下余白
            header=0.3,  # ヘッダー余白
            footer=0.3   # フッター余白
        )

        # 印刷品質とその他の設定
        self.ws.print_options.horizontalCentered = True  # 水平方向に中央配置
        self.ws.print_options.verticalCentered = False   # 垂直方向は上詰め


def main() -> int:
    """メイン処理

    Returns:
        int: 終了コード（0=成功、1=失敗）
    """
    try:
        # デフォルト設定で作成（1ブロック = 1商品分）
        creator = HaibunTemplateCreator()
        output_file = creator.create_template()
        print(f"\n作成完了: {output_file}")

        # ブロック数を変更する場合の例:
        # config = TemplateConfig(num_blocks=3, default_output_path='配分表_3商品.xlsx')
        # creator = HaibunTemplateCreator(config=config)
        # output_file = creator.create_template()
        # print(f"\n作成完了: {output_file}")

        return 0

    except Exception as e:
        print(f"\n処理中にエラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    exit(main())
