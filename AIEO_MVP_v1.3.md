# AIEO MVP 설계 문서 — 변경사항 (v1.3)

> **문서 작성일**: 2026-03-04 **브랜치**: `feat/phase4-agent`
>
> v1.0 + v1.1 + v1.2 대비 5건의 변경사항을 정리합니다. Phase 4 (유저 웹앱 + AI
> Agent) 구현 완료에 따른 설계 반영입니다. 각 변경사항은 원본 섹션 번호와 위치를
> 명시합니다.

---

## 변경 1: Mastra/AI SDK 버전 업그레이드 및 API 변경

### 배경

v1.2에서 LangChain → Mastra 교체를 설계했으나, 당시 기재한 버전(`mastra@^0.4.8`,
`@mastra/core@^0.8.2`, `@ai-sdk/anthropic@^1.3.9`)은 실제 npm 레지스트리에
존재하지 않는 버전이었다. Phase 4 실제 구현 시 최신 안정 버전으로 교체하고, API
변경사항을 반영했다.

| 항목                | v1.2 (설계) | v1.3 (실제) | 변경 사유                     |
| ------------------- | ----------- | ----------- | ----------------------------- |
| `mastra`            | `^0.4.8`    | `^1.3.6`    | 0.x 버전 존재하지 않음        |
| `@mastra/core`      | `^0.8.2`    | `^1.9.0`    | 0.x 버전 존재하지 않음        |
| `@ai-sdk/anthropic` | `^1.3.9`    | `^3.0.56`   | 1.x 버전 존재하지 않음        |
| `zod`               | (미명시)    | `^4.3.6`    | Tool inputSchema/outputSchema |

### 반영 위치 1: 섹션 6 (기술 스택) — AI 프레임워크 버전 수정

v1.2:

| 기술                  | 버전     | 비고                                    |
| --------------------- | -------- | --------------------------------------- |
| **Mastra**            | `^0.4.8` | TypeScript 네이티브 AI Agent 프레임워크 |
| **@mastra/core**      | `^0.8.2` | Agent + Tool 정의, 워크플로우           |
| **@ai-sdk/anthropic** | `^1.3.9` | Claude API 연동 (Vercel AI SDK 기반)    |

변경:

| 기술                  | 버전      | 비고                                       |
| --------------------- | --------- | ------------------------------------------ |
| **Mastra**            | `^1.3.6`  | TypeScript 네이티브 AI Agent 프레임워크    |
| **@mastra/core**      | `^1.9.0`  | Agent + Tool 정의 (v1.x에서 API 변경 있음) |
| **@ai-sdk/anthropic** | `^3.0.56` | Claude API 연동 (Vercel AI SDK v3 기반)    |
| **zod**               | `^4.3.6`  | Tool 스키마 검증 (Mastra 의존)             |

### 반영 위치 2: 섹션 6 — deno.json imports 수정

v1.2:

```json
{
  "imports": {
    "@mastra/core": "npm:@mastra/core@^0.8.2",
    "mastra": "npm:mastra@^0.4.8",
    "@ai-sdk/anthropic": "npm:@ai-sdk/anthropic@^1.3.9"
  }
}
```

변경:

```json
{
  "imports": {
    "@mastra/core": "npm:@mastra/core@^1.9.0",
    "mastra": "npm:mastra@^1.3.6",
    "@ai-sdk/anthropic": "npm:@ai-sdk/anthropic@^3.0.56",
    "zod": "npm:zod@^4.3.6"
  }
}
```

### 반영 위치 3: 섹션 10 — Mastra v1.x API 변경사항

v1.2에서 제시한 코드 패턴의 3가지 주요 변경:

#### (a) Agent 생성 시 `id` 필드 필수

v1.2:

```typescript
const supplementAgent = new Agent({
  name: "supplement-advisor",
  instructions: `...`,
  model: anthropic("claude-sonnet-4-20250514"),
  tools: { ... },
});
```

변경:

```typescript
const supplementAgent = new Agent({
  id: "supplement-advisor",       // ← 필수 (v1.x 신규)
  name: "supplement-advisor",
  instructions: `...`,
  model: "anthropic/claude-sonnet-4-20250514",  // ← 문자열 형태 지원
  tools: { ... },
});
```

#### (b) Tool execute 시그니처 변경

v1.2:

```typescript
execute: (async ({ context }) => {
  const { query, limit } = context;
  // ...
});
```

변경:

```typescript
execute: (async (input) => {
  const { query, limit } = input;
  // ...
});
```

> `execute`의 첫 번째 인자가 `{ context }` 객체에서 입력 데이터 직접 전달로
> 변경됨.

#### (c) Agent.generate() 호출 패턴

v1.2:

```typescript
const result = await supplementAgent.generate(userMessage);
```

변경 (히스토리 포함 시):

```typescript
// MessageListInput은 string을 허용하므로 히스토리를 프롬프트 문자열로 구성
function buildPrompt(history: ChatMessage[], currentMessage: string): string {
  if (history.length === 0) return currentMessage;
  const historyLines = history.map((msg) =>
    msg.role === "user"
      ? `[사용자]: ${msg.content}`
      : `[상담사]: ${msg.content}`
  ).join("\n\n");
  return `이전 대화:\n${historyLines}\n\n[사용자]: ${currentMessage}`;
}

const response = await supplementAgent.generate(prompt);
```

> `generate()`의 `MessageListInput` 타입은
> `string | string[] | MessageInput |
> MessageInput[]`을 허용. 대화 히스토리가
> 있는 경우, v4/v5 AI SDK 타입 호환성 문제를 회피하기 위해 문자열 프롬프트
> 방식을 채택.

---

## 변경 2: AI 챗봇 Agent + API 구현 (Phase 4)

### 배경

v1.0 섹션 5 "유저 흐름 1"에서 설계한 AI 챗봇을 실제 구현했다. Agent는 4개의
Tool(키워드 검색, 증상 검색, 성분 상호작용, 복용법 안내)을 가지며, Claude
claude-sonnet-4-20250514 모델을 사용한다.

### 반영 위치 1: 섹션 10 (API 엔드포인트) — Agent 구현 상세

#### 파일: `utils/agent.ts` — Mastra Agent 정의

```typescript
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { supabase } from "./supabase.ts";

// Tool 1: 키워드 기반 제품 검색
export const searchProductsTool = createTool({
  id: "search_products",
  description: "키워드로 영양제 제품을 검색합니다.",
  inputSchema: z.object({
    keyword: z.string(),
    limit: z.number().default(5),
  }),
  outputSchema: z.object({
    products: z.array(z.object({/* ... */})),
    total: z.number(),
  }),
  execute: async (input) => {
    // Supabase ilike 검색 + brands 조인
  },
});

// Tool 2: 증상 기반 제품 검색
export const searchBySymptomTool = createTool({
  id: "search_by_symptom",
  description: "증상/효능 기반으로 적합한 영양제를 찾습니다.",
  inputSchema: z.object({
    symptom: z.string(),
    limit: z.number().default(5),
  }),
  execute: async (input) => {
    // symptoms → ingredient_symptoms → ingredients → product_ingredients 조인
  },
});

// Tool 3: 성분 상호작용 체크 (MVP: 정적 데이터)
export const checkInteractionTool = createTool({
  id: "check_ingredient_interaction",
  description: "두 가지 이상의 영양 성분 간 상호작용을 확인합니다.",
  inputSchema: z.object({
    ingredients: z.array(z.string()).min(2),
  }),
  execute: async (input) => {
    // KNOWN_INTERACTIONS 정적 데이터 (8개 상호작용쌍)
    // 성분 이름 정규화 (한글/영문 매핑)
  },
});

// Tool 4: 복용법 안내 (MVP: 정적 데이터 + DB 폴백)
export const getDosageGuideTool = createTool({
  id: "get_dosage_guide",
  description:
    "특정 영양 성분의 권장 복용량, 복용 시간, 주의사항을 안내합니다.",
  inputSchema: z.object({
    ingredient: z.string(),
  }),
  execute: async (input) => {
    // DOSAGE_GUIDES 정적 데이터 (6개 성분)
    // 매칭 실패 시 DB ingredients 테이블 폴백
  },
});

export const supplementAgent = new Agent({
  id: "supplement-advisor",
  name: "supplement-advisor",
  instructions: SYSTEM_INSTRUCTIONS,
  model: "anthropic/claude-sonnet-4-20250514",
  tools: {
    searchProducts: searchProductsTool,
    searchBySymptom: searchBySymptomTool,
    checkInteraction: checkInteractionTool,
    getDosageGuide: getDosageGuideTool,
  },
});
```

Agent 시스템 프롬프트 주요 규칙:

1. 의학적 진단/처방 불가 고지
2. DB에 있는 제품만 추천 (할루시네이션 방지)
3. 제품 추천 시 `/products/{slug}` 링크 포함
4. 성분 상호작용/복용법 질문에 반드시 전용 Tool 사용
5. 한국어 응답, 구조적 포맷 (목록, 소제목)

### 반영 위치 2: 섹션 10 — Chat API 엔드포인트

#### 파일: `routes/api/chat.ts`

```text
POST /api/chat
├── Body: { message: string, history: ChatMessage[] }
├── 검증: message 1000자 이내, history 20턴 이내
├── 히스토리 + 현재 메시지를 프롬프트 문자열로 구성
├── supplementAgent.generate(prompt) 호출
└── Response: { reply: string }
```

---

## 변경 3: ChatBot Island 및 AffiliateButton Island 구현

### 배경

v1.0 섹션 5 "유저 흐름 2"에서 설계한 어필리에이트 클릭 추적과, 유저 인터랙션이
필요한 AI 상담 챗봇을 Fresh Islands Architecture에 맞게 구현했다.

### 반영 위치 1: 섹션 11 (디렉토리 구조) — islands 추가

기존:

```text
agora/
├── islands/           # (비어있음 — Phase 4 이전)
```

변경:

```text
agora/
├── islands/
│   ├── ChatBot.tsx         # ← AI 챗봇 (플로팅 버튼 + 채팅 패널)
│   ├── AffiliateButton.tsx # ← 어필리에이트 링크 + 클릭 추적
│   └── ProductCompare.tsx  # ← 제품 비교 인터랙티브 UI
```

### 반영 위치 2: 섹션 5 (시스템 아키텍처) — 유저 흐름 구체화

#### ChatBot Island

```text
사용자 → 플로팅 버튼 (우측 하단) → 채팅 패널 열림
     → 메시지 입력 → POST /api/chat → Mastra Agent
     → AI 응답 표시 (마크다운 포맷: 링크, 볼드, 줄바꿈)
```

UI 구성:

- 플로팅 원형 버튼 (fixed, bottom-6, right-6, z-50)
- 채팅 패널: 380px 너비, 560px 높이
- 헤더: 파란 배경, 닫기 버튼
- 메시지 영역: 사용자(파란)/AI(회색) 말풍선
- 로딩 애니메이션: 3점 바운스
- 입력 영역: 텍스트 입력 + 전송 버튼 + 면책 안내

상태 관리: Preact Signals (`useSignal`)

- `isOpen`: 패널 표시 여부
- `messages`: 대화 내역
- `input`: 현재 입력 텍스트
- `isLoading`: 응답 대기 중

#### AffiliateButton Island

```text
사용자 → "구매하러 가기" 클릭
     → POST /api/click (fire-and-forget, 응답 비대기)
     → 새 탭에서 affiliate_url 열기
     → 2초 후 버튼 상태 초기화
```

Props:

```typescript
interface AffiliateButtonProps {
  productSlug: string;
  affiliateUrl: string;
  source: "product_page" | "compare" | "recommendation" | "chatbot";
  label?: string; // 기본값: "구매하러 가기"
}
```

### 반영 위치 3: 섹션 10 — Click Tracking API 엔드포인트

#### 파일: `routes/api/click.ts`

```text
POST /api/click
├── Body: { product_slug, referrer, source, affiliate_url }
├── 검증: product_slug 필수, source 유효값, referrer 2000자 제한
├── supabaseAdmin.from("click_logs").insert(...)
└── Response: { ok: true }
```

> `supabaseAdmin`(service_role) 사용. 키 없으면 로깅 건너뛰고 OK 반환.

### 반영 위치 4: 섹션 8 (데이터 설계) — click_logs 사용 패턴

| 필드          | 소스      | 비고                                              |
| ------------- | --------- | ------------------------------------------------- |
| product_slug  | 요청 body | 클릭한 제품 식별자                                |
| referrer      | 요청 body | 클릭 발생 페이지 URL (location.href)              |
| source        | 요청 body | product_page / compare / recommendation / chatbot |
| affiliate_url | 요청 body | 이동 대상 어필리에이트 URL                        |

---

## 변경 4: 제품 비교 기능 구현

### 배경

v1.0에서는 제품 비교 기능이 명시적으로 설계되지 않았으나, Phase 4에서 사용자
경험 향상을 위해 제품 비교 페이지를 추가했다. 최대 4개 제품을 나란히 비교할 수
있다.

### 반영 위치 1: 섹션 10 — Compare API 엔드포인트

#### 파일: `routes/api/compare.ts`

```text
GET /api/compare?slugs=slug1,slug2[,slug3,slug4]
├── 검증: slugs 2~4개
├── Supabase: products + brands + product_ingredients + ingredients 조인
├── 요청 순서 유지
└── Response: { products: CompareProduct[] }
```

CompareProduct 구조:

```typescript
{
  name, slug, price, currency,
  serving_size, servings_per_container, form,
  certification, rating, review_count,
  daily_cost,     // price / servings_per_container
  brand_name,
  ingredients: [{ name_ko, name, amount, unit, daily_value_pct, form }]
}
```

### 반영 위치 2: 섹션 9 (페이지 설계) — 비교 페이지 추가

#### 파일: `routes/compare.tsx` — `/compare` 페이지

- URL: `/compare?slugs=slug1,slug2`
- 서버에서 전체 활성 제품 목록 fetch (선택지 표시용)
- `ProductCompare` Island에 `initialSlugs`와 `allProducts` 전달

#### ProductCompare Island 기능:

| 기능       | 상세                                                    |
| ---------- | ------------------------------------------------------- |
| 제품 선택  | 토글 버튼 (최대 4개), 선택 시 URL 파라미터 동기화       |
| 기본 비교  | 가격, 1일 비용(최저 하이라이트), 평점(최고 하이라이트)  |
| 상세 비교  | 서빙 크기, 제형, 인증 배지                              |
| 성분 비교  | 모든 제품의 성분 합집합, 함량·%DV·형태 표시, 미보유 "-" |
| URL 동기화 | `history.replaceState`로 slugs 파라미터 실시간 업데이트 |

### 반영 위치 3: 섹션 11 — 라우트 파일 추가

```text
agora/
├── routes/
│   ├── compare.tsx         # ← 추가: 제품 비교 페이지
│   ├── api/
│   │   ├── compare.ts      # ← 추가: 비교 데이터 API
```

---

## 변경 5: 기존 페이지 통합 및 내비게이션 수정

### 배경

Phase 4의 새 기능(챗봇, 비교, 어필리에이트)을 기존 페이지에 통합했다.

### 반영 위치 1: 섹션 9 (페이지 설계) — _app.tsx 수정

변경 내용:

1. `ChatBot` Island import 및 `</body>` 직전에 배치 (전 페이지 사용 가능)
2. 내비게이션에 "비교" 링크 추가

```diff
 <div class="flex gap-6 text-sm">
   <a href="/products">제품</a>
+  <a href="/compare">비교</a>
   <a href="/symptoms">증상별 추천</a>
 </div>
 <Component />
 <footer>...</footer>
+<ChatBot />
```

### 반영 위치 2: 섹션 9 — 제품 상세 페이지 수정

#### 파일: `routes/products/[slug].tsx`

변경 내용:

- `affiliate_url` 필드를 Supabase 쿼리에 추가
- `affiliate_url`이 존재하는 제품에 `AffiliateButton` Island 표시

```typescript
{
  product.affiliate_url && (
    <AffiliateButton
      productSlug={product.slug}
      affiliateUrl={product.affiliate_url}
      source="product_page"
    />
  );
}
```

### 반영 위치 3: 섹션 9 — 제품 목록 페이지 수정

#### 파일: `routes/products/index.tsx`

변경 내용:

- 헤더에 "제품 비교하기" 링크 추가 (처음 2개 제품으로 비교 페이지 이동)

### 반영 위치 4: 섹션 9 — 홈 페이지 수정

#### 파일: `routes/index.tsx`

변경 내용:

- CTA 영역에 `flex-wrap` 추가
- AI 상담 버튼 안내 문구 추가: "우측 하단의 AI 상담 버튼으로 맞춤 영양제 추천을
  받아보세요."

---

## 신규 파일 목록 (Phase 4)

| 파일                          | 역할                        | 타입          |
| ----------------------------- | --------------------------- | ------------- |
| `types/index.ts`              | 공유 타입 정의              | 타입          |
| `utils/agent.ts`              | Mastra Agent + 4 Tools      | 유틸리티      |
| `routes/api/chat.ts`          | AI 챗봇 API                 | API 라우트    |
| `routes/api/click.ts`         | 어필리에이트 클릭 로그 API  | API 라우트    |
| `routes/api/compare.ts`       | 제품 비교 데이터 API        | API 라우트    |
| `routes/compare.tsx`          | 제품 비교 페이지            | 페이지 라우트 |
| `islands/ChatBot.tsx`         | AI 챗봇 UI (플로팅)         | Island        |
| `islands/AffiliateButton.tsx` | 어필리에이트 버튼 + 추적    | Island        |
| `islands/ProductCompare.tsx`  | 제품 비교 인터랙티브 테이블 | Island        |

## 수정된 파일 목록

| 파일                         | 변경 내용                                 |
| ---------------------------- | ----------------------------------------- |
| `deno.json`                  | Mastra/AI SDK/Zod 의존성 버전 업데이트    |
| `routes/_app.tsx`            | ChatBot Island 추가, 비교 내비게이션 추가 |
| `routes/index.tsx`           | AI 상담 안내 문구, flex-wrap 추가         |
| `routes/products/[slug].tsx` | AffiliateButton 추가, affiliate_url 조회  |
| `routes/products/index.tsx`  | 비교 페이지 링크 추가                     |

---

## 변경 사항 요약

| # | 영역             | 변경 내용                                                                     | 영향 받는 원본 섹션 |
| - | ---------------- | ----------------------------------------------------------------------------- | ------------------- |
| 1 | AI 프레임워크    | Mastra/AI SDK 버전 수정 (v1.x), Agent/Tool API 변경 반영                      | 6, 10               |
| 2 | AI 챗봇          | Mastra Agent 4개 Tool 구현, /api/chat 엔드포인트 구현                         | 5, 10               |
| 3 | Islands          | ChatBot, AffiliateButton, ProductCompare 3개 Island 구현, /api/click 추적 API | 5, 8, 9, 10, 11     |
| 4 | 제품 비교        | /compare 페이지, /api/compare API, ProductCompare Island (최대 4개 제품 비교) | 9, 10, 11           |
| 5 | 기존 페이지 통합 | _app.tsx에 ChatBot 전역 배치, 내비게이션·홈·제품 페이지에 새 기능 링크 추가   | 9                   |

### v1.2 대비 주요 변경 요약

| 항목              | v1.2                          | v1.3                                              |
| ----------------- | ----------------------------- | ------------------------------------------------- |
| Mastra 버전       | `^0.4.8` / `^0.8.2`           | `^1.3.6` / `^1.9.0`                               |
| AI SDK 버전       | `@ai-sdk/anthropic@^1.3.9`    | `@ai-sdk/anthropic@^3.0.56`                       |
| Agent 정의        | `id` 없음, `anthropic()` 함수 | `id` 필수, 문자열 모델 지정                       |
| Tool execute      | `({ context }) => {}`         | `(input) => {}`                                   |
| AI 챗봇           | 설계만 (v1.0 섹션 5)          | 구현 완료 (Agent + API + Island)                  |
| 어필리에이트 추적 | 설계만 (v1.0 섹션 5)          | 구현 완료 (AffiliateButton + /api/click)          |
| 제품 비교         | 미설계                        | 신규 구현 (/compare + /api/compare + Island)      |
| Islands           | 0개                           | 3개 (ChatBot, AffiliateButton, ProductCompare)    |
| API 엔드포인트    | /api/chat 설계만              | /api/chat + /api/click + /api/compare 구현        |
| 공유 타입         | 없음                          | types/index.ts (Chat, Product, Compare, ClickLog) |
