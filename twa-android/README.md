# 安否チェックアプリ - TWA (Trusted Web Activity)

このディレクトリには、PWAをGoogle Play Storeに公開するためのTWA設定が含まれています。

## セットアップ手順

### 1. 必要なツール
- Android Studio
- Node.js & npm
- Java Development Kit (JDK) 8以上

### 2. Bubblewrapのインストール
```bash
npm i -g @bubblewrap/cli
```

### 3. TWAプロジェクトの初期化
```bash
bubblewrap init --manifest=https://safety-check-app.vercel.app/manifest.json
```

### 4. 設定値
- **Application ID**: com.anpicheck.app
- **Display Name**: 安否チェック
- **Host**: safety-check-app.vercel.app
- **Start URL**: /index.html
- **Theme Color**: #4ECDC4
- **Background Color**: #ffffff

### 5. ビルドとテスト
```bash
bubblewrap build
```

### 6. 署名付きAPKの生成
```bash
bubblewrap build --skipPwaValidation
```

### 7. Google Play Consoleでの公開
1. https://play.google.com/console にアクセス
2. 新しいアプリを作成
3. APKをアップロード
4. ストア情報を入力
5. 審査に提出

## アプリ情報

### 基本情報
- **アプリ名**: 安否チェック - 家族見守りアプリ
- **カテゴリ**: 医療
- **コンテンツレーティング**: 全年齢対象

### 説明文
高齢の親と離れて暮らす家族のための安否確認アプリです。

【主な機能】
✅ 自動で親のスマホ操作を検出
✅ 最終操作時間をリアルタイム表示
✅ 12時間以上操作がない場合は注意喚起
✅ 緊急時の連絡機能
✅ 複数の親を同時に見守り可能（プレミアム）

【こんな方におすすめ】
- 離れて暮らす高齢の親が心配
- 毎日電話するのは大変
- さりげなく見守りたい
- 親のプライバシーも大切にしたい

【使い方】
1. 親のスマホに「親用アプリ」をインストール
2. 子供は「子用アプリ」で見守り
3. 親がスマホを使うだけで自動的に安否確認

【料金】
- 基本機能: 無料
- プレミアム: 月額980円（7日間無料体験）

### スクリーンショット
1. ホーム画面（役割選択）
2. 親アプリ - メイン画面
3. 子アプリ - 親の状態確認画面
4. 安否状態の表示（緑・黄・橙・赤）
5. 設定画面

### アイコン
- 512x512px: ハート型の見守りアイコン
- 背景: #4ECDC4
- 前景: 白いハートに家族のシルエット