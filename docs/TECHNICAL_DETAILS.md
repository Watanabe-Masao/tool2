# 技術詳細ドキュメント

このドキュメントでは、プロジェクトで遭遇した技術的課題とその解決策を詳細に記録しています。
今後のリファクタリングや機能追加の参考資料として活用してください。

---

## 目次

1. [PDFプレビューの列ずれ問題](#pdf-preview-column-alignment)
2. [iPhoneダウンロード問題](#iphone-safari-download)
3. [AW列（センター送信日）の表示対応](#aw-column-center-send-date)
4. [Safari日付表示問題](#safari-date-display)
5. [非表示列の処理戦略](#hidden-columns-strategy)

---

## PDF Preview Column Alignment

### 問題の概要

**症状**: PDFプレビュー機能でExcelファイルを表示すると、列が意図しない位置にずれる問題が発生。

**具体的な症状**:
- H7「税抜」の下にH8「税込」が表示されるべきところ、「01（店舗コード）」の下に「入数」が表示される
- I7「ケース」の下にI8「入数」が表示されるべきところ、「02（店舗コード）」の下に他の値が表示される
- 全体的に列が右にずれており、右端の「帳合先」や「差異」は正しい位置に突き抜けて表示される

### 原因分析

#### 根本原因
LibreOfficeのPDF変換処理において、**非表示列（hidden=True）**の扱いが不適切だった。

#### 非表示列の構成
- **A列**: 商品コード列（使用していない、hidden=True）
- **F列**: LFC着列（使用していない、hidden=True）
- **AW列**: センター送信日列（当初hidden=True、後に表示列に変更）

#### LibreOfficeの挙動
1. Excel→ODS変換時、非表示列も内部的には保持される
2. ODS→PDF変換時、非表示列の**列幅**や**セルの内容**が列位置計算に影響
3. 特に**結合セル**や**列幅設定**がある場合、列カウントが狂う
4. 結果として、表示列の位置が意図せずずれる

### 試行した解決策

#### ❌ 試行1: 列幅の最小化（コミット: 27c0bdf）
```python
# 非表示列の幅を極小値に設定
for col in ['A', 'F', 'AW']:
    ws.column_dimensions[col].width = 0.08333
    ws.column_dimensions[col].hidden = True
```

**結果**: 一部改善したが、まだ列ずれが残る

#### ❌ 試行2: 結合セルの削除（コミット: 21eae1b, 93b8f5d）
```python
# 非表示列の結合セルを削除
# F7:F8の結合を削除
# A7:A8の結合を削除
```

**結果**: さらに改善したが、完全には解決せず

#### ❌ 試行3: 物理的な列削除（コミット: b4e89bf）
```python
# PDF変換前に非表示列を物理削除
hidden_specs = [
    ('AW', 49),  # 後ろから削除
    ('F', 6),
    ('A', 1),
]

for col_idx, col_letter in sorted(columns_to_delete, reverse=True):
    ws.delete_cols(col_idx, 1)
```

**結果**: **書式が完全に崩れる**（Excelファイル構造が壊れる）

#### ✅ 試行4: 内容クリア方式（コミット: 0f8ebde）
```python
# 非表示列の内容のみクリア（列は削除しない）
hidden_columns = ['A', 'F']

for col_letter in hidden_columns:
    if ws.column_dimensions[col_letter].hidden:
        # 内容をクリア
        for row in range(1, ws.max_row + 1):
            cell = ws[f'{col_letter}{row}']
            if not isinstance(cell, openpyxl.cell.cell.MergedCell):
                cell.value = None
                cell.number_format = 'General'

        # 列幅を極小値に設定
        ws.column_dimensions[col_letter].width = 0.08333
```

**結果**: **成功** - 書式を保ちつつ列ずれを防止

### 最終解決策

**方針**: Excel​ファイル構造を変更せず、PDF変換前に非表示列の**内容のみクリア**

**実装場所**: `app.py:prepare_excel_for_pdf_conversion()`

**処理フロー**:
1. Excelファイル生成（通常通り、非表示列含む）
2. PDFプレビュー時のみ、一時ファイルをコピー
3. コピーしたファイルで非表示列の内容をクリア
4. LibreOfficeでPDF変換
5. 元のExcelファイルは保持（ダウンロード用）

**コード**:
```python
def prepare_excel_for_pdf_conversion(excel_path: Path) -> None:
    """PDF変換用にExcelファイルを最適化"""
    wb = openpyxl.load_workbook(excel_path)
    ws = wb.active

    # 非表示列の処理（A, Fのみ。AWは表示列）
    hidden_columns = ['A', 'F']

    for col_letter in hidden_columns:
        if ws.column_dimensions[col_letter].hidden:
            # 列の全セルの内容をクリア
            for row in range(1, ws.max_row + 1):
                cell = ws[f'{col_letter}{row}']
                if not isinstance(cell, openpyxl.cell.cell.MergedCell):
                    cell.value = None
                    cell.number_format = 'General'

            # 列幅を極小値に設定
            ws.column_dimensions[col_letter].width = 0.08333

    # 日付を文字列に変換（Safari対応）
    weekday_ja = ['月', '火', '水', '木', '金', '土', '日']
    for row in ws.iter_rows(min_row=7, max_row=100):
        for cell in row:
            if isinstance(cell.value, datetime):
                weekday_str = weekday_ja[cell.value.weekday()]
                date_str = cell.value.strftime(f'%m/%d({weekday_str})')
                cell.value = date_str
                cell.number_format = '@'

    wb.save(excel_path)
    wb.close()
```

### 学んだ教訓

1. **構造を変えない**: Excelファイルの列削除は書式崩れの原因になる
2. **内容クリアで対応**: 列を残したまま内容をクリアすれば安全
3. **MergedCellチェック**: 結合セルは読み取り専用なのでスキップ必須
4. **LibreOfficeの癖**: 非表示列でも内容があると列計算に影響する

---

## iPhone Safari Download

### 問題の概要

**症状**: iPhoneのSafariブラウザで「テンプレート生成」後、ダウンロードボタンをタップしてもExcelファイルがダウンロードされない。

### 原因分析

**セキュリティ制限**: iOSのSafariでは、JavaScriptで動的に作成した`<a>`タグの自動クリックがセキュリティ上の理由でブロックされる。

**従来のコード**:
```javascript
function handleDownload() {
    // ダウンロードリンクを作成してクリック
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = downloadFilename || 'template.xlsx';
    document.body.appendChild(a);
    a.click();  // ← iOSでブロックされる
    document.body.removeChild(a);
}
```

**ブロックされる理由**:
- ユーザーの直接操作（タップ/クリック）なしでダウンロードが開始される
- iOSは「プログラマティックダウンロード」を制限

### 解決策

**方針**: モバイルデバイスでは**モーダル**を表示し、ユーザーが**直接タップ**できるリンクを提供

**実装**:

#### 1. モバイルデバイス検出
```javascript
function handleDownload() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
        showDownloadModal();  // モーダル表示
    } else {
        // デスクトップは従来通り自動ダウンロード
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = downloadFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
```

#### 2. ダウンロードモーダル
```html
<div class="download-modal" id="downloadModal" style="display: none;">
    <div class="download-modal-content">
        <h3>📥 ファイルの準備ができました</h3>
        <p>下のボタンをタップしてExcelファイルをダウンロードしてください。</p>
        <a href="#" id="downloadModalLink" class="download-modal-link" download>
            ダウンロード
        </a>
        <button id="downloadModalClose">閉じる</button>
    </div>
</div>
```

#### 3. モーダル表示処理
```javascript
function showDownloadModal() {
    const modal = document.getElementById('downloadModal');
    const downloadLink = document.getElementById('downloadModalLink');

    // ダウンロードリンクを設定
    downloadLink.href = downloadUrl;
    downloadLink.download = downloadFilename || 'template.xlsx';

    // モーダルを表示
    modal.style.display = 'flex';

    // 閉じるボタン
    document.getElementById('downloadModalClose').onclick = () => {
        modal.style.display = 'none';
    };
}
```

### 動作フロー

1. ユーザーが「テンプレート生成」をタップ
2. Excel生成完了後、`handleDownload()`呼び出し
3. デバイス検出：iPhone/iPad/Android → モーダル表示
4. ユーザーが「ダウンロード」ボタンを**直接タップ**
5. ダウンロード開始（ユーザージェスチャーとして認識）

### メリット

- ✅ iPhoneのSafariでダウンロード可能
- ✅ Androidでも動作
- ✅ デスクトップは従来の自動ダウンロードを維持
- ✅ ユーザーにとって明示的でわかりやすい

---

## AW Column Center Send Date

### 要件

**背景**: センターにメールを送った日付を記録する欄が必要

**対応**: AW列を非表示列から表示列に変更

### 変更内容

#### 1. haibun_template_creator.py

**列幅設定**:
```python
# 非表示列リストからAWを除外
for col in ['A', 'F']:  # AWは除外
    ws.column_dimensions[col].width = 0.08333
    ws.column_dimensions[col].hidden = True

# AW列を表示列として追加
special_widths = {
    'AT': 7.09765625,
    'AU': 13.0,
    'AV': 12.8984375,
    'AW': 12.0,  # センター送信日
    'AX': 8.09765625
}
```

**ヘッダー設定**:
```python
# AW7:AW8にヘッダー追加
ws['AW7'] = 'センター送信日'
ws.merge_cells('AW7:AW8')
```

**データ行結合**:
```python
# 各商品ブロック（9-11, 12-14, ...）でAW列を結合
ws.merge_cells(f'AW{data_row}:AW{blank_row}')
```

#### 2. app.py

**PDF変換処理から除外**:
```python
# AWは表示列なので処理対象外
hidden_columns = ['A', 'F']  # AWは含めない
```

#### 3. テスト更新

```python
# AW7:AW8の結合確認
assert 'AW7:AW8' in merged_ranges

# AW7のヘッダーテキスト確認
assert ws['AW7'].value == 'センター送信日'

# AW列の表示状態確認
assert ws.column_dimensions['AW'].hidden == False
assert ws.column_dimensions['AW'].width == 12.0
```

---

## Safari Date Display

### 問題の概要

**症状**: SafariブラウザでPDFプレビューを表示すると、日付（datetime型）が正しく表示されない。Chromeでは問題なし。

### 原因

LibreOfficeのPDF変換時、datetime型の値がSafariで認識できない形式になる可能性がある。

### 解決策

**PDF変換前に日付を文字列に変換**（日本語曜日付き）

```python
weekday_ja = ['月', '火', '水', '木', '金', '土', '日']

for row in ws.iter_rows(min_row=7, max_row=100):
    for cell in row:
        if isinstance(cell.value, datetime):
            weekday_str = weekday_ja[cell.value.weekday()]
            date_str = cell.value.strftime(f'%m/%d({weekday_str})')
            cell.value = date_str
            cell.number_format = '@'  # テキスト形式
```

**表示例**:
- 変換前: `2025-01-20` (datetime)
- 変換後: `01/20(月)` (文字列)

---

## Hidden Columns Strategy

### 非表示列の戦略まとめ

本プロジェクトでは、非表示列を以下のように扱っています。

### 現在の非表示列

| 列 | 用途 | hidden | width | PDF変換時の処理 |
|----|------|--------|-------|----------------|
| A  | 商品コード（未使用） | True | 0.08333 | 内容クリア |
| F  | LFC着（未使用） | True | 0.08333 | 内容クリア |
| AW | センター送信日 | **False** | 12.0 | **処理なし** |

### ベストプラクティス

#### 1. 新しい非表示列を追加する場合

```python
# haibun_template_creator.py
for col in ['A', 'F', '新列']:
    ws.column_dimensions[col].width = 0.08333
    ws.column_dimensions[col].hidden = True
```

```python
# app.py (PDF変換処理)
hidden_columns = ['A', 'F', '新列']
```

#### 2. 非表示列を表示列に変更する場合

1. `haibun_template_creator.py`: 非表示列リストから除外
2. `special_widths`に追加
3. ヘッダーを設定
4. `app.py`: PDF変換処理から除外
5. テストを更新

#### 3. 列を削除したい場合

**❌ やってはいけない**: `ws.delete_cols()` による物理削除
→ Excelファイル構造が壊れる

**✅ 正しい方法**: 非表示 + 内容クリア
→ 構造を保ちつつ表示しない

---

## 今後の課題

### 1. パフォーマンス最適化
- [ ] PDF変換の高速化（現在30秒程度かかる場合がある）
- [ ] 大量商品（100商品以上）への対応
- [ ] キャッシュ機構の導入

### 2. リファクタリング
- [ ] `prepare_excel_for_pdf_conversion()`の分割
- [ ] エラーハンドリングの強化
- [ ] ログ出力の整理

### 3. テスト拡充
- [ ] PDFプレビューのE2Eテスト
- [ ] モバイル環境でのダウンロードテスト
- [ ] LibreOffice変換の自動テスト

---

## 参考資料

### LibreOffice CLI
```bash
# Excel → PDF直接変換
libreoffice --headless --convert-to pdf --outdir /path/to/output file.xlsx

# Excel → ODS → PDF (2段階変換)
libreoffice --headless --convert-to ods file.xlsx
libreoffice --headless --convert-to pdf file.ods
```

### openpyxlリファレンス
- [MergedCell](https://openpyxl.readthedocs.io/en/stable/api/openpyxl.cell.cell.html#openpyxl.cell.cell.MergedCell)
- [ColumnDimension](https://openpyxl.readthedocs.io/en/stable/api/openpyxl.worksheet.dimensions.html)

### ブラウザ互換性
- [Safari Download Restrictions](https://developer.apple.com/documentation/webkitjs)
- [iOS User Gesture Requirements](https://webkit.org/blog/6784/new-video-policies-for-ios/)

---

**ドキュメント最終更新**: 2025-01-13
