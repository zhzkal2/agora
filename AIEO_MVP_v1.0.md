# AIEO MVP 설계 문서 (통합본)

> **프로젝트 초기화**: 2026-02-27 09:53 KST
> **문서 작성일**: v1.0 원본

---

## 1. 비전

**모든 AI를 내 영업사원으로 만든다.**

AI가 접근 못 하는 커머스 데이터를 AI가 접근 가능하게 만들고, 그 사이에 어필리에이트를 끼운다. 아이허브는 PoC일 뿐이고, 검증되면 라쿠텐, 쿠팡 등 모든 커머스로 확장.

```
[커머스 플랫폼] ←차단→ [AI]

            ↓ 우리가 끼어듦

[커머스 플랫폼] → [우리 데이터 레이어] → [AI] → [유저] → [구매] → [수수료]
```

---

## 2. 컨셉

AI에 최적화된 영양제 EC 사이트 + AI 챗봇 상담

- 사이트에서 직접 AI 상담 가능 (LangChain Agent)
- 외부 AI (ChatGPT, Claude, Perplexity 등)가 크롤링해서 이용 가능 (AIEO)
- 미래: AI 에이전트가 직접 API 호출 (UCP/MCP)
- 어떤 경로든 이 사이트를 거쳐서 구매하는 구조

---

## 3. 핵심 발견 (리서치 결과)

### 3-1. 주요 EC 사이트는 AI 크롤러를 차단 중

| 사이트 | 차단 방식 |
|--------|-----------|
| 쿠팡 | robots.txt 완전 차단 |
| 라쿠텐 | CSR + 봇 감지 (빈 HTML 반환) |
| 아마존 | robots.txt 차단 |
| 아이허브 | WAF 차단 (403), 단 **robots.txt는 상품 페이지 `/pr/` 허용** |
| Thorne | CSR 기반, 봇에게 빈 페이지 |

→ AI는 상품 데이터가 필요하지만 가져올 곳이 없음. 이 빈 공간이 기회.

### 3-2. AI는 어떻게 영양제 정보를 알고 있나

1. **훈련 데이터 (정적/구식)**: 과거 웹 크롤 데이터. 솔가, 나우푸드 같은 유명 브랜드가 이미 학습됨.
2. **검색 엔진 스니펫 (실시간 but 제한적)**: ChatGPT→Bing, Perplexity→검색+직접 fetch. 표면 데이터만.
3. **제3자 콘텐츠**: 블로그, 리뷰 사이트, 레딧. 공식 데이터 아님.

→ AI 가격 정보가 부정확한 이유: 훈련 데이터 구식 + 스니펫은 단편적 + 소스 혼합.

### 3-3. AI 인용은 SEO와 규칙이 다름

| 요소 | SEO | AI 인용 |
|------|-----|---------|
| 도메인 권위 (DA/DR) | 핵심 | 상관관계 거의 0 (OpenAI r≈0.00, Perplexity r=-0.17) |
| 백링크 | 핵심 | 상관관계 0.10 |
| 브랜드 검색량 | 부차적 | 가장 강한 예측 변수 (0.334) |
| 콘텐츠 구조 | 중요 | 매우 중요 (50-150단어 청크 = 인용률 2.3배) |
| 콘텐츠 신선도 | 중요 | AI 봇 트래픽 65%가 1년 이내 콘텐츠 타겟 |

→ **커스텀 도메인 없이도 콘텐츠 구조만 잘 짜면 인용 가능.** 월 15회 방문 페이지가 수천 건 LLM 인용 받은 사례 존재.

### 3-4. AIEO 실제 사례는 없음

- 마케팅 에이전시가 결과를 주장하지만 공개 URL 없음
- 영양제 AIEO 구현 사이트 0개
- 이 사이트가 최초의 공개 AIEO 영양제 케이스 스터디가 될 수 있음

### 3-5. Agentic Commerce가 이미 현실

- **McKinsey 전망**: 2030년 글로벌 $3-5조 달러, 미국만 $1조
- **Shopify + Google**: UCP (Universal Commerce Protocol) 오픈 표준 공동 개발
- **OpenAI + Stripe**: ACP (Agentic Commerce Protocol)
- **Visa**: AI 전용 토큰 카드, Anthropic/OpenAI/Microsoft 파일럿 중
- **Mastercard**: Agent Pay
- **PayPal + Perplexity**: 에이전트 쇼핑 연동
- AI 에이전트가 상품 검색 → 비교 → 결제까지 직접 수행하는 시대

### 3-6. 아마존 API 확장 가능성

- Creators API (구 PA API): 상품 데이터 + 어필리에이트 링크 자동 생성
- 제약: Associates 가입 → 3건 판매 → API 승인 → 30일 10건 유지
- PA API 2026.4.30 폐지, Creators API로 전환 중
- 전략: 아이허브로 시작 → 트래픽 확보 후 아마존 추가

---

## 4. 비즈니스 모델

### 수익 구조

```
AI 또는 유저 → 웹앱에서 영양제 추천 → 아이허브 어필리에이트 링크 → 구매 → 수수료 (5-10%)
```

### 아이허브 어필리에이트 조건

| 항목 | 내용 |
|------|------|
| 네트워크 | Awin, CJ, Impact, Partnerize 중 선택 |
| 신규 커미션 | 첫 3개월 **10%+** |
| 이후 커미션 | **5%+** (보너스 기회 있음) |
| 전환율 | 7.9% (업계 최상위) |
| 쿠키 | 7일 (마지막 클릭 기준) |
| 딥링크 | 모든 상품/페이지 가능 |
| 글로벌 | 180+ 국가 배송 |
| 최소 지급 | 네트워크마다 다름 (Impact $25~) |
| 지급 시기 | 월말 마감 후 약 45일 뒤 |

### 어필리에이트 등록 절차

```
1. 사이트를 먼저 만든다 (심사에 URL 필요)
2. 아래 네트워크 중 1개 선택하여 가입 (무료):
   - Impact (impact.com)     ← 추천. 웹+모바일 단일 링크
   - CJ (cj.com)
   - Awin (awin.com)         ← EUR/GBP/USD 결제
   - Partnerize (partnerize.com)
3. 네트워크 내에서 "iHerb" 검색 → 프로그램 신청
4. iHerb가 사이트 심사 (보통 1~7일)
5. 승인되면 어필리에이트 링크/배너/딥링크 생성 가능
```

### 어필리에이트 링크 구현

```typescript
// 방법 1: 직접 파라미터
const affiliateLink = `https://www.iherb.com/pr/product-slug/12345?rcode=YOUR_CODE`;

// 방법 2: 네트워크 딥링크 생성기
const deepLink = `https://iherb.prf.hn/click/camref:YOUR_REF/destination:${encodeURIComponent(productUrl)}`;
```

### ⚠️ 어필리에이트 주의사항

- 사이트 없이는 신청 불가 → MVP 배포 후 신청
- PPC 광고에서 "iHerb" 상표 입찰 금지
- Rewards 코드와 Affiliate 링크 동시 사용 시 Affiliate만 인정
- 가짜 프로모션/할인 유도 금지

### 데이터 수급

- 아이허브 robots.txt: 상품 페이지 `/pr/` 크롤링 허용
- 사이트맵 공개: `https://www.iherb.com/sitemap_index.xml`
- MVP: 수동 입력 또는 저속 스크래핑 (2-3초 간격, 무료)
- 확장시: Apify ($1.5/1000건) 또는 자체 스크래퍼 + 프록시

---

## 5. 시스템 아키텍처

### 전체 구조: 서버 1개, DB 1개

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

### 세 개의 채널, 같은 백엔드

```
                    ┌─ [AI 크롤러] → JSON-LD SSR 페이지 (AIEO)
                    │
[백엔드 API] ──────┼─ [유저 브라우저] → 웹앱 UI + 챗봇 (수익화)
(Hono + Supabase)   │
                    └─ [AI 에이전트] → UCP/MCP API (미래 대비)
```

### 요청 흐름

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

### 유저 흐름 1 — 사이트 직접 방문 (사람)

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

### 유저 흐름 2 — 외부 AI 경유 (AIEO)

```
사용자: "영양제 추천해줘" (ChatGPT/Claude/Perplexity에서)
    ↓
외부 AI가 웹 검색
    ↓
이 사이트 발견 (llms.txt, JSON-LD, sitemap)
    ↓
Fresh (User-Agent: AI → 구조화된 HTML + JSON-LD)
    ↓
외부 AI가 상품 정보 읽고 감 (LangChain 안 거침)
    ↓
외부 AI가 사용자에게 이 사이트 상품 추천 + 출처 링크
    ↓
사용자 클릭 → 사이트 유입 → 구매 → 어필리에이트 수익
```

### 유저 흐름 3 — GPT Store (추가 채널)

```
사용자: GPT Store에서 "영양제 추천 GPT" 선택
    ↓
"피곤한데 영양제 추천해줘"
    ↓
GPT → Actions → 내 백엔드 API 호출
    ↓
추천 결과 + 아이허브 어필리에이트 링크
    ↓
사용자 클릭 → 아이허브 구매 → 수수료
```

### 유저 흐름 4 — Agentic Commerce (미래)

```
유저: "비타민B 추천해서 싸게 사줘"
    ↓
유저 AI 에이전트 (ChatGPT/Gemini)
    ↓ UCP/MCP 프로토콜
내 서버: 영양제 데이터 API
    ↓ 추천 결과 + 어필리에이트 링크
결제 AI (Visa Agent Pay / Stripe)
    ↓
유저: "이거 결제할게" ← 여기만 사람
```

---

## 6. 기술 스택 (확정)

> **원칙: 프론트/백엔드 전부 Deno + TypeScript로 통일**
> Fresh의 Islands 아키텍처 = 기본 정적 HTML + 필요한 부분만 JS → AI 크롤링에 최적

### 런타임 / 언어

| 기술 | 버전 | 비고 |
|------|------|------|
| **Deno** | `^2.7` (stable) | 12주마다 마이너 릴리스. V8 14.2, TypeScript 5.9.2 내장 |
| **TypeScript** | `5.9.2` (Deno 내장) | 별도 설치 불필요 |

### 프론트엔드

| 기술 | 버전 | 비고 |
|------|------|------|
| **Fresh** | `2.0.0-beta` | Vite 통합 옵션, Hono-like API, async 컴포넌트. `deno run -Ar jsr:@fresh/init`으로 설치 |
| **Preact** | `10.28.4` | Fresh 내장. 3kB. `preact/compat`로 React 18 호환 |
| **Tailwind CSS** | `^4.2.0` | CSS-first 설정 (`@theme`), `tailwind.config.js` 불필요 |

### Fresh가 AIEO에 적합한 이유

- SSR 기본값 → AI 크롤러가 완전한 HTML 받음 (CSR 사이트들의 빈 페이지 문제 없음)
- Islands Architecture → 선택적 하이드레이션 → 최소 JS
- Edge 렌더링 → 봇 트래픽 비용 효율적

### ⚠️ Fresh 2.0 주의사항

- 아직 beta. stable 전에 API 변경 가능성 있음
- 프로덕션 사용은 deno.com, Deno Deploy에서 실증됨
- Fresh 2.0은 Hono-like API → Hono와 직접 결합 불필요할 수도 있으나, API 서버는 Hono로 분리하는 것이 명확

### 📌 Preact/React 호환 기준

**React 18.3.1 문법으로 작성.** `@preact/compat`가 React 18.3.1 alias로 배포되므로 React 18 API/문법에 맞춰 짜면 Preact에서 그대로 동작. **React 19 문법 사용 금지** (`use()`, `useActionState`, Server Components 등).

**✅ 완전 지원**: useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, forwardRef, memo, lazy + Suspense, createPortal, useId

**⚠️ 부분 지원**: useTransition/useDeferredValue (stub만 있고 Concurrent 없음), Automatic Batching (이벤트 핸들러 내에서만)

**❌ 미지원**: Concurrent Rendering, Streaming SSR, use() 훅, Server Components/Actions

> **이 프로젝트에서 React 18/19 미지원 기능은 실질적 영향 없음.** Fresh의 Islands 아키텍처는 클라이언트 JS를 극도로 줄이므로 Concurrent Rendering이 해결하려는 문제 자체가 발생하지 않음.

### 백엔드

| 기술 | 버전 | 비고 |
|------|------|------|
| **Hono** | `^4.12.2` | JSR: `@hono/hono`. 제로 의존성, 12kB 미만. `^4.11.7` 이상 필수 (보안 패치) |

### AI / Agent (사이트 챗봇 전용)

| 기술 | 버전 | 비고 |
|------|------|------|
| **LangChain.js** | `^1.2.26` | 에이전트 + 도구 체이닝, Conversational Memory |
| **@langchain/core** | `^1.2.15` | 코어 추상화. 별도 설치 필요 |
| **@langchain/anthropic** | 최신 | Claude API 연동. `ChatAnthropic` |
| **LangGraph.js** | 최신 (선택) | 고급 에이전트 오케스트레이션. MVP 이후 검토 |

> **LangChain은 사이트 내 챗봇에서만 사용. 외부 AI는 HTML + JSON-LD 읽고 감 (LangChain 안 거침).**

### DB

| 기술 | 버전 | 비고 |
|------|------|------|
| **Supabase** | - | PostgreSQL BaaS. Free: 500MB DB, 1GB Storage |
| **supabase-js** | `^2.97.0` | Deno 공식 지원 |
| **Supabase CLI** | `^2.76.14` | 로컬 개발, 마이그레이션, 타입 생성 |

### 스크래퍼 (확장 시)

| 기술 | 버전 | 비고 |
|------|------|------|
| **Playwright** | `^1.58.2` | Deno npm 스펙으로 사용. 비공식 조합이므로 주의 |

⚠️ Playwright + Deno는 비공식. 문제 발생 시 `puppeteer` (Deno 공식 지원) 대안 검토. `Deno.cron`으로 스케줄링.

### 린터 / 포매터

| 기술 | 버전 | 비고 |
|------|------|------|
| **Biome** | `^2.4.4` | Rust 기반. ESLint+Prettier 대비 10~25배 빠름. `useSortedClasses`로 Tailwind 정렬 지원 |

### AIEO / 구조화 데이터

| 기술 | 비고 |
|------|------|
| **JSON-LD** | Schema.org `Product`, `Offer`, `NutritionInformation` |
| **llms.txt** | AI 크롤러용 사이트 설명 파일 |
| **시맨틱 HTML** | `<article>`, `<section>`, `<main>` 등 의미론적 마크업 |

### 버전 호환성 매트릭스

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

### 핵심 리스크

- **Fresh 2.0 beta**: 아직 stable 아님. API 변경 가능. 단, deno.com이 프로덕션 사용 중
- **Playwright + Deno**: 비공식 조합. 스크래핑 안정성 모니터링 필요
- **Tailwind v4 + Fresh**: CSS-first 설정이 Fresh의 Vite 통합과 잘 맞으나, beta 엣지 케이스 가능

### deno.json 설정 예시

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

---

## 7. AI/유저 분기 미들웨어

### User-Agent 판별

| AI | User-Agent |
|----|------------|
| ChatGPT (검색) | `ChatGPT-User`, `OAI-SearchBot` |
| ChatGPT (크롤링) | `GPTBot` |
| Claude | `ClaudeBot`, `Claude-Web` |
| Perplexity | `PerplexityBot` |
| Google AI | `Google-Extended` |
| Bing/Copilot | `bingbot` |
| 차단 대상 | `Bytespider`, `CCBot` |

### 미들웨어 구현

```typescript
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
```

### 분기 내용

| | AI 봇 | 일반 유저 |
|--|-------|----------|
| 레이아웃 | 최소 HTML + JSON-LD | 풀 UI + 챗봇 |
| 데이터 | 구조화된 성분/효능/가격 | 이미지 + 리뷰 + 추천 |
| 목적 | 파싱 최적화 | 구매 경험 최적화 |
| LangChain | 안 거침 | 챗봇에서 사용 |

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

---

## 8. 데이터 설계

### DB 스키마

```sql
-- 브랜드
CREATE TABLE brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  origin TEXT,
  concept TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 영양제 제품
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
  form TEXT,                    -- "캡슐", "정제", "파우더"
  certification TEXT[],         -- {"GMP", "NSF", "Vegan"}
  image_url TEXT,
  affiliate_url TEXT,
  rating DECIMAL(3,2),
  review_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 성분
CREATE TABLE ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ko TEXT,
  category TEXT,                -- "vitamin", "mineral", "amino_acid", "herb"
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 제품-성분 매핑 (함량 포함)
CREATE TABLE product_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  amount DECIMAL(10,2),
  unit TEXT,                    -- "mg", "mcg", "IU"
  daily_value_pct INT,
  form TEXT,                    -- "메틸코발라민", "시아노코발라민" 등
  UNIQUE(product_id, ingredient_id)
);

-- 증상/효능 카테고리
CREATE TABLE symptoms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ko TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 성분-증상 매핑
CREATE TABLE ingredient_symptoms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID REFERENCES ingredients(id),
  symptom_id UUID REFERENCES symptoms(id),
  relevance_score INT DEFAULT 5,   -- 1-10
  evidence_level TEXT,              -- "strong", "moderate", "emerging"
  UNIQUE(ingredient_id, symptom_id)
);

-- AI 봇 접근 로그
CREATE TABLE bot_logs (
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
CREATE TABLE click_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT now(),
  product_slug TEXT,
  referrer TEXT,
  source TEXT,                     -- "web", "gpt", "ai_referral"
  affiliate_url TEXT
);
```

### 목 데이터: 가짜 브랜드 4개

AIEO 대조 실험을 위해 가짜 브랜드를 사이트별로 다르게 배정:

| 브랜드 | 컨셉 | 배정 사이트 |
|--------|------|------------|
| VitaCore Labs | 미국풍, 고함량 프리미엄 | JSON-LD ✅ + 커스텀 도메인 |
| NutriZen | 자연주의, 활성형 | JSON-LD ❌ + 커스텀 도메인 |
| BioPlus Health | 가성비, 대용량 | JSON-LD ✅ + 서브도메인 |
| MediPure Labs | 의약품급 GMP | JSON-LD ❌ + 서브도메인 |

→ AI 응답에 어떤 가짜 브랜드가 나오느냐로 어떤 조건이 유리한지 판별 가능.

### 예시 제품 데이터

```json
{
  "brand": "VitaCore Labs",
  "name": "B-Complex Ultra 3000",
  "price": 28.99,
  "currency": "USD",
  "serving_size": "1캡슐",
  "servings_per_container": 90,
  "form": "캡슐",
  "certification": ["GMP", "NSF", "Vegan"],
  "rating": 4.7,
  "review_count": 342,
  "ingredients": [
    { "name": "비타민 B1 (티아민)", "amount": 100, "unit": "mg", "dv_pct": 8333 },
    { "name": "비타민 B6 (P-5-P)", "amount": 100, "unit": "mg", "dv_pct": 5882 },
    { "name": "비타민 B12 (메틸코발라민)", "amount": 3000, "unit": "mcg", "dv_pct": 125000 },
    { "name": "엽산 (메틸폴레이트)", "amount": 800, "unit": "mcg", "dv_pct": 200 },
    { "name": "비오틴", "amount": 5000, "unit": "mcg", "dv_pct": 16667 },
    { "name": "판토텐산 (B5)", "amount": 500, "unit": "mg", "dv_pct": 10000 }
  ],
  "symptoms": ["피로회복", "에너지 대사", "신경계 건강"]
}
```

---

## 9. AI용 구조화 데이터 설계

### JSON-LD (제품 페이지)

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "VitaCore Labs B-Complex Ultra 3000",
  "brand": { "@type": "Brand", "name": "VitaCore Labs" },
  "description": "고함량 활성형 비타민B 콤플렉스. 메틸코발라민 B12 3000mcg, P-5-P B6 100mg 포함.",
  "category": "영양제 > 비타민B",
  "offers": {
    "@type": "Offer",
    "price": "28.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "additionalProperty": [
    { "@type": "PropertyValue", "name": "서빙 사이즈", "value": "1캡슐" },
    { "@type": "PropertyValue", "name": "총 서빙수", "value": "90" },
    { "@type": "PropertyValue", "name": "제형", "value": "캡슐" },
    { "@type": "PropertyValue", "name": "비타민 B12 함량", "value": "3000mcg (메틸코발라민)" },
    { "@type": "PropertyValue", "name": "비타민 B6 함량", "value": "100mg (P-5-P)" },
    { "@type": "PropertyValue", "name": "적응증", "value": "피로회복, 에너지 대사, 신경계 건강" },
    { "@type": "PropertyValue", "name": "인증", "value": "GMP, NSF, Vegan" }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "reviewCount": "342"
  }
}
```

### 50-150 단어 자기완결적 청크 (AI 인용 최적화)

AI는 50-150 단어 단위로 추출해서 인용하므로, 각 섹션이 독립적으로 의미가 완결되어야 함:

```html
<section>
  <h2>VitaCore Labs B-Complex Ultra 3000 요약</h2>
  <p>
    VitaCore Labs B-Complex Ultra 3000은 활성형 비타민B군 복합 영양제입니다.
    메틸코발라민 형태의 B12를 3000mcg, P-5-P 형태의 B6를 100mg 함유하여
    체내 흡수율이 일반 비타민B 대비 높습니다. 1캡슐당 90일분이며
    GMP, NSF 인증을 받았습니다. 피로회복, 에너지 대사, 신경계 건강에
    도움을 줄 수 있으며 비건 캡슐을 사용합니다.
    가격은 $28.99 (약 38,000원)이며 1일 비용은 $0.32입니다.
  </p>
</section>
```

### llms.txt

```
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

---

## 10. API 엔드포인트 설계

### Hono API

```
GET  /api/products                    - 전체 상품 목록
GET  /api/products/:slug              - 상품 상세
GET  /api/products/search?q=비타민B    - 상품 검색
GET  /api/recommend?symptom=피로      - 증상 기반 추천
GET  /api/compare?ids=uuid1,uuid2     - 상품 비교
GET  /api/ingredients/:id             - 성분 상세
GET  /api/symptoms                    - 증상 목록
GET  /api/symptoms/:slug/products     - 증상별 추천 상품
POST /api/chat                        - LangChain 챗봇 (사이트 전용)
```

### LangChain Agent Tools (사이트 챗봇)

```typescript
// Tool 1: 상품 검색
searchProducts({ query: "비타민B", symptom: "피로" })

// Tool 2: 성분 충돌 체크
checkInteraction({ ingredients: ["비타민B6", "마그네슘"] })

// Tool 3: 복용법 안내
getDosageGuide({ productId: "vitacore-b-complex" })
```

### 미래: UCP/MCP 호환

같은 비즈니스 로직을 MCP tool로 노출:

```
search_supplements("피로회복")
get_product_detail("vitacore-b-complex-ultra-3000")
compare_supplements(["product-a", "product-b"])
recommend_by_symptom("피로")
```

---

## 11. AIEO 실험 설계

### 실험 변수: 2x2

| | JSON-LD 있음 | JSON-LD 없음 |
|---|---|---|
| **커스텀 도메인** | VitaCore Labs (사이트 A) | NutriZen (사이트 B) |
| **서브도메인 (Vercel)** | BioPlus Health (사이트 C) | MediPure Labs (사이트 D) |

- 4개 사이트, 같은 구조/콘텐츠, 다른 가짜 브랜드
- 변수: 도메인 종류 × JSON-LD 유무

### 측정 방법

1. **크롤링 여부**: 서버 로그에서 AI 봇 접근 기록 (GPTBot, Claude-Web, PerplexityBot)
2. **인덱싱 여부**: AI에게 가짜 브랜드명 직접 검색 ("VitaCore Labs 비타민B")
3. **인용 여부**: AI에게 "비타민B 추천해줘" → 가짜 브랜드가 응답에 나오는가
4. **출처 링크**: 인용 시 내 사이트가 source로 표시되는가

### 검증 시나리오

- **직접 질의**: "비타민B 추천해줘" → 가짜 브랜드 노출 여부
- **증상 기반**: "피곤한데 영양제 뭐 먹어" → 성분-효능 매핑 인용 여부
- **브랜드 직접**: "VitaCore Labs" 검색 → 내 사이트 소스 여부

### 핵심 가설과 리스크

**가설**: AI가 내 사이트를 서치해서 찾고, 데이터를 가져가서, 유저한테 전달한다.

**리스크**:
- 훈련 데이터에 이미 있는 솔가/나우푸드를 이길 수 없을 가능성
- AI가 일반 질의에서는 기존 지식으로 답변하고 검색을 안 할 가능성
- 세부 질의에서만 기회가 있지만 그런 유저는 적음

→ **실패해도 "AIEO가 작동 안 한다"는 귀중한 데이터.**
→ 비용이 $0에 가까우므로 해볼 가치 있음.

---

## 12. 로깅 설계

### AI 봇 접근 로그

```typescript
interface BotLog {
  timestamp: string;
  bot_name: string;        // "GPTBot", "Claude-Web" 등
  user_agent: string;
  ip: string;
  path: string;            // "/products/vitacore-b-complex"
  response_code: number;
  response_time_ms: number;
}
```

### 어필리에이트 클릭 추적

```typescript
interface ClickLog {
  timestamp: string;
  product_slug: string;
  referrer: string;
  source: string;          // "web", "gpt", "ai_referral"
  affiliate_url: string;
}
```

---

## 13. 개발 순서

### Phase 1: 백엔드 + 데이터 (1-2일차)

- [ ] Supabase 프로젝트 생성 + 스키마 적용
- [ ] 가짜 브랜드 4개 + 제품 데이터 시딩
- [ ] 증상-성분 매핑 데이터 입력
- [ ] Hono API 서버 구현 (상품 조회, 추천, 비교)

### Phase 2: AI용 SSR 페이지 (3일차)

- [ ] Fresh SSR 페이지 (제품 상세)
- [ ] JSON-LD 구조화 데이터 삽입
- [ ] 50-150 단어 자기완결적 청크 구조
- [ ] robots.txt (AI 봇 허용)
- [ ] llms.txt 작성
- [ ] sitemap.xml 생성

### Phase 3: 미들웨어 + 로깅 (4일차)

- [ ] User-Agent 판별 미들웨어
- [ ] AI 봇 접근 로깅 (Supabase bot_logs)
- [ ] AI용/유저용 응답 분기
- [ ] 클로킹 방지 확인 (동일 콘텐츠, 다른 표현)

### Phase 4: 유저용 웹앱 (5-6일차)

- [ ] AI 대화형 추천 UI (Islands)
- [ ] LangChain Agent + Tools 연동
- [ ] 어필리에이트 링크 생성 + 클릭 추적
- [ ] 상품 비교 인터페이스

### Phase 5: 배포 + 실험 (7일차)

- [ ] 4개 사이트 배포 (도메인 × JSON-LD 조합)
- [ ] AI 플랫폼에서 테스트 질의 (ChatGPT, Perplexity, Claude)
- [ ] 서버 로그 모니터링 시작

### Phase 6: 확장 (이후)

- [ ] GPT Store에 영양제 추천 GPT 등록 (Actions → 내 API)
- [ ] UCP/MCP 서버 구현
- [ ] 아이허브 실제 데이터 연동 (스크래핑 or Apify)
- [ ] 아마존 Creators API 연동
- [ ] 어필리에이트 등록 (MVP 배포 후)

---

## 14. 비용

| 항목 | 비용 |
|------|------|
| Supabase | 무료 (Free tier) |
| Deno Deploy / Vercel | 무료 (Free tier) |
| 커스텀 도메인 (.com) × 2 | ~$20/년 |
| Apify (확장시) | ~$30/월 |
| LLM API (챗봇용) | 사용량 따라 ($5-20/월 예상) |
| **MVP 총 비용** | **~$20 + LLM API 비용** |

---

## 15. 주의사항

- **의료법/약사법**: "진단"이 아닌 "정보 제공"으로 표현. 면책 문구 필수.
- **iHerb 스크래핑**: robots.txt는 허용하나, ToS 위반 가능성 모니터링 필요.
- **어필리에이트 약관**: 비공식 크롤링 데이터 사용이 허용되는지 확인 필요.
- **클로킹 금지**: AI용/유저용 콘텐츠는 동일, 표현만 다르게.

---

## 16. 참고 링크

### 데이터 소스
- 아이허브 robots.txt: https://kr.iherb.com/robots.txt
- 아이허브 사이트맵: https://www.iherb.com/sitemap_index.xml
- 아이허브 어필리에이트: https://www.iherb.com/info/affiliates

### Agentic Commerce
- Shopify UCP: https://www.shopify.com/ucp
- UCP 스펙: https://ucp.dev
- UCP 개발자 블로그: https://developers.googleblog.com/under-the-hood-universal-commerce-protocol-ucp/
- Shopify Agentic 문서: https://shopify.dev/docs/agents
- McKinsey Agentic Commerce: https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-agentic-commerce-opportunity

### AI 인용 리서치
- AI 인용 리포트 2025: https://thedigitalbloom.com/learn/2025-ai-citation-llm-visibility-report/
- LLM 도메인 권위 분석: https://searchatlas.com/blog/authority-metrics-in-the-age-of-llms-visibility-correlation-analysis/
- 최다 인용 도메인: https://higoodie.com/blog/most-cited-domains-in-llms
- LLM 인용 트렌드: https://wellows.com/blog/llm-citation-trends-for-ai-search/
