# Cafe Menu AI

AI搭載のカフェメニュー認識アプリケーション。顧客がカメラでメニューを撮影すると、AI画像解析により詳細な商品情報を表示します。

## 🚀 技術スタック

- **フロントエンド**: Next.js 14, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: SQLite (開発) / PostgreSQL (本番) + Prisma ORM
- **AI画像解析**: Google Cloud Vision API
- **フォーム管理**: React Hook Form + Zod
- **UI コンポーネント**: Lucide React Icons
- **開発ツール**: ESLint, Prettier

## 📋 機能

### 顧客向け機能
- 📱 カメラでメニュー撮影
- 📁 画像ファイルアップロード
- 🤖 AI画像解析によるメニュー認識
- 📊 おすすめメニュー表示
- ⚠️ アレルゲン情報表示

### 管理者向け機能
- 📝 メニュー管理（CRUD操作）
- ➕ 新規メニュー登録
- 🏷️ カテゴリ・価格・原材料管理
- 🔍 検索キーワード設定
- 👁️ メニューの有効/無効切り替え

## 🛠️ セットアップ手順

### 1. リポジトリのクローン
```bash
git clone https://github.com/your-username/cafe-menu-ai.git
cd cafe-menu-ai
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
```bash
cp env.template .env.local
```

`.env.local`ファイルを編集して、データベース接続情報とGoogle Vision API設定を行ってください：

#### SQLite（開発環境）
```env
DATABASE_URL="file:./dev.db"

#### Google Cloud Vision API設定
```env
GOOGLE_CLOUD_PROJECT_ID="your-google-cloud-project-id"
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----"
GOOGLE_CLOUD_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
```

### 4. Google Cloud Vision API セットアップ（オプション）

本格的なAI画像認識を使用する場合は、Google Cloud Vision APIを設定してください。設定しない場合はモックデータで動作します。

#### 4.1 Google Cloud Console でプロジェクト作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（例：`cafe-menu-ai`）
3. プロジェクトを選択

#### 4.2 Vision API の有効化
1. 左メニュー「APIとサービス」→「ライブラリ」
2. 「Cloud Vision API」を検索
3. 「有効にする」をクリック

#### 4.3 サービスアカウント作成
1. 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「サービスアカウント」
3. 名前: `cafe-menu-ai-vision`
4. 役割: `Cloud Vision API ユーザー`

#### 4.4 サービスアカウントキー作成
1. 作成したサービスアカウントをクリック
2. 「キー」タブ→「キーを追加」→「新しいキーを作成」
3. 形式: JSON を選択
4. ダウンロードしたJSONファイルから以下の情報を`.env.local`に設定：
   - `project_id` → `GOOGLE_CLOUD_PROJECT_ID`
   - `private_key` → `GOOGLE_CLOUD_PRIVATE_KEY`
   - `client_email` → `GOOGLE_CLOUD_CLIENT_EMAIL`

### 5. データベースのセットアップ
```bash
# Prismaクライアントの生成
npx prisma generate

# データベースマイグレーション
npx prisma migrate dev --name init

# （オプション）サンプルデータの投入
npx prisma db seed
```

### 6. 開発サーバーの起動
```bash
npm run dev
```

ブラウザで [http://localhost:3001](http://localhost:3001) を開いてアプリケーションを確認してください。

## 📁 プロジェクト構造

```
src/
├── app/
│   ├── page.tsx                    # 顧客向けカメラアプリ
│   ├── admin/
│   │   ├── page.tsx               # 管理画面トップ
│   │   └── menus/
│   │       ├── page.tsx           # メニュー一覧
│   │       └── new/
│   │           └── page.tsx       # 新規メニュー登録
│   └── api/
│       ├── menus/
│       │   └── route.ts           # メニューCRUD API
│       └── analyze-image/
│           └── route.ts           # 画像解析API
├── components/
│   ├── ui/                        # 基本UIコンポーネント
│   ├── camera/                    # カメラ関連コンポーネント
│   └── menu/                      # メニュー関連コンポーネント
├── lib/
│   ├── prisma.ts                  # Prismaクライアント
│   └── utils.ts                   # ユーティリティ関数
├── types/
│   └── menu.ts                    # 型定義
└── prisma/
    └── schema.prisma              # データベーススキーマ
```

## 🗄️ データベーススキーマ

```prisma
model Menu {
  id          String   @id @default(cuid())
  name        String
  description String
  ingredients String[]
  allergens   String[]
  keywords    String[]
  imageUrls   String[]
  price       Int?
  category    String
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## 🔧 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start

# リント実行
npm run lint

# Prisma Studio起動（データベースGUI）
npx prisma studio
```

## 🚀 デプロイ

### Vercelでのデプロイ
1. [Vercel](https://vercel.com)にプロジェクトをインポート
2. 環境変数を設定
3. 自動デプロイが開始されます

### データベース
本番環境では以下のデータベースサービスを推奨します：
- [Supabase](https://supabase.com)
- [PlanetScale](https://planetscale.com)
- [Railway](https://railway.app)

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🔮 今後の実装予定

- [ ] 実際のAI画像解析API統合（OpenAI Vision, Google Vision API等）
- [ ] ユーザー認証システム
- [ ] 多言語対応
- [ ] 解析統計ダッシュボード
- [ ] メニュー画像アップロード機能
- [ ] PWA対応
