# Python 3.11をベースイメージとして使用
FROM python:3.11-slim

# 作業ディレクトリを設定
WORKDIR /app

# システムパッケージの更新と必要なパッケージのインストール
# WeasyPrintの依存関係を含む
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz-subset0 \
    libjpeg-dev \
    libopenjp2-7-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# 依存関係ファイルをコピー
COPY requirements.txt .

# Pythonパッケージのインストール
RUN pip install --no-cache-dir -r requirements.txt

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
