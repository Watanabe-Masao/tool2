# Python 3.11をベースイメージとして使用
FROM python:3.11-slim

# 作業ディレクトリを設定
WORKDIR /app

# システムパッケージの更新と必要なパッケージのインストール
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 依存関係ファイルをコピー
COPY requirements.txt .

# Pythonパッケージのインストール
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションファイルをコピー
COPY . .

# 一時ファイル用ディレクトリを作成
RUN mkdir -p temp_files

# ポート8000を公開
EXPOSE 8000

# 環境変数の設定
ENV PYTHONUNBUFFERED=1

# アプリケーションの起動
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
