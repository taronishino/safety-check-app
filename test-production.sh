#!/bin/bash

# 本番環境動作確認スクリプト
echo "🚀 安否チェックアプリ - 本番環境テスト"
echo "======================================="
echo ""

# テスト用のベースURL
BASE_URL="https://safety-check-app.vercel.app"

# 色付け用
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. トップページ確認
echo "1. トップページアクセステスト..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL)
if [ $HTTP_STATUS -eq 200 ]; then
    echo -e "${GREEN}✅ トップページ: OK ($HTTP_STATUS)${NC}"
else
    echo -e "${RED}❌ トップページ: NG ($HTTP_STATUS)${NC}"
fi

# 2. 各ページの確認
echo ""
echo "2. 各ページアクセステスト..."
PAGES=("parent.html" "child.html" "settings.html")
for PAGE in "${PAGES[@]}"
do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/$PAGE)
    if [ $HTTP_STATUS -eq 200 ]; then
        echo -e "${GREEN}✅ /$PAGE: OK ($HTTP_STATUS)${NC}"
    else
        echo -e "${RED}❌ /$PAGE: NG ($HTTP_STATUS)${NC}"
    fi
done

# 3. APIエンドポイント確認
echo ""
echo "3. APIエンドポイント確認..."
API_ENDPOINTS=("api/hello" "api/auth/register" "api/subscription/status")
for ENDPOINT in "${API_ENDPOINTS[@]}"
do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET $BASE_URL/$ENDPOINT)
    if [ $HTTP_STATUS -eq 200 ] || [ $HTTP_STATUS -eq 401 ] || [ $HTTP_STATUS -eq 405 ]; then
        echo -e "${GREEN}✅ /$ENDPOINT: 応答あり ($HTTP_STATUS)${NC}"
    else
        echo -e "${RED}❌ /$ENDPOINT: エラー ($HTTP_STATUS)${NC}"
    fi
done

# 4. 設定保存API確認（認証が必要）
echo ""
echo "4. 設定保存API確認..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/api/settings/save \
    -H "Content-Type: application/json" \
    -d '{"settings":{}}')
if [ $HTTP_STATUS -eq 401 ]; then
    echo -e "${GREEN}✅ /api/settings/save: 認証チェックOK (401)${NC}"
elif [ $HTTP_STATUS -eq 500 ]; then
    echo -e "${RED}❌ /api/settings/save: サーバーエラー (500) - user_settingsテーブル未作成の可能性${NC}"
else
    echo -e "⚠️  /api/settings/save: 予期しないステータス ($HTTP_STATUS)"
fi

echo ""
echo "======================================="
echo "テスト完了！"
echo ""
echo "次のステップ:"
echo "1. Supabaseでuser_settingsテーブルを作成"
echo "2. Vercelで環境変数を設定"
echo "3. ブラウザで実際の動作を確認"
echo ""