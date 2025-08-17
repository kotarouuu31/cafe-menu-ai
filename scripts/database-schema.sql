-- 料理テーブル
CREATE TABLE dishes (
  -- 基本情報
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  name_en VARCHAR,
  description TEXT,
  
  -- 価格・カテゴリ
  price INTEGER,
  category VARCHAR NOT NULL,
  
  -- 店舗からのメッセージ
  chef_comment TEXT,
  recommendation TEXT,
  pairing_suggestion TEXT,
  
  -- 食材・アレルギー情報
  ingredients JSONB DEFAULT '[]',
  allergens JSONB DEFAULT '[]',
  nutritional_info JSONB DEFAULT '{}',
  
  -- AI識別用
  keywords JSONB DEFAULT '[]',
  visual_keywords JSONB DEFAULT '[]',
  
  -- 画像
  image_urls JSONB DEFAULT '[]',
  
  -- ステータス
  available BOOLEAN DEFAULT true,
  seasonal BOOLEAN DEFAULT false,
  popular BOOLEAN DEFAULT false,
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notion_id VARCHAR UNIQUE
);

-- 食材マスターテーブル
CREATE TABLE ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  name_en VARCHAR,
  category VARCHAR,
  allergen_type VARCHAR,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- アレルゲンマスターテーブル
CREATE TABLE allergens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  name_en VARCHAR,
  severity VARCHAR CHECK (severity IN ('high', 'medium', 'low')),
  warning_message TEXT,
  icon_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 更新日時の自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dishes_updated_at 
    BEFORE UPDATE ON dishes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 設定
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergens ENABLE ROW LEVEL SECURITY;

-- 全員読み取り可能
CREATE POLICY "Anyone can view dishes" ON dishes FOR SELECT USING (true);
CREATE POLICY "Anyone can view ingredients" ON ingredients FOR SELECT USING (true);
CREATE POLICY "Anyone can view allergens" ON allergens FOR SELECT USING (true);

-- 認証ユーザーのみ編集可能
CREATE POLICY "Authenticated users can edit dishes" ON dishes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can edit ingredients" ON ingredients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can edit allergens" ON allergens FOR ALL USING (auth.role() = 'authenticated');
