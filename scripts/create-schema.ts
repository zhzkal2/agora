import "@std/dotenv/load";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function executeSql(sql: string): Promise<void> {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    // REST API로 직접 SQL 실행이 안 되면 SQL Editor API 사용
    const pgRes = await fetch(`${supabaseUrl}/pg/query`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });
    if (!pgRes.ok) {
      throw new Error(`SQL 실행 실패: ${pgRes.status} ${await pgRes.text()}`);
    }
  }
}

// Supabase Management API를 통해 SQL 실행
async function runSql(sql: string, label: string): Promise<boolean> {
  console.log(`\n실행 중: ${label}...`);

  // Supabase REST API의 rpc를 통해 실행
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ sql_query: sql }),
  });

  if (res.ok) {
    console.log(`  완료: ${label}`);
    return true;
  }

  // exec_sql 함수가 없으면 안내
  const errorText = await res.text();
  if (errorText.includes("exec_sql")) {
    return false;
  }

  console.error(`  실패: ${label}`, errorText);
  return false;
}

// 스키마 SQL (v1.0 + v1.1 통합)
const SCHEMA_SQL = `
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
  ingredient_id UUID REFERENCES ingredients(id),
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
  ingredient_id UUID REFERENCES ingredients(id),
  symptom_id UUID REFERENCES symptoms(id),
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

-- 벡터 검색 인덱스 (v1.1)
CREATE INDEX IF NOT EXISTS idx_products_embedding ON products
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

CREATE INDEX IF NOT EXISTS idx_ingredients_embedding ON ingredients
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);
`;

console.log("=== AIEO MVP DB 스키마 생성 ===\n");

const success = await runSql(SCHEMA_SQL, "전체 스키마");

if (!success) {
  console.log("\n========================================");
  console.log("Supabase REST API로 직접 SQL 실행이 불가합니다.");
  console.log("아래 SQL을 Supabase 대시보드 > SQL Editor에 붙여넣고 실행해주세요.");
  console.log("========================================\n");
  console.log(SCHEMA_SQL);
}
