# Python 3.11をベースイメージとして使用
FROM python:3.11-slim

# 作業ディレクトリを設定
WORKDIR /app

# システムパッケージの更新と必要なパッケージのインストール
# LibreOffice for Excel to PDF conversion
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-calc \
    libreoffice-writer \
    libreoffice-core \
    fonts-takao-gothic \
    fonts-takao-mincho \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# 依存関係ファイルをコピー
COPY requirements.txt .

# Pythonパッケージのインストール（キャッシュを有効化して高速化）
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# アプリケーションファイルをコピー
COPY . .

# 一時ファイル用ディレクトリを作成
RUN mkdir -p temp_files

# ポート8000を公開（デフォルト）
EXPOSE 8000

# 環境変数の設定
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# アプリケーションの起動（環境変数PORTを使用）
CMD uvicorn app:app --host 0.0.0.0 --port $PORT
