#!/bin/bash

echo "📱 安否チェックアプリ - TWAセットアップ"
echo "=================================="

# Bubblewrapがインストールされているか確認
if ! command -v bubblewrap &> /dev/null; then
    echo "❌ Bubblewrapがインストールされていません"
    echo "以下のコマンドでインストールしてください:"
    echo "npm i -g @bubblewrap/cli"
    exit 1
fi

echo "✅ Bubblewrapが見つかりました"

# プロジェクトの初期化
echo "🔧 TWAプロジェクトを初期化中..."
bubblewrap init --manifest=../twa-manifest.json

echo ""
echo "📝 次のステップ:"
echo "1. 生成されたAndroidプロジェクトを確認"
echo "2. 必要に応じて設定を調整"
echo "3. 'bubblewrap build' でAPKをビルド"
echo ""
echo "🔑 署名キーの生成:"
echo "keytool -genkey -v -keystore android-keystore.jks -alias android -keyalg RSA -keysize 2048 -validity 10000"
echo ""
echo "📤 Google Play Consoleへのアップロード:"
echo "1. https://play.google.com/console にアクセス"
echo "2. 新しいアプリを作成"
echo "3. 生成されたAPKをアップロード"