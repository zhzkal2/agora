-- ===========================================
-- AIEO MVP 스키마 (v1.0 + v1.1 통합)
-- Supabase SQL Editor에서 실행
-- ===========================================

-- pgvector 확장 활성화 (v1.1)
CREATE EXTENSION IF NOT EXISTS vector;

-- 브랜드
CREATE TABLE IF NOT EXISTS brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  origin TEXT,
  concept TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 영양제 제품 (v1.1: embedding 컬럼 추가)
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brands(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  serving_size TEXT,
  servings_per_container INT,
  form TEXT,
  certification TEXT[],
  image_url TEXT,
  affiliate_url TEXT,
  rating DECIMAL(3,2),
  review_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 성분 (v1.1: embedding 컬럼 추가)
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ko TEXT,
  category TEXT,
  description TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 제품-성분 매핑
CREATE TABLE IF NOT EXISTS product_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  amount DECIMAL(10,2),
  unit TEXT,
  daily_value_pct INT,
  form TEXT,
  UNIQUE(product_id, ingredient_id)
);

-- 증상/효능 카테고리
CREATE TABLE IF NOT EXISTS symptoms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ko TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 성분-증상 매핑
CREATE TABLE IF NOT EXISTS ingredient_symptoms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  symptom_id UUID REFERENCES symptoms(id) ON DELETE CASCADE,
  relevance_score INT DEFAULT 5,
  evidence_level TEXT,
  UNIQUE(ingredient_id, symptom_id)
);

-- AI 봇 접근 로그
CREATE TABLE IF NOT EXISTS bot_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT now(),
  bot_name TEXT,
  user_agent TEXT,
  ip TEXT,
  path TEXT,
  response_code INT,
  response_time_ms INT
);

-- 어필리에이트 클릭 추적
CREATE TABLE IF NOT EXISTS click_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT now(),
  product_slug TEXT,
  referrer TEXT,
  source TEXT,
  affiliate_url TEXT
);

-- RLS 비활성화 (MVP 단계, 추후 활성화)
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_logs ENABLE ROW LEVEL SECURITY;

-- 읽기 허용 정책 (anon key로 조회 가능하도록)
CREATE POLICY "공개 읽기: brands" ON brands FOR SELECT USING (true);
CREATE POLICY "공개 읽기: products" ON products FOR SELECT USING (true);
CREATE POLICY "공개 읽기: ingredients" ON ingredients FOR SELECT USING (true);
CREATE POLICY "공개 읽기: product_ingredients" ON product_ingredients FOR SELECT USING (true);
CREATE POLICY "공개 읽기: symptoms" ON symptoms FOR SELECT USING (true);
CREATE POLICY "공개 읽기: ingredient_symptoms" ON ingredient_symptoms FOR SELECT USING (true);

-- 로그는 service_role만 쓰기 가능 (anon key 차단)
CREATE POLICY "서버 쓰기: bot_logs" ON bot_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "서버 쓰기: click_logs" ON click_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 벡터 검색 인덱스 (v1.1)
CREATE INDEX IF NOT EXISTS idx_products_embedding ON products
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

CREATE INDEX IF NOT EXISTS idx_ingredients_embedding ON ingredients
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);
