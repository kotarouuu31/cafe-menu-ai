# Cafe Menu AI

カフェ経営を支援するAI搭載メニュー認識システム。顧客がスマートフォンでメニューを撮影すると、Google Cloud Vision APIによる高精度な画像解析により、該当する商品の詳細情報を瞬時に表示します。

## 概要

このアプリケーションは、カフェの顧客体験向上と運営効率化を目的として開発されました。従来の紙メニューでは伝えきれない詳細な商品情報、アレルゲン情報、おすすめポイントなどを、直感的なカメラ操作で提供します。

## 技術スタック

- **フロントエンド**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, Node.js
- **データベース**: Supabase (PostgreSQL)
- **CMS**: Notion API
- **AI画像解析**: Google Cloud Vision API
- **PWA**: Service Worker, Web App Manifest
- **デプロイ**: Vercel
- **開発ツール**: ESLint, Prettier

## 主要機能

### 顧客向け機能
- スマートフォンカメラによるメニュー撮影
- 背面カメラ優先起動とカメラ切り替え機能
- AI画像解析による高精度メニュー認識
- 詳細な商品情報表示（価格、説明、シェフコメント）
- アレルゲン情報と栄養成分表示
- PWA対応によるアプリライクな体験
- オフライン対応

### 管理者向け機能
- 直感的な新料理追加ウィザード
- 画像アップロードによる自動キーワード生成
- 料理一覧管理と削除機能
- Notion連携による効率的なデータ管理
- キーワード品質の自動判定
- Supabaseとの自動同期

## アーキテクチャ

### システム構成
- **フロントエンド**: Next.js 15 + React 19による高速なSPA
- **API層**: RESTful APIによるクリーンなデータ通信
- **データ層**: Supabase (PostgreSQL) + Notion APIのハイブリッド構成
- **AI処理**: Google Cloud Vision APIによる画像解析
- **インフラ**: Vercelによる自動デプロイとCDN配信

### データフロー
1. ユーザーがカメラで料理を撮影
2. 画像データをGoogle Vision APIに送信
3. 検出されたキーワードでSupabaseを検索
4. マッチした料理情報をレスポンス
5. リアルタイムで結果を表示

## セットアップ手順

### 1. 環境構築
```bash
git clone https://github.com/kotarouuu31/cafe-menu-ai.git
cd cafe-menu-ai
npm install
```

### 2. 環境変数設定
```bash
cp env.template .env.local
```

必要な環境変数:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabaseプロジェクト URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseサービスロールキー
- `NOTION_TOKEN`: Notion統合トークン
- `NOTION_DISHES_DATABASE_ID`: NotionデータベースID
- `GOOGLE_CLOUD_PROJECT_ID`: Google CloudプロジェクトID
- `GOOGLE_CLOUD_PRIVATE_KEY`: サービスアカウント秘密鍵
- `GOOGLE_CLOUD_CLIENT_EMAIL`: サービスアカウントメール

### 3. 開発サーバー起動
```bash
npm run dev
```

アプリケーションは http://localhost:3000 で起動します。

## プロジェクト構造

```
src/
├── app/
│   ├── page.tsx                    # メインアプリケーション
│   ├── admin/
│   │   ├── dishes/
│   │   │   └── page.tsx           # 料理管理画面
│   │   ├── new-dish/
│   │   │   └── page.tsx           # 新料理追加ウィザード
│   │   └── keywords/
│   │       └── page.tsx           # キーワード管理
│   └── api/
│       ├── analyze-image/
│       │   └── route.ts           # 画像解析API
│       ├── dishes/
│       │   └── route.ts           # 料理一覧API
│       ├── delete-dish/
│       │   └── route.ts           # 料理削除API
│       ├── create-notion-dish/
│       │   └── route.ts           # Notion料理作成API
│       └── notion-sync-with-keywords/
│           └── route.ts           # Notion同期API
├── components/
│   ├── admin/                     # 管理画面コンポーネント
│   ├── camera/                    # カメラ機能
│   └── menu/                      # メニュー表示
├── lib/
│   ├── google-vision.ts           # Vision API統合
│   ├── keyword-generator.ts       # キーワード生成
│   └── error-handler.ts           # エラーハンドリング
└── public/
    ├── manifest.json              # PWA設定
    ├── sw.js                      # Service Worker
    └── icons/                     # アプリアイコン
```

## 技術的特徴

### パフォーマンス最適化
- Next.js 15 + Turbopackによる高速ビルド
- 画像の遅延読み込みと最適化
- Service Workerによるキャッシュ戦略
- クライアントサイドレンダリングの最適化

### セキュリティ
- サーバーサイドでのAPI認証
- 環境変数による機密情報管理
- CORS設定とCSRF対策
- 入力値検証とサニタイゼーション

### 開発効率
- TypeScriptによる型安全性
- ESLintとPrettierによるコード品質管理
- 統一されたエラーハンドリング
- 自動テストとCI/CD

## デプロイ

### 本番環境
- **URL**: https://cafe-menu-ai.vercel.app
- **インフラ**: Vercel (自動デプロイ)
- **データベース**: Supabase (PostgreSQL)
- **CMS**: Notion
- **AI API**: Google Cloud Vision API

### 開発コマンド
```bash
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド
npm run start        # プロダクションサーバー起動
npm run lint         # コード品質チェック
```

## 成果と学習

### 技術的成果
- Google Cloud Vision APIの実装と最適化
- Supabase + Notion APIのハイブリッドデータ管理
- PWA対応による優れたUX実現
- レスポンシブデザインとモバイル最適化

### 課題解決
- 画像認識精度の向上（キーワード最適化）
- SSRハイドレーションエラーの解決
- カメラ機能のクロスブラウザ対応
- データ同期の信頼性確保

このプロジェクトは、モダンなWeb技術を活用した実用的なビジネスアプリケーションとして、フルスタック開発の技術力を実証しています。
