# 📋 Vercel環境変数設定チェックリスト

## 必須環境変数

### 1. SUPABASE_URL ✅
- **値の例**: `https://xxxxxxxxxxxxx.supabase.co`
- **取得場所**: Supabase Dashboard → Settings → API → Project URL
- **用途**: Supabaseデータベース接続

### 2. SUPABASE_SERVICE_KEY ✅
- **値の例**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（長い文字列）`
- **取得場所**: Supabase Dashboard → Settings → API → service_role key
- **用途**: サーバーサイドからのデータベースアクセス
- **⚠️ 注意**: 絶対に公開しないこと！

### 3. JWT_SECRET ✅
- **値の例**: `93c83e670927a2d95102ea28319a7d6efec40fb54b03a3fa42c0e1523d10550e`
- **生成方法**: `node generate-jwt-secret.js` を実行
- **用途**: JWT認証トークンの署名・検証
- **要件**: 最低32文字以上のランダム文字列

## オプション環境変数

### 4. GOOGLE_MAPS_API_KEY（任意）
- **値の例**: `AIzaSyB...（Google APIキー）`
- **取得場所**: Google Cloud Console → APIs & Services
- **用途**: 位置情報表示機能
- **注意**: 使用しない場合は設定不要

## 設定手順

1. **Vercelダッシュボードにアクセス**
   - https://vercel.com/dashboard
   - プロジェクト選択

2. **環境変数設定画面へ**
   - Settings タブ
   - Environment Variables セクション

3. **各変数を追加**
   - Key: 環境変数名（例: SUPABASE_URL）
   - Value: 実際の値
   - Environment: Production にチェック

4. **保存して再デプロイ**
   - Save ボタンクリック
   - 自動的に再デプロイが開始

## 確認方法

### Vercel Functions ログ確認
```
Vercel Dashboard → Functions → ログを確認
```

### エラーが出た場合
1. 環境変数名のスペルミスがないか確認
2. 値の前後に余計なスペースがないか確認
3. service_roleキーが正しいか確認（anon keyと間違えていないか）

## セキュリティ注意事項

- ❌ `SUPABASE_SERVICE_KEY` を公開リポジトリにコミットしない
- ❌ クライアントサイドのコードに環境変数を含めない
- ✅ Production環境のみに設定する
- ✅ HTTPS通信を使用する

---

設定完了後は `PRODUCTION_SETUP.md` の動作確認チェックリストに従ってテストしてください。