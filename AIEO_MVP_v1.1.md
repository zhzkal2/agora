# AIEO MVP 설계 문서 — 변경사항 (v1.1)

> **프로젝트 초기화**: 2026-02-27 09:53 KST
> **문서 작성일**: v1.1 변경사항

> 원본 문서에 반영할 4건의 수정사항을 정리합니다.
> 각 변경사항은 원본 섹션 번호와 위치를 명시하며, 원본과 동일한 상세 수준으로 작성되었습니다.

---

## 변경 1: 벡터 DB (pgvector) 스키마 추가

### 배경

LangChain으로 RAG 챗봇을 구현하려면 상품/성분 데이터의 임베딩을 저장하고 유사도 검색할 벡터 DB가 필요하다. 원본 문서에는 LangChain Agent + Tools 설계는 있지만, 임베딩 저장소 설계가 빠져 있었다.

Supabase는 PostgreSQL 확장인 pgvector를 기본 지원하므로, 별도 벡터 DB (Pinecone, Weaviate 등)를 추가하지 않고 기존 Supabase 안에서 해결 가능하다.

### 반영 위치 1: 섹션 6 (기술 스택) — DB 테이블에 행 추가

기존:

| 기술 | 버전 | 비고 |
|------|------|------|
| **Supabase** | - | PostgreSQL BaaS. Free: 500MB DB, 1GB Storage |
| **supabase-js** | `^2.97.0` | Deno 공식 지원 |
| **Supabase CLI** | `^2.76.14` | 로컬 개발, 마이그레이션, 타입 생성 |

변경 (행 추가):

| 기술 | 버전 | 비고 |
|------|------|------|
| **Supabase** | - | PostgreSQL BaaS. Free: 500MB DB, 1GB Storage |
| **supabase-js** | `^2.97.0` | Deno 공식 지원 |
| **Supabase CLI** | `^2.76.14` | 로컬 개발, 마이그레이션, 타입 생성 |
| **pgvector** | `0.8+` | Supabase 내장. 벡터 유사도 검색. `vector(1536)` 또는 `vector(768)` 타입 |

### 반영 위치 2: 섹션 8 (데이터 설계) — DB 스키마 맨 앞에 추가

기존 스키마의 `CREATE TABLE brands` 앞에 다음을 삽입:

```sql
-- ========================================
-- pgvector 확장 활성화
-- Supabase 대시보드 > SQL Editor에서 실행
-- 또는 마이그레이션 파일에 포함
-- ========================================
CREATE EXTENSION IF NOT EXISTS vector;
```

### 반영 위치 3: 섹션 8 (데이터 설계) — products 테이블에 컬럼 추가

기존 products 테이블:

```sql
CREATE TABLE products (
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

변경 (embedding 컬럼 추가):

```sql
CREATE TABLE products (
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
  embedding vector(1536),          -- ← 추가: RAG 챗봇용 임베딩
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 반영 위치 4: 섹션 8 (데이터 설계) — ingredients 테이블에 컬럼 추가

기존 ingredients 테이블:

```sql
CREATE TABLE ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ko TEXT,
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

변경 (embedding 컬럼 추가):

```sql
CREATE TABLE ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ko TEXT,
  category TEXT,
  description TEXT,
  embedding vector(1536),          -- ← 추가: 증상 매칭용 임베딩
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 반영 위치 5: 섹션 8 (데이터 설계) — 인덱스 추가

기존 스키마의 마지막 테이블 (`click_logs`) 뒤에 다음을 추가:

```sql
-- ========================================
-- 벡터 검색 인덱스
-- ivfflat: 빌드 빠르고, 소규모 데이터(~수천 건)에 적합
-- lists 값: sqrt(행 수) 권장. 상품 수십~수백 개이므로 10으로 설정
-- ========================================

CREATE INDEX idx_products_embedding ON products
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

CREATE INDEX idx_ingredients_embedding ON ingredients
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);
```

### 반영 위치 6: 섹션 8 (데이터 설계) — 임베딩 생성 전략 섹션 신규 추가

`click_logs` 테이블과 인덱스 뒤, 또는 "목 데이터" 섹션 앞에 다음을 추가:

```
### 임베딩 생성 전략

| 항목 | 내용 |
|------|------|
| 생성 시점 | 상품/성분 데이터 시딩 시 한 번만 생성 (Deno 스크립트) |
| 모델 (유료) | OpenAI `text-embedding-3-small` (1536차원, $0.02/1M tokens) |
| 모델 (무료) | Google `text-embedding-004` (768차원, Gemini API 무료 티어) |
| 차원 | 유료: 1536, 무료: 768 (스키마의 vector() 차원을 모델에 맞출 것) |
| 대상 | 상품: name + description + 성분 목록을 연결한 텍스트 |
|      | 성분: name + name_ko + description + 관련 증상 텍스트 |
| 비용 | 상품 수십 개 × 수백 토큰 = 사실상 $0 |
| 갱신 | 상품 추가/수정 시 해당 행만 재생성 |
```

임베딩 생성 스크립트 예시:

```typescript
// scripts/generate-embeddings.ts
// Deno에서 실행: deno run --allow-net --allow-env scripts/generate-embeddings.ts

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_KEY")!
);

// OpenAI 임베딩 생성
async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });
  const data = await response.json();
  return data.data[0].embedding;
}

// 상품 임베딩 생성
async function embedProducts() {
  const { data: products } = await supabase
    .from("products")
    .select(`
      id, name, description,
      product_ingredients (
        amount, unit, form,
        ingredients ( name, name_ko )
      )
    `)
    .is("embedding", null);  // 아직 임베딩 없는 것만

  for (const product of products ?? []) {
    // 성분 정보를 텍스트로 연결
    const ingredientText = product.product_ingredients
      ?.map((pi: any) =>
        `${pi.ingredients.name} (${pi.ingredients.name_ko}) ${pi.amount}${pi.unit} ${pi.form ?? ""}`
      )
      .join(", ");

    const text = `${product.name}. ${product.description ?? ""}. 성분: ${ingredientText}`;
    const embedding = await getEmbedding(text);

    await supabase
      .from("products")
      .update({ embedding })
      .eq("id", product.id);

    console.log(`✅ ${product.name}`);
    
    // Rate limit 방지
    await new Promise((r) => setTimeout(r, 200));
  }
}

await embedProducts();
console.log("임베딩 생성 완료");
```

### 반영 위치 7: 섹션 5 (시스템 아키텍처) — 유저 흐름 1 수정

기존:

```
사용자 (브라우저)
    ↓
Fresh (User-Agent: 사람 → 일반 UI)
    ↓
상품 페이지 열람 또는 챗봇에 증상 입력
    ↓
"피로하고 잠 못 자요"
    ↓
Hono /api/chat → LangChain Agent
    ├── Tool 1: 상품 검색 (Supabase)
    ├── Tool 2: 성분 충돌 체크
    └── Tool 3: 복용법 안내
    ↓
"비타민B 추천드려요" + iHerb 구매 링크
    ↓
사용자 구매 → 어필리에이트 수익
```

변경:

```
사용자 (브라우저)
    ↓
Fresh 페이지 (모든 유저에게 동일한 HTML)
    ↓
상품 페이지 열람 또는 챗봇 Island에 증상 입력
    ↓
"피로하고 잠 못 자요"
    ↓
/api/chat → LangChain Agent
    ├── Tool 1: 키워드 상품 검색 (Supabase fulltext)
    ├── Tool 2: 시맨틱 상품 검색 (pgvector 유사도)
    ├── Tool 3: 성분 충돌 체크
    └── Tool 4: 복용법 안내
    ↓
"비타민B 추천드려요" + iHerb 구매 링크
    ↓
사용자 구매 → 어필리에이트 수익
```

### 반영 위치 8: 섹션 10 (API 엔드포인트) — LangChain Agent Tools에 Tool 추가

기존:

```typescript
// Tool 1: 상품 검색
searchProducts({ query: "비타민B", symptom: "피로" })

// Tool 2: 성분 충돌 체크
checkInteraction({ ingredients: ["비타민B6", "마그네슘"] })

// Tool 3: 복용법 안내
getDosageGuide({ productId: "vitacore-b-complex" })
```

변경:

```typescript
// Tool 1: 키워드 상품 검색 (SQL fulltext)
// 정확한 성분명, 브랜드명으로 검색할 때 사용
searchProducts({ query: "비타민B12", brand: "VitaCore Labs", symptom: "피로" })

// Tool 2: 시맨틱 상품 검색 (pgvector 유사도)
// 유저의 자연어 설명을 임베딩하여 유사한 상품을 찾을 때 사용
// "피곤하고 집중이 안 돼요" → 임베딩 → 코사인 유사도 검색
semanticSearch({ query: "피곤하고 집중이 안 돼요", limit: 5 })

// Tool 3: 성분 충돌 체크
checkInteraction({ ingredients: ["비타민B6", "마그네슘"] })

// Tool 4: 복용법 안내
getDosageGuide({ productId: "vitacore-b-complex" })
```

시맨틱 검색 Tool의 내부 구현:

```typescript
// LangChain Tool 정의
import { DynamicTool } from "langchain/tools";

const semanticSearchTool = new DynamicTool({
  name: "semantic_product_search",
  description: "유저의 자연어 증상 설명으로 관련 상품을 찾습니다. " +
    "'피곤하고 잠이 안 와요' 같은 자연어 입력에 사용하세요. " +
    "정확한 성분명이나 브랜드명이 있으면 searchProducts를 대신 사용하세요.",
  func: async (query: string) => {
    // 1. 유저 쿼리를 임베딩
    const queryEmbedding = await getEmbedding(query);

    // 2. pgvector 유사도 검색
    const { data, error } = await supabase.rpc("match_products", {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,   // 유사도 임계값
      match_count: 5,          // 최대 반환 수
    });

    // 3. 결과 포맷팅
    return JSON.stringify(data);
  },
});
```

Supabase RPC 함수 (SQL):

```sql
-- pgvector 유사도 검색 함수
-- Supabase Dashboard > SQL Editor에서 생성
CREATE OR REPLACE FUNCTION match_products(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  price DECIMAL,
  brand_name TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.slug,
    p.description,
    p.price,
    b.name AS brand_name,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM products p
  JOIN brands b ON p.brand_id = b.id
  WHERE p.is_active = true
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 💡 Tool 선택 가이드 (LangChain Agent의 판단 기준)

| 유저 입력 예시 | 사용 Tool | 이유 |
|---|---|---|
| "비타민B12 추천해줘" | Tool 1 (키워드) | 정확한 성분명 |
| "VitaCore Labs 제품 뭐 있어?" | Tool 1 (키워드) | 정확한 브랜드명 |
| "피곤하고 집중이 안 돼요" | Tool 2 (시맨틱) | 자연어, 증상 설명 |
| "요즘 스트레스 받고 잠을 못 자요" | Tool 2 (시맨틱) | 자연어, 복합 증상 |
| "비타민B6이랑 마그네슘 같이 먹어도 돼?" | Tool 3 (충돌) | 성분 상호작용 질문 |
| "VitaCore B-Complex 어떻게 먹어?" | Tool 4 (복용법) | 특정 제품 복용법 |

### 반영 위치 9: 섹션 10 (API 엔드포인트) — 미래 MCP tool에도 반영

기존:

```
search_supplements("피로회복")
get_product_detail("vitacore-b-complex-ultra-3000")
compare_supplements(["product-a", "product-b"])
recommend_by_symptom("피로")
```

변경 (시맨틱 검색 추가):

```
search_supplements("피로회복")
search_supplements_semantic("피곤하고 집중이 안 돼요")    -- ← 추가
get_product_detail("vitacore-b-complex-ultra-3000")
compare_supplements(["product-a", "product-b"])
recommend_by_symptom("피로")
```

---

## 변경 2: Fresh 2.0 + Hono 구조 정리

### 배경

원본 문서에서는 Fresh를 프론트엔드로, Hono를 API 서버로 분리하는 구조였다. 그러나 Fresh 2.0은 Hono-like API 라우트를 내장하고 있어, MVP 단계에서 둘을 별도로 운영하면 라우팅이 두 곳에서 관리되는 불필요한 복잡성이 생긴다.

Fresh 2.0의 API 라우트로 통일하고, 스케일이 필요해지는 시점에 Hono를 별도 서버로 분리하는 것이 MVP에 적합하다.

### 반영 위치 1: 섹션 5 (시스템 아키텍처) — "전체 구조" 교체

기존:

```
서버 1개: Deno + Hono
├── Fresh (프론트 + User-Agent 분기)
│   ├── 유저 → 일반 UI + 챗봇
│   └── 외부 AI → 구조화된 HTML + JSON-LD (LangChain 안 거침)
├── /api/* (상품 검색, 성분 충돌, 복용법)
├── /api/chat (LangChain Agent) ← 사이트 챗봇 전용
├── Deno.cron (스크래핑 스케줄러)
└── [미래] UCP/MCP 엔드포인트

DB 1개: Supabase (PostgreSQL)
└── 상품, 성분, 증상 매핑 테이블
```

변경:

```
서버 1개: Fresh 2.0 (Hono-like API 내장)
├── 페이지 라우트 (SSR + Islands)
│   ├── /                       → 메인 페이지
│   ├── /products/:slug         → 상품 상세 페이지
│   ├── /brands/:slug           → 브랜드 페이지
│   ├── /symptoms/:slug         → 증상별 추천 페이지
│   └── /guides/:slug           → 가이드 페이지
├── API 라우트 (Fresh 2.0 내장 API)
│   ├── GET  /api/products              → 상품 목록/검색
│   ├── GET  /api/products/:slug        → 상품 상세
│   ├── GET  /api/products/search?q=    → 키워드 검색
│   ├── GET  /api/recommend?symptom=    → 증상 기반 추천
│   ├── GET  /api/compare?ids=          → 상품 비교
│   ├── GET  /api/ingredients/:id       → 성분 상세
│   ├── GET  /api/symptoms              → 증상 목록
│   └── POST /api/chat                  → LangChain 챗봇
├── 미들웨어
│   ├── User-Agent 판별 + 로깅 (분기 아님, 로깅 전용)
│   └── CORS, 에러 핸들링
├── 정적 파일
│   ├── /robots.txt
│   ├── /llms.txt
│   └── /sitemap.xml
├── Deno.cron (스크래핑 스케줄러)
└── [미래] UCP/MCP 엔드포인트 (별도 Hono 서버로 분리 가능)

DB 1개: Supabase (PostgreSQL + pgvector)
├── 상품, 성분, 증상 매핑 테이블
├── 벡터 임베딩 (pgvector)
├── AI 봇 접근 로그
└── 어필리에이트 클릭 로그
```

### 반영 위치 2: 섹션 5 (시스템 아키텍처) — "세 개의 채널" 다이어그램 수정

기존:

```
                    ┌─ [AI 크롤러] → JSON-LD SSR 페이지 (AIEO)
                    │
[백엔드 API] ──────┼─ [유저 브라우저] → 웹앱 UI + 챗봇 (수익화)
(Hono + Supabase)   │
                    └─ [AI 에이전트] → UCP/MCP API (미래 대비)
```

변경:

```
                         ┌─ [AI 크롤러] → 동일 HTML에서 JSON-LD + 시맨틱 HTML 파싱 (AIEO)
                         │
[Fresh 2.0 서버] ───────┼─ [유저 브라우저] → 동일 HTML + Islands 하이드레이션 (수익화)
(SSR + API + pgvector)   │
                         └─ [AI 에이전트] → UCP/MCP API (미래 대비, Hono 분리 시점)
```

### 반영 위치 3: 섹션 6 (기술 스택) — 백엔드 테이블 수정

기존:

| 기술 | 버전 | 비고 |
|------|------|------|
| **Hono** | `^4.12.2` | JSR: `@hono/hono`. 제로 의존성, 12kB 미만. `^4.11.7` 이상 필수 (보안 패치) |

변경:

| 기술 | 버전 | 비고 |
|------|------|------|
| **Hono** | `^4.12.2` | Fresh 2.0이 내부적으로 사용. MVP에서 별도 서버 불필요. API 분리 필요 시 독립 서버로 전환 가능 |

### 반영 위치 4: 섹션 6 (기술 스택) — deno.json 설정 수정

기존:

```json
{
  "imports": {
    "hono": "jsr:@hono/hono@^4.12",
    "@supabase/supabase-js": "npm:@supabase/supabase-js@^2.97",
    "langchain": "npm:langchain@^1.2",
    "@langchain/core": "npm:@langchain/core@^1.2",
    "@langchain/anthropic": "npm:@langchain/anthropic",
    "playwright": "npm:playwright@^1.58"
  }
}
```

변경:

```jsonc
{
  "imports": {
    // Hono는 Fresh 2.0이 내부적으로 사용하므로 직접 import 불필요
    // API 별도 분리 시에만 활성화:
    // "hono": "jsr:@hono/hono@^4.12",
    "@supabase/supabase-js": "npm:@supabase/supabase-js@^2.97",
    "langchain": "npm:langchain@^1.2",
    "@langchain/core": "npm:@langchain/core@^1.2",
    "@langchain/anthropic": "npm:@langchain/anthropic",
    "playwright": "npm:playwright@^1.58"
  }
}
```

### 반영 위치 5: 섹션 6 (기술 스택) — 버전 호환성 매트릭스 수정

기존:

```
Deno 2.7+ ← 전체 런타임
├── Fresh 2.0-beta ← Deno 2.0+ 필수 (JSR 기반)
│   ├── Preact 10.28.4 (내장, React 18 호환 / React 19 미지원)
│   └── Tailwind CSS 4.2 ← @tailwindcss/vite
├── Hono 4.12 ← Deno 네이티브 (JSR)
├── LangChain.js 1.2 ← npm 스펙 (Deno npm 호환)
│   ├── @langchain/anthropic
│   └── @langchain/core 1.2
├── supabase-js 2.97 ← npm 스펙 (Deno 공식 지원)
├── Playwright 1.58 ← npm 스펙 (비공식, 주의 필요)
└── Biome 2.4 ← 별도 바이너리 (Deno 무관)
```

변경:

```
Deno 2.7+ ← 전체 런타임
├── Fresh 2.0-beta ← Deno 2.0+ 필수 (JSR 기반)
│   ├── Hono 4.12 (Fresh 내부 의존성, 별도 설치 불필요)
│   ├── Preact 10.28.4 (내장, React 18 호환 / React 19 미지원)
│   └── Tailwind CSS 4.2 ← @tailwindcss/vite
├── LangChain.js 1.2 ← npm 스펙 (Deno npm 호환)
│   ├── @langchain/anthropic
│   └── @langchain/core 1.2
├── supabase-js 2.97 ← npm 스펙 (Deno 공식 지원)
│   └── pgvector ← Supabase 서버 사이드 확장 (클라이언트 설치 불필요)
├── Playwright 1.58 ← npm 스펙 (비공식, 주의 필요)
└── Biome 2.4 ← 별도 바이너리 (Deno 무관)
```

### 반영 위치 6: 섹션 6 (기술 스택) — 핵심 리스크 수정

기존 첫 번째 항목:

```
- **Fresh 2.0 beta**: 아직 stable 아님. API 변경 가능. 단, deno.com이 프로덕션 사용 중
```

변경:

```
- **Fresh 2.0 beta**: 아직 stable 아님. API 변경 가능. 단, deno.com이 프로덕션 사용 중.
  MVP에서는 Fresh 단일 서버로 운영. 만약 Fresh의 API 라우트 기능이 부족하거나
  beta 불안정성이 문제되면, 플랜 B로 Hono를 별도 API 서버로 분리 가능.
```

---

## 변경 3: 클로킹 안전장치 명확화

### 배경

원본 문서에서는 User-Agent를 판별하여 AI 봇에게는 "최소 HTML + JSON-LD", 유저에게는 "풀 UI"를 제공하는 구조였다. 이는 Google이 "클로킹"으로 판단하여 SEO 페널티를 부과할 위험이 있다.

클로킹(Cloaking): 검색엔진 봇과 사용자에게 의도적으로 다른 콘텐츠를 보여주는 행위. Google 웹마스터 가이드라인 위반으로 인덱스에서 제외될 수 있음.

Fresh의 Islands 아키텍처를 활용하면, 서버에서 분기하지 않고도 AI와 유저에게 자연스럽게 다른 경험을 제공할 수 있다. 모든 요청에 동일한 HTML을 보내되, AI 봇은 JS를 실행하지 않으므로 시맨틱 HTML + JSON-LD만 파싱하고, 유저 브라우저는 Islands를 하이드레이션하여 풀 UI를 렌더링한다.

### 반영 위치 1: 섹션 7 (AI/유저 분기 미들웨어) — "분기 내용" 테이블 교체

기존:

```
| | AI 봇 | 일반 유저 |
|--|-------|----------|
| 레이아웃 | 최소 HTML + JSON-LD | 풀 UI + 챗봇 |
| 데이터 | 구조화된 성분/효능/가격 | 이미지 + 리뷰 + 추천 |
| 목적 | 파싱 최적화 | 구매 경험 최적화 |
| LangChain | 안 거침 | 챗봇에서 사용 |
```

변경:

```
| | AI 봇 (JS 미실행) | 일반 유저 (JS 실행) |
|--|---|---|
| 받는 HTML | 동일 | 동일 |
| JSON-LD | ✅ 파싱됨 | ✅ 있지만 브라우저가 표시하지 않음 |
| 시맨틱 HTML 콘텐츠 | ✅ 읽음 (상품명, 설명, 성분, 가격 등) | ✅ 보임 |
| Islands (챗봇, 비교, 구매 버튼) | ❌ JS 미실행으로 렌더링 안 됨 | ✅ 하이드레이션되어 인터랙티브 |
| Tailwind 스타일 | ❌ CSS 무시 | ✅ 적용 |
| LangChain | 안 거침 | 챗봇 Island에서 /api/chat 호출 |
| 서버 측 분기 | ❌ 없음 (로깅만) | ❌ 없음 |
```

### 반영 위치 2: 섹션 7 (AI/유저 분기 미들웨어) — "클로킹 금지" 섹션 전면 교체

기존:

```
### 🚨 클로킹(Cloaking) 금지 — 반드시 준수

> **Google은 봇과 사람에게 다른 콘텐츠를 보여주는 행위를 "클로킹"으로 판단하고 SEO 페널티를 부과할 수 있음.**
>
> **반드시 지킬 것:**
> - ✅ 콘텐츠 (상품 정보) 자체는 동일하게 유지
> - ✅ 표현 방법만 다르게 (AI용 = JSON-LD 강화, 유저용 = UI 강화)
> - ❌ 완전히 다른 페이지를 보여주는 것은 NG
> - ❌ AI에게만 보여주고 유저에게 숨기는 정보는 NG
>
> **같은 상품 정보를, AI에게는 구조화 데이터로, 유저에게는 예쁜 UI로 보여준다. 이것이 올바른 방법.**
```

변경:

```
### 🚨 클로킹(Cloaking) 방지 — Islands 아키텍처로 해결

> **핵심 원칙: 서버에서 User-Agent로 다른 HTML을 보내지 않는다.**
>
> **구현 방법:**
> - ✅ 모든 요청에 동일한 HTML을 응답한다
> - ✅ JSON-LD는 모든 페이지에 항상 포함한다 (AI 전용이 아님, SEO에도 유리)
> - ✅ 인터랙티브 UI는 Fresh Islands로 구현 (JS가 실행되는 브라우저에서만 렌더링)
> - ✅ User-Agent 미들웨어는 로깅 + 차단 전용, 응답 분기 없음
> - ❌ AI 봇용 별도 템플릿/라우트를 만들지 않는다
> - ❌ User-Agent에 따라 콘텐츠를 추가/제거하지 않는다
>
> **이것이 안전한 이유:**
> Fresh의 Islands 아키텍처는 기본이 정적 HTML이고, 인터랙티브가 필요한 부분만
> 선택적으로 JS 하이드레이션한다. AI 봇은 JS를 실행하지 않으므로 자연스럽게
> 시맨틱 HTML + JSON-LD만 파싱한다. 서버가 의도적으로 분기하는 것이 아니라,
> 클라이언트 능력의 차이일 뿐이다. 이는 클로킹이 아니다.
```

### 반영 위치 3: 섹션 7 (AI/유저 분기 미들웨어) — "요청 흐름" 수정

기존:

```
요청 → 미들웨어 (User-Agent 판별)
         │
         ├─ AI 봇 (GPTBot, Claude-Web, PerplexityBot 등)
         │   → SSR HTML + JSON-LD 구조화 데이터
         │   → 로깅 (시간, 봇 종류, 경로, 응답코드)
         │
         ├─ 일반 유저
         │   → 웹앱 (AI 대화형 영양제 추천 인터페이스)
         │   → LangChain Agent (챗봇)
         │
         └─ 차단 대상 (Bytespider, CCBot 등)
             → 403
```

변경:

```
요청 → 미들웨어 (User-Agent 판별)
         │
         ├─ 차단 대상 (Bytespider, CCBot 등)
         │   → 403
         │
         └─ 그 외 모든 요청 (AI 봇 + 일반 유저 + 검색엔진 봇)
             │
             ├─ [로깅] AI 봇이면 bot_logs에 기록
             │   (시간, 봇 종류, 경로, 응답코드)
             │
             └─ [응답] 동일한 SSR HTML 페이지
                 ├── JSON-LD 구조화 데이터 (항상 포함)
                 ├── 시맨틱 HTML 콘텐츠 (항상 포함)
                 └── Islands (챗봇, 비교, 구매 버튼)
                     → AI 봇: JS 미실행, HTML+JSON-LD만 파싱
                     → 유저: JS 실행, 풀 인터랙티브 UI
```

### 반영 위치 4: 섹션 7 (AI/유저 분기 미들웨어) — 미들웨어 구현 코드 수정

기존 미들웨어 코드 아래에 "분기 구현" 코드가 있었다면 다음으로 교체. 없었다면 미들웨어 구현 섹션 끝에 추가:

```typescript
// ========================================
// 미들웨어: 로깅 + 차단 전용
// 응답 분기 없음 (클로킹 방지)
// ========================================

const AI_BOTS = {
  high: ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot",
         "Claude-Web", "PerplexityBot", "Google-Extended"],
  search: ["Googlebot", "Bingbot", "YandexBot"],
  block: ["Bytespider", "CCBot"],
};

function detectClient(userAgent: string): "ai_bot" | "search_bot" | "user" | "blocked" {
  for (const bot of AI_BOTS.block) {
    if (userAgent.includes(bot)) return "blocked";
  }
  for (const bot of AI_BOTS.high) {
    if (userAgent.includes(bot)) return "ai_bot";
  }
  for (const bot of AI_BOTS.search) {
    if (userAgent.includes(bot)) return "search_bot";
  }
  return "user";
}

// Fresh 2.0 미들웨어
export async function handler(req: Request, ctx: FreshContext) {
  const userAgent = req.headers.get("user-agent") ?? "";
  const client = detectClient(userAgent);

  // 1. 차단 대상만 거부
  if (client === "blocked") {
    return new Response("", { status: 403 });
  }

  // 2. AI 봇이면 로깅 (비동기, 응답 지연 없음)
  if (client === "ai_bot" || client === "search_bot") {
    const startTime = performance.now();
    const response = await ctx.next();
    const elapsed = Math.round(performance.now() - startTime);

    // 비동기로 로그 저장 (응답에 영향 없음)
    logBotAccess({
      bot_name: extractBotName(userAgent, AI_BOTS),
      user_agent: userAgent,
      ip: req.headers.get("x-forwarded-for") ?? "unknown",
      path: new URL(req.url).pathname,
      response_code: response.status,
      response_time_ms: elapsed,
    }).catch(console.error);

    return response;
  }

  // 3. 일반 유저: 그대로 통과 (동일한 페이지 렌더링)
  return ctx.next();
}
```

### 반영 위치 5: 섹션 9 (AI용 구조화 데이터) — HTML 청크 예시에 Islands 추가

기존 50-150 단어 청크 예시 뒤에 "전체 페이지 구조 예시"를 추가:

```html
<!-- 
  전체 상품 페이지 구조 예시
  모든 요청에 동일한 HTML이 전달됨
  AI 봇과 유저의 차이는 JS 실행 여부뿐
-->
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>VitaCore Labs B-Complex Ultra 3000 | 영양제 추천</title>
  <meta name="description" content="활성형 비타민B군 복합 영양제. 메틸코발라민 B12 3000mcg, P-5-P B6 100mg.">

  <!-- JSON-LD: 항상 포함. AI 봇이 구조화 데이터로 파싱 -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "VitaCore Labs B-Complex Ultra 3000",
    "brand": { "@type": "Brand", "name": "VitaCore Labs" },
    "description": "고함량 활성형 비타민B 콤플렉스...",
    "offers": {
      "@type": "Offer",
      "price": "28.99",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.7",
      "reviewCount": "342"
    }
  }
  </script>
</head>
<body>
  <main>
    <!-- ==============================
         시맨틱 HTML: AI 봇이 읽는 핵심 콘텐츠
         50-150 단어 자기완결적 청크로 구성
         ============================== -->
    <article itemscope itemtype="https://schema.org/Product">
      <h1 itemprop="name">VitaCore Labs B-Complex Ultra 3000</h1>

      <section>
        <h2>제품 요약</h2>
        <p>
          VitaCore Labs B-Complex Ultra 3000은 활성형 비타민B군 복합 영양제입니다.
          메틸코발라민 형태의 B12를 3000mcg, P-5-P 형태의 B6를 100mg 함유하여
          체내 흡수율이 일반 비타민B 대비 높습니다. 1캡슐당 90일분이며
          GMP, NSF 인증을 받았습니다. 피로회복, 에너지 대사, 신경계 건강에
          도움을 줄 수 있으며 비건 캡슐을 사용합니다.
          가격은 $28.99 (약 38,000원)이며 1일 비용은 $0.32입니다.
        </p>
      </section>

      <section>
        <h2>성분 정보</h2>
        <table>
          <thead>
            <tr><th>성분</th><th>함량</th><th>일일 권장량 대비</th></tr>
          </thead>
          <tbody>
            <tr><td>비타민 B1 (티아민)</td><td>100mg</td><td>8333%</td></tr>
            <tr><td>비타민 B6 (P-5-P)</td><td>100mg</td><td>5882%</td></tr>
            <tr><td>비타민 B12 (메틸코발라민)</td><td>3000mcg</td><td>125000%</td></tr>
            <tr><td>엽산 (메틸폴레이트)</td><td>800mcg</td><td>200%</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>이런 분께 추천합니다</h2>
        <p>
          만성 피로를 느끼는 분, 집중력 저하가 고민인 분, 
          채식으로 B12 섭취가 부족한 분께 적합합니다.
          활성형 비타민을 사용하여 MTHFR 유전자 변이가 있는 분도 
          효과적으로 흡수할 수 있습니다.
        </p>
      </section>
    </article>

    <!-- ==============================
         Islands: 유저 브라우저에서만 렌더링
         AI 봇은 JS 미실행이므로 이 부분을 보지 못함
         → 클로킹이 아님, 클라이언트 능력의 차이
         ============================== -->
    
    <!-- 챗봇 Island: "이 제품에 대해 물어보세요" -->
    <ChatBotIsland productSlug="vitacore-b-complex-ultra-3000" />

    <!-- 비교 Island: 다른 B-Complex 제품과 비교 -->
    <ProductCompareIsland category="vitamin-b" />

    <!-- 구매 버튼 Island: 어필리에이트 링크로 이동 -->
    <AffiliateButtonIsland 
      productName="VitaCore Labs B-Complex Ultra 3000"
      affiliateUrl="https://www.iherb.com/pr/..." 
    />
  </main>
</body>
</html>
```

---

## 변경 4: llms.txt에서 API 엔드포인트 제거

### 배경

원본 문서의 llms.txt에는 `/api/products`, `/api/recommend`, `/api/compare` 등 API 엔드포인트가 노출되어 있었다. 문제점:

1. **보안**: 누구나 API를 직접 호출 가능 → 비용 증가, 남용 위험
2. **불필요**: AIEO 목적이면 AI 크롤러는 HTML 페이지를 읽지, API를 호출하지 않음
3. **효과 미검증**: llms.txt 자체를 주요 AI 크롤러가 읽는다는 공식 확인이 없음

llms.txt에는 페이지 URL만 노출하고, API는 사이트 내 챗봇 전용으로 유지한다. 미래에 MCP/UCP 연동 시 별도 공개 엔드포인트로 분리.

### 반영 위치: 섹션 9 (AI용 구조화 데이터) — llms.txt 전체 교체

기존:

```markdown
# 영양제 추천 사이트

## 이 사이트에 대해
영양제 성분, 효능, 가격을 비교하고 증상별 최적의 영양제를 추천하는 사이트입니다.

## 제공 데이터
- 비타민B군 영양제 상세 정보 (성분, 함량, 가격)
- 증상별 영양제 추천 (피로, 수면, 면역 등)
- 성분 비교 및 1일 비용 분석

## API
- /api/products - 상품 목록
- /api/recommend?symptom=피로 - 증상별 추천
- /api/compare?ids=id1,id2 - 상품 비교
```

변경:

```markdown
# 영양제 추천 사이트

> 영양제 성분, 효능, 가격을 비교하고 증상별 최적의 영양제를 추천하는 사이트입니다.

비타민B군을 중심으로 주요 브랜드의 상세 성분 함량, 1일 비용,
인증 정보를 제공합니다. 각 상품 페이지에는 Schema.org Product 타입의
JSON-LD 구조화 데이터가 포함되어 있습니다.

## 카테고리
- [비타민B군 영양제](/categories/vitamin-b): B1, B6, B12, B-Complex 등 비교
- [마그네슘](/categories/magnesium): 마그네슘 제품 비교

## 브랜드
- [VitaCore Labs](/brands/vitacore-labs): 고함량 프리미엄 영양제
- [NutriZen](/brands/nutrizen): 자연주의 활성형 영양제
- [BioPlus Health](/brands/bioplus-health): 가성비 대용량 영양제
- [MediPure Labs](/brands/medipure-labs): 의약품급 GMP 영양제

## 증상별 추천
- [피로회복](/symptoms/fatigue): 피로에 도움되는 영양제 추천
- [수면 개선](/symptoms/sleep): 수면에 도움되는 영양제 추천
- [집중력](/symptoms/focus): 집중력 향상 영양제 추천
- [면역력](/symptoms/immunity): 면역력 강화 영양제 추천

## 가이드
- [비타민B군 선택 가이드](/guides/vitamin-b-guide): 활성형 vs 일반형 차이, 선택 기준
- [영양제 성분 충돌 가이드](/guides/interaction-guide): 함께 먹으면 안 되는 조합
```

### ⚠️ llms.txt 위치 조정

원본 섹션 9에서 llms.txt가 JSON-LD, 시맨틱 HTML과 같은 비중으로 다뤄지고 있었다. 다음과 같이 우선순위를 명시:

```
### AI 크롤링 최적화 우선순위

| 순위 | 항목 | 효과 | 비고 |
|------|------|------|------|
| 1 | JSON-LD | ✅ 검증됨 | AI가 실제로 파싱하는 구조화 데이터 |
| 2 | 시맨틱 HTML | ✅ 검증됨 | 50-150 단어 자기완결적 청크 |
| 3 | robots.txt | ✅ 표준 | AI 봇 접근 허용/차단 |
| 4 | sitemap.xml | ✅ 표준 | 크롤링 대상 페이지 목록 |
| 5 | llms.txt | ⚠️ 미검증 | 주요 AI 크롤러의 공식 지원 없음. 있으면 좋지만 효과 불확실 |

> llms.txt는 작성이 간단하고 비용이 없으므로 포함하되,
> AIEO 효과의 핵심은 JSON-LD + 시맨틱 HTML이다.
```

---

## 변경 사항 요약

| # | 영역 | 변경 내용 | 영향 받는 원본 섹션 |
|---|------|----------|-------------------|
| 1 | 벡터 DB | pgvector 스키마 + 임베딩 컬럼 + 시맨틱 검색 Tool + RPC 함수 + 임베딩 생성 스크립트 추가 | 5, 6, 8, 10 |
| 2 | 아키텍처 | MVP는 Fresh 2.0 단일 서버. Hono 별도 분리 불필요. deno.json, 호환성 매트릭스, 리스크 수정 | 5, 6 |
| 3 | 클로킹 | User-Agent 응답 분기 제거. 단일 HTML + Islands 레이어 방식. 미들웨어는 로깅+차단 전용. 페이지 구조 예시 추가 | 5, 7, 9 |
| 4 | llms.txt | API 엔드포인트 제거. 페이지 URL만 노출. AI 크롤링 우선순위 명시 | 9 |

### 반영하지 않은 항목

| # | 항목 | 이유 |
|---|------|------|
| 5 (타임라인) | 참고 수준. 실제 진행하면서 조정 |
| 7 (어필리에이트 링크 승인 전 처리) | 유저가 별도 반영 불필요 판단 |
