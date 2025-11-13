#!/bin/bash
set -e

echo "===== Starting build process ====="

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Check if Node.js is available
echo "Checking Node.js version..."
node --version || echo "Node.js not found!"
npm --version || echo "npm not found!"

# Build frontend
echo "Building React frontend..."
cd frontend

echo "Installing frontend dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Build completed successfully!"
ls -la dist/

cd ..

echo "===== Build process completed ====="
