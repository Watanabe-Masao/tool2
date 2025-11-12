#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
配分表テンプレート作成WebアプリケーションAPI
FastAPIを使用したバックエンドサーバー
"""

import os
import io
import uuid
from datetime import datetime
from typing import Optional
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import StreamingResponse, HTMLResponse, FileResponse
from fastapi import Request
from pydantic import BaseModel, Field
from typing import Dict, List

from haibun_template_creator import (
    HaibunTemplateCreator,
    TemplateConfig,
    StoreData,
    ProductData
)

import openpyxl
from weasyprint import HTML


# アプリケーションバージョン（静的ファイルのキャッシュバスティング用）
APP_VERSION = "1.1.4"

# FastAPIアプリケーション初期化
app = FastAPI(
    title="配分表テンプレート作成API",
    description="Excelの配分表テンプレートを生成するWebアプリケーション",
    version=APP_VERSION
)

# 静的ファイルとテンプレートの設定
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# キャッシュ制御ミドルウェア
@app.middleware("http")
async def add_cache_control_header(request: Request, call_next):
    """
    静的ファイルにCache-Controlヘッダーを追加
    バージョンクエリパラメータがある場合は長期間キャッシュ
    """
    response = await call_next(request)

    # 静的ファイルの場合
    if request.url.path.startswith("/static/"):
        # バージョンパラメータがある場合は1年間キャッシュ
        if "v=" in request.url.query:
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        else:
            # バージョンパラメータがない場合は短期間のみキャッシュ
            response.headers["Cache-Control"] = "public, max-age=3600"

    return response

# 一時ファイル保存ディレクトリ
TEMP_DIR = Path("temp_files")
TEMP_DIR.mkdir(exist_ok=True)


def safe_get_rgb_color(color_obj) -> Optional[str]:
    """
    openpyxlの色オブジェクトから安全にRGB色を取得

    Args:
        color_obj: openpyxlの色オブジェクト（Color.rgb属性）

    Returns:
        Optional[str]: HTML色コード（例: #FFFFFF）、取得できない場合はNone
    """
    if not color_obj:
        return None

    try:
        # RGBオブジェクトを文字列に変換
        rgb_str = str(color_obj)

        # 有効な8桁のARGB形式かチェック
        if rgb_str and isinstance(rgb_str, str) and len(rgb_str) == 8:
            # 透明または黒をスキップ
            if rgb_str in ('00000000', 'FF000000'):
                return None
            # ARGBからRGBに変換（最初の2桁（アルファ）を除去）
            return f'#{rgb_str[2:]}'

        return None
    except (TypeError, AttributeError, ValueError):
        return None


def excel_to_html(excel_path: Path) -> str:
    """
    ExcelファイルをHTMLに変換（書式を保持）

    Args:
        excel_path: Excelファイルのパス

    Returns:
        str: HTML文字列
    """
    wb = openpyxl.load_workbook(excel_path)
    ws = wb.active

    # 列幅情報を収集
    col_widths = {}
    for col_idx in range(1, ws.max_column + 1):
        col_letter = openpyxl.utils.get_column_letter(col_idx)
        width = ws.column_dimensions[col_letter].width
        if width:
            # Excel列幅 → ピクセル変換（より正確な計算）
            col_widths[col_idx] = int(width * 7.5)
        else:
            col_widths[col_idx] = 64  # デフォルト幅

    # 行高情報を収集
    row_heights = {}
    for row_idx in range(1, ws.max_row + 1):
        height = ws.row_dimensions[row_idx].height
        if height:
            # Excel行高 → ピクセル変換
            row_heights[row_idx] = int(height * 1.33)
        else:
            row_heights[row_idx] = 20  # デフォルト高

    # テーブルの合計幅を計算
    table_width = sum(col_widths.values())

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4 landscape;
                margin: 10mm;
            }}
            body {{
                font-family: 'Meiryo', 'MS Gothic', sans-serif;
                margin: 0;
                padding: 10px;
            }}
            table {{
                border-collapse: collapse;
                width: {table_width}px;
                table-layout: fixed;
                font-size: 9pt;
            }}
            td {{
                border: 1px solid #000000;
                padding: 2px 4px;
                overflow: hidden;
                text-overflow: ellipsis;
                vertical-align: middle;
            }}
        </style>
    </head>
    <body>
        <table>
    """

    # 列幅を定義
    html += "<colgroup>"
    for col_idx in range(1, ws.max_column + 1):
        html += f'<col style="width: {col_widths[col_idx]}px;">'
    html += "</colgroup>\n"

    # 結合セルの情報を取得
    merged_ranges = list(ws.merged_cells.ranges)

    # 各行を処理
    for row_idx in range(1, ws.max_row + 1):
        row_height = row_heights[row_idx]
        html += f'<tr style="height: {row_height}px;">'

        for col_idx in range(1, ws.max_column + 1):
            cell = ws.cell(row=row_idx, column=col_idx)

            # この結合セルがスキップされるべきかチェック
            skip = False
            for merged_range in merged_ranges:
                if (merged_range.min_row <= row_idx <= merged_range.max_row and
                    merged_range.min_col <= col_idx <= merged_range.max_col):
                    if not (row_idx == merged_range.min_row and col_idx == merged_range.min_col):
                        skip = True
                        break

            if skip:
                continue

            # 結合セルの場合、rowspanとcolspanを設定
            rowspan = 1
            colspan = 1
            for merged_range in merged_ranges:
                if (row_idx == merged_range.min_row and col_idx == merged_range.min_col):
                    rowspan = merged_range.max_row - merged_range.min_row + 1
                    colspan = merged_range.max_col - merged_range.min_col + 1
                    break

            # セルのスタイルを取得
            styles = []

            # 背景色
            if cell.fill and cell.fill.start_color:
                bg_color = safe_get_rgb_color(cell.fill.start_color.rgb)
                if bg_color:
                    styles.append(f'background-color: {bg_color}')

            # フォント設定
            if cell.font:
                if cell.font.size:
                    styles.append(f'font-size: {cell.font.size}pt')
                if cell.font.bold:
                    styles.append('font-weight: bold')
                if cell.font.color:
                    font_color = safe_get_rgb_color(cell.font.color.rgb)
                    if font_color:
                        styles.append(f'color: {font_color}')

            # テキスト配置
            if cell.alignment:
                if cell.alignment.horizontal:
                    h_align = cell.alignment.horizontal
                    if h_align == 'left':
                        styles.append('text-align: left')
                    elif h_align == 'center':
                        styles.append('text-align: center')
                    elif h_align == 'right':
                        styles.append('text-align: right')
                else:
                    styles.append('text-align: center')  # デフォルト

                if cell.alignment.vertical:
                    v_align = cell.alignment.vertical
                    if v_align == 'top':
                        styles.append('vertical-align: top')
                    elif v_align == 'center':
                        styles.append('vertical-align: middle')
                    elif v_align == 'bottom':
                        styles.append('vertical-align: bottom')
            else:
                styles.append('text-align: center')  # デフォルト

            # セルの値を取得（数式の場合は結果値を取得）
            value = cell.value if cell.value is not None else ""

            # 数値の場合、フォーマットを適用
            if isinstance(value, (int, float)):
                if cell.number_format and cell.number_format != 'General':
                    # 簡易的なフォーマット処理
                    if '0.00' in cell.number_format or '#,##0' in cell.number_format:
                        value = f'{value:,.2f}' if '.' in str(value) or '.00' in cell.number_format else f'{int(value):,}'
                    elif '%' in cell.number_format:
                        value = f'{value * 100:.0f}%'
                    else:
                        value = str(value)
                else:
                    value = str(value)

            # HTML特殊文字をエスケープ
            value = str(value).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

            rowspan_attr = f' rowspan="{rowspan}"' if rowspan > 1 else ''
            colspan_attr = f' colspan="{colspan}"' if colspan > 1 else ''
            style_attr = f' style="{"; ".join(styles)}"' if styles else ''

            html += f'<td{rowspan_attr}{colspan_attr}{style_attr}>{value}</td>'

        html += "</tr>\n"

    html += """
        </table>
    </body>
    </html>
    """

    wb.close()
    return html


# リクエストモデル
class ProductDataRequest(BaseModel):
    """商品データリクエスト"""
    delivery_date: Optional[str] = Field(default=None, description="納品日（YYYY-MM-DD形式）")
    origin: Optional[str] = Field(default=None, max_length=30, description="産地")
    standard: Optional[str] = Field(default=None, max_length=20, description="規格")
    product_name: Optional[str] = Field(default=None, max_length=50, description="品名")
    store_cost: Optional[float] = Field(default=None, description="店着原価")
    price: Optional[float] = Field(default=None, description="税抜売価")
    quantity: Optional[int] = Field(default=None, description="入数")
    total_delivery: Optional[int] = Field(default=None, description="総納品数")
    delivery_dest: Optional[str] = Field(default=None, max_length=30, description="納品先")
    store_quantities: Dict[str, int] = Field(default_factory=dict, description="店舗配分数")


class TemplateRequest(BaseModel):
    """テンプレート生成リクエスト"""
    num_blocks: int = Field(default=1, ge=1, le=100, description="商品ブロック数（1-100）")
    output_filename: Optional[str] = Field(
        default=None,
        description="出力ファイル名（省略時は自動生成）"
    )
    buyer_name: Optional[str] = Field(
        default=None,
        max_length=20,
        description="担当バイヤー名（最大20文字）"
    )
    pixel_100: Optional[float] = Field(default=13.5714285714, description="100ピクセル列幅")
    pixel_50: Optional[float] = Field(default=6.4285714286, description="50ピクセル列幅")
    products: List[ProductDataRequest] = Field(default_factory=list, description="商品データリスト")


# レスポンスモデル
class TemplateResponse(BaseModel):
    """テンプレート生成レスポンス"""
    success: bool
    message: str
    download_url: Optional[str] = None
    filename: Optional[str] = None


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """
    ルートページ - フロントエンドUIを表示
    """
    response = templates.TemplateResponse("index.html", {
        "request": request,
        "version": APP_VERSION
    })
    # HTMLページはキャッシュしない（常に最新版を取得）
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.post("/api/generate", response_model=TemplateResponse)
async def generate_template(req: TemplateRequest):
    """
    テンプレート生成API

    Args:
        req: テンプレート生成リクエスト

    Returns:
        TemplateResponse: 生成結果とダウンロードURL
    """
    try:
        # ファイル名の生成
        if req.output_filename:
            filename = req.output_filename
            if not filename.endswith('.xlsx'):
                filename += '.xlsx'
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"配分表_テンプレート_{timestamp}.xlsx"

        # 一時ファイルパス
        file_id = str(uuid.uuid4())
        temp_path = TEMP_DIR / f"{file_id}.xlsx"

        # 設定作成
        config = TemplateConfig(
            num_blocks=req.num_blocks,
            pixel_100=req.pixel_100,
            pixel_50=req.pixel_50,
            default_output_path=str(temp_path)
        )

        # 商品データをProductDataオブジェクトに変換
        products = []
        for product_req in req.products:
            product_data = ProductData(
                delivery_date=product_req.delivery_date,
                origin=product_req.origin,
                standard=product_req.standard,
                product_name=product_req.product_name,
                store_cost=product_req.store_cost,
                price=product_req.price,
                quantity=product_req.quantity,
                total_delivery=product_req.total_delivery,
                delivery_dest=product_req.delivery_dest,
                store_quantities=product_req.store_quantities
            )
            products.append(product_data)

        # テンプレート生成
        creator = HaibunTemplateCreator(config=config)
        output_path = creator.create_template(
            buyer_name=req.buyer_name,
            products=products
        )

        # ダウンロードURL生成
        download_url = f"/api/download/{file_id}?filename={filename}"

        return TemplateResponse(
            success=True,
            message="テンプレートの生成に成功しました",
            download_url=download_url,
            filename=filename
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"テンプレート生成中にエラーが発生しました: {str(e)}"
        )


@app.get("/api/download/{file_id}")
async def download_template(file_id: str, filename: str = "配分表_テンプレート.xlsx"):
    """
    生成されたテンプレートファイルをダウンロード

    Args:
        file_id: ファイルID
        filename: ダウンロード時のファイル名

    Returns:
        StreamingResponse: Excelファイル
    """
    try:
        # ファイルパス取得
        temp_path = TEMP_DIR / f"{file_id}.xlsx"

        if not temp_path.exists():
            raise HTTPException(
                status_code=404,
                detail="ファイルが見つかりません"
            )

        # ファイルを読み込み
        with open(temp_path, "rb") as f:
            file_content = f.read()

        # 注意: ファイルは削除せず、複数回ダウンロード可能にする
        # クリーンアップはshutdownイベントで実行される

        # 日本語ファイル名のエンコード（RFC 5987対応）
        # ASCIIフォールバック用にtemplate.xlsxを設定
        encoded_filename = quote(filename.encode('utf-8'))

        # ストリーミングレスポンス
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                # RFC 5987形式: ASCIIフォールバック + UTF-8エンコード
                "Content-Disposition": f"attachment; filename=\"template.xlsx\"; filename*=UTF-8''{encoded_filename}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"ファイルのダウンロード中にエラーが発生しました: {str(e)}"
        )


@app.post("/api/preview")
async def preview_template(req: TemplateRequest):
    """
    テンプレートのPDFプレビューを生成

    Args:
        req: テンプレート生成リクエスト

    Returns:
        FileResponse: PDFファイル
    """
    try:
        # 一時ファイルパス
        file_id = str(uuid.uuid4())
        temp_excel_path = TEMP_DIR / f"{file_id}.xlsx"
        temp_pdf_path = TEMP_DIR / f"{file_id}.pdf"

        # 設定作成
        config = TemplateConfig(
            num_blocks=req.num_blocks,
            pixel_100=req.pixel_100,
            pixel_50=req.pixel_50,
            default_output_path=str(temp_excel_path)
        )

        # 商品データをProductDataオブジェクトに変換
        products = []
        for product_req in req.products:
            product_data = ProductData(
                delivery_date=product_req.delivery_date,
                origin=product_req.origin,
                standard=product_req.standard,
                product_name=product_req.product_name,
                store_cost=product_req.store_cost,
                price=product_req.price,
                quantity=product_req.quantity,
                total_delivery=product_req.total_delivery,
                delivery_dest=product_req.delivery_dest,
                store_quantities=product_req.store_quantities
            )
            products.append(product_data)

        # テンプレート生成
        creator = HaibunTemplateCreator(config=config)
        creator.create_template(
            buyer_name=req.buyer_name,
            products=products
        )

        # ExcelをHTMLに変換してからPDFに変換（weasyprint使用）
        html_content = excel_to_html(temp_excel_path)

        # HTMLをPDFに変換
        HTML(string=html_content).write_pdf(str(temp_pdf_path))

        if not temp_pdf_path.exists():
            raise Exception("PDFファイルが生成されませんでした")

        # PDFを返す
        return FileResponse(
            path=str(temp_pdf_path),
            media_type="application/pdf",
            filename="preview.pdf",
            headers={
                "Content-Disposition": "inline; filename=preview.pdf"
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDFプレビュー生成中にエラーが発生しました: {str(e)}"
        )


@app.get("/api/health")
@app.head("/api/health")
async def health_check():
    """
    ヘルスチェックエンドポイント（GET/HEADメソッド対応）
    """
    return {"status": "ok", "message": "API is running"}


@app.get("/api/version")
async def get_version():
    """
    現在のアプリケーションバージョンを返す
    """
    return {
        "version": APP_VERSION,
        "pdf_preview_available": True,
        "cache_busting_enabled": True
    }


@app.head("/")
async def root_head():
    """
    ルートパスのHEADリクエスト対応（Renderヘルスチェック用）
    """
    return Response(status_code=200)


@app.on_event("startup")
async def startup_event():
    """
    アプリケーション起動時の処理
    """
    port = os.getenv("PORT", "8000")
    print("=" * 60)
    print("配分表テンプレート作成Webアプリケーションを起動しました")
    print(f"PORT: {port}")
    print("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """
    アプリケーション終了時の処理 - 一時ファイルのクリーンアップ
    """
    print("一時ファイルをクリーンアップ中...")
    try:
        for file in TEMP_DIR.glob("*.xlsx"):
            file.unlink()
        for file in TEMP_DIR.glob("*.pdf"):
            file.unlink()
        print("クリーンアップ完了")
    except Exception as e:
        print(f"クリーンアップ中にエラーが発生: {e}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
