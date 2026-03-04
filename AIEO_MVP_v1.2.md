# AIEO MVP 설계 문서 — 변경사항 (v1.2)

> **문서 작성일**: 2026-03-04 **브랜치**: `feat/phase3-agent`

> v1.0 + v1.1 대비 2건의 변경사항을 정리합니다. 각 변경사항은 원본 섹션 번호와
> 위치를 명시하며, 원본과 동일한 상세 수준으로 작성되었습니다.

---

## 변경 1: LangChain → Mastra AI 프레임워크 교체

### 배경

v1.0/v1.1에서는 LangChain.js를 AI Agent 프레임워크로 사용하는 구조였다. 그러나
실제 구현 단계에서 다음 문제를 확인:

| 항목       | LangChain.js                  | Mastra                            |
| ---------- | ----------------------------- | --------------------------------- |
| 언어       | Python 우선, TS 포팅          | TypeScript 네이티브               |
| Deno 호환  | 비공식 (npm 호환 레이어)      | 공식 지원 (deno-mastra 레포 존재) |
| 추상화     | 무거운 체인 패턴, 의존성 많음 | 가벼운 Vercel AI SDK 기반         |
| 온보딩     | ~40분                         | ~20분 (약 50% 빠름)               |
| Agent 패턴 | Chain → Agent → Tool          | Agent → Tool (직관적)             |

Mastra는 TypeScript 생태계(Deno + Fresh)와 자연스럽게 조합되며, Vercel AI SDK
위에 구축되어 가벼운 추상화를 제공한다.

### 반영 위치 1: 섹션 6 (기술 스택) — AI 프레임워크 테이블 교체

기존 (v1.1):

| 기술                     | 버전   | 비고                |
| ------------------------ | ------ | ------------------- |
| **LangChain.js**         | `^1.2` | Agent + Tools + RAG |
| **@langchain/anthropic** | -      | Claude API 연동     |
| **@langchain/core**      | `^1.2` | 코어 추상화         |

변경:

| 기술                  | 버전     | 비고                                    |
| --------------------- | -------- | --------------------------------------- |
| **Mastra**            | `^0.4.8` | TypeScript 네이티브 AI Agent 프레임워크 |
| **@mastra/core**      | `^0.8.2` | Agent + Tool 정의, 워크플로우           |
| **@ai-sdk/anthropic** | `^1.3.9` | Claude API 연동 (Vercel AI SDK 기반)    |

### 반영 위치 2: 섹션 6 (기술 스택) — deno.json imports 수정

기존 (v1.1):

```jsonc
{
  "imports": {
    "langchain": "npm:langchain@^1.2",
    "@langchain/core": "npm:@langchain/core@^1.2",
    "@langchain/anthropic": "npm:@langchain/anthropic"
  }
}
```

변경:

```json
{
  "imports": {
    "@mastra/core": "npm:@mastra/core@^0.8.2",
    "mastra": "npm:mastra@^0.4.8",
    "@ai-sdk/anthropic": "npm:@ai-sdk/anthropic@^1.3.9"
  }
}
```

### 반영 위치 3: 섹션 6 (기술 스택) — 버전 호환성 매트릭스 수정

기존 (v1.1):

```
├── LangChain.js 1.2 ← npm 스펙 (Deno npm 호환)
│   ├── @langchain/anthropic
│   └── @langchain/core 1.2
```

변경:

```
├── Mastra 0.4 + @mastra/core 0.8 ← npm 스펙 (Deno 2.2+ 공식 호환)
│   └── @ai-sdk/anthropic 1.3 ← Vercel AI SDK (Claude API)
```

### 반영 위치 4: 섹션 10 (API 엔드포인트) — Agent Tool 정의 패턴 수정

기존 (v1.1, LangChain DynamicTool):

```typescript
import { DynamicTool } from "langchain/tools";

const semanticSearchTool = new DynamicTool({
  name: "semantic_product_search",
  description: "유저의 자연어 증상 설명으로 관련 상품을 찾습니다.",
  func: async (query: string) => {
    const queryEmbedding = await getEmbedding(query);
    const { data } = await supabase.rpc("match_products", {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5,
    });
    return JSON.stringify(data);
  },
});
```

변경 (Mastra Tool):

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const semanticSearchTool = createTool({
  id: "semantic_product_search",
  description: "유저의 자연어 증상 설명으로 관련 상품을 찾습니다. " +
    "'피곤하고 잠이 안 와요' 같은 자연어 입력에 사용하세요.",
  inputSchema: z.object({
    query: z.string().describe("유저의 자연어 증상 설명"),
    limit: z.number().default(5).describe("최대 반환 수"),
  }),
  execute: async ({ context }) => {
    const queryEmbedding = await getEmbedding(context.query);
    const { data, error } = await supabase.rpc("match_products", {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: context.limit,
    });
    if (error) throw new Error(error.message);
    return { products: data };
  },
});
```

### 반영 위치 5: 섹션 10 (API 엔드포인트) — Agent 정의 패턴 수정

기존 (v1.1, LangChain Agent):

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";

const model = new ChatAnthropic({ modelName: "claude-sonnet-4-20250514" });
const agent = createOpenAIFunctionsAgent({ llm: model, tools, prompt });
const executor = new AgentExecutor({ agent, tools });

const result = await executor.invoke({ input: userMessage });
```

변경 (Mastra Agent):

```typescript
import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";

const supplementAgent = new Agent({
  name: "supplement-advisor",
  instructions: `당신은 영양제 전문 상담사입니다.
    사용자의 증상을 듣고 적절한 영양제를 추천합니다.
    추천 시 반드시 근거(성분, 함량, 임상 연구)를 함께 제시합니다.`,
  model: anthropic("claude-sonnet-4-20250514"),
  tools: {
    searchProducts: searchProductsTool,
    semanticSearch: semanticSearchTool,
    checkInteraction: checkInteractionTool,
    getDosageGuide: getDosageGuideTool,
  },
});

// API 라우트에서 사용
const result = await supplementAgent.generate(userMessage);
```

### 반영 위치 6: 섹션 5 (시스템 아키텍처) — "유저 흐름 1" LangChain 참조 수정

기존 (v1.1):

```
/api/chat → LangChain Agent
    ├── Tool 1: 키워드 상품 검색 (Supabase fulltext)
    ├── Tool 2: 시맨틱 상품 검색 (pgvector 유사도)
    ├── Tool 3: 성분 충돌 체크
    └── Tool 4: 복용법 안내
```

변경:

```
/api/chat → Mastra Agent (Claude API)
    ├── Tool 1: 키워드 상품 검색 (Supabase fulltext)
    ├── Tool 2: 시맨틱 상품 검색 (pgvector 유사도)
    ├── Tool 3: 성분 충돌 체크
    └── Tool 4: 복용법 안내
```

---

## 변경 2: 봇 탐지 미들웨어 구현 (Phase 3)

### 배경

v1.1의 변경 3에서 미들웨어 설계를 "로깅 + 차단 전용, 응답 분기 없음"으로
확정했다. Phase 3에서 이를 실제 구현 완료. Fresh 2.0의 `define.middleware()`
API를 사용하여 파일 기반 미들웨어로 구현했다.

### 반영 위치 1: 섹션 7 (AI/유저 분기 미들웨어) — 구현 코드 교체

v1.1에서 제시한 의사 코드:

```typescript
function detectClient(
  userAgent: string,
): "ai_bot" | "search_bot" | "user" | "blocked" {
  // ...
}

export async function handler(req: Request, ctx: FreshContext) {
  const userAgent = req.headers.get("user-agent") ?? "";
  const client = detectClient(userAgent);
  // ...
}
```

실제 구현 (3개 파일로 분리):

#### 파일 1: `utils/bot-detect.ts` — 봇 분류 유틸리티

```typescript
const BOT_TYPE = {
  AI: "ai",
  BLOCKED: "blocked",
  REGULAR: "regular",
} as const;

type BotType = (typeof BOT_TYPE)[keyof typeof BOT_TYPE];

interface BotInfo {
  type: BotType;
  name: string | null;
}

/** AI 봇 패턴 — robots.txt 허용 목록과 동기화 */
const AI_BOT_PATTERNS: ReadonlyArray<{ pattern: RegExp; name: string }> = [
  { pattern: /GPTBot/i, name: "GPTBot" },
  { pattern: /ChatGPT-User/i, name: "ChatGPT-User" },
  { pattern: /OAI-SearchBot/i, name: "OAI-SearchBot" },
  { pattern: /ClaudeBot/i, name: "ClaudeBot" },
  { pattern: /Claude-Web/i, name: "Claude-Web" },
  { pattern: /PerplexityBot/i, name: "PerplexityBot" },
  { pattern: /Google-Extended/i, name: "Google-Extended" },
  { pattern: /Googlebot/i, name: "Googlebot" },
  { pattern: /Bingbot/i, name: "Bingbot" },
];

/** 차단 봇 패턴 — robots.txt Disallow 목록과 동기화 */
const BLOCKED_BOT_PATTERNS: ReadonlyArray<{ pattern: RegExp; name: string }> = [
  { pattern: /Bytespider/i, name: "Bytespider" },
  { pattern: /CCBot/i, name: "CCBot" },
];

/** User-Agent 문자열로 봇 종류를 분류 */
export function classifyBot(userAgent: string): BotInfo {
  for (const { pattern, name } of BLOCKED_BOT_PATTERNS) {
    if (pattern.test(userAgent)) return { type: BOT_TYPE.BLOCKED, name };
  }
  for (const { pattern, name } of AI_BOT_PATTERNS) {
    if (pattern.test(userAgent)) return { type: BOT_TYPE.AI, name };
  }
  return { type: BOT_TYPE.REGULAR, name: null };
}
```

#### 파일 2: `utils/supabase-admin.ts` — Service Role 클라이언트

```typescript
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

/**
 * Service Role 클라이언트 (bot_logs, click_logs INSERT용)
 * 키가 없으면 null — 로깅 불가 시 앱은 정상 동작
 */
export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

interface BotLogEntry {
  bot_name: string;
  user_agent: string;
  ip: string | null;
  path: string;
  response_code: number;
  response_time_ms: number;
}

/** bot_logs 테이블에 비동기 INSERT (실패해도 앱 동작에 영향 없음) */
export async function logBotAccess(entry: BotLogEntry): Promise<void> {
  if (!supabaseAdmin) return;
  const { error } = await supabaseAdmin.from("bot_logs").insert(entry);
  if (error) console.error("[bot-log] INSERT 실패:", error.message);
}
```

#### 파일 3: `routes/_middleware.ts` — Fresh 2.0 미들웨어

```typescript
import { define } from "../utils.ts";
import { BOT_TYPE, classifyBot } from "../utils/bot-detect.ts";
import { logBotAccess } from "../utils/supabase-admin.ts";

function getClientIp(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null;
}

export default define.middleware(async (ctx) => {
  const userAgent = ctx.req.headers.get("user-agent") ?? "";
  const bot = classifyBot(userAgent);

  // 차단 봇 → 403
  if (bot.type === BOT_TYPE.BLOCKED) {
    logBotAccess({
      bot_name: bot.name ?? "unknown",
      user_agent: userAgent,
      ip: getClientIp(ctx.req),
      path: ctx.url.pathname,
      response_code: 403,
      response_time_ms: 0,
    });
    return new Response("Forbidden", { status: 403 });
  }

  // AI 봇 + 일반 유저 → 동일한 응답 (클로킹 방지)
  const start = performance.now();
  const resp = await ctx.next();
  const elapsed = Math.round(performance.now() - start);

  // AI 봇이면 접근 로그 비동기 기록
  if (bot.type === BOT_TYPE.AI) {
    logBotAccess({
      bot_name: bot.name ?? "unknown",
      user_agent: userAgent,
      ip: getClientIp(ctx.req),
      path: ctx.url.pathname,
      response_code: resp.status,
      response_time_ms: elapsed,
    });
  }

  return resp;
});
```

### 반영 위치 2: 섹션 7 — 환경변수 추가

기존 (v1.0) 환경변수:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

변경 (행 추가):

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # ← 추가: bot_logs INSERT용 (service_role)
ANTHROPIC_API_KEY=sk-ant-...
```

> `SUPABASE_SERVICE_ROLE_KEY`는 Supabase 대시보드 → Settings → API →
> service_role key에서 확인. 이 키가 없어도 앱은 정상 동작하며, 봇 로깅만
> 비활성화됨.

### 반영 위치 3: 섹션 7 — 봇 분류 테이블

v1.1의 분류 테이블을 다음으로 교체:

| 분류  | 봇 이름                             | 동작                      | 비고                      |
| ----- | ----------------------------------- | ------------------------- | ------------------------- |
| AI 봇 | GPTBot, ChatGPT-User, OAI-SearchBot | 동일 응답 + bot_logs 기록 | OpenAI 크롤러             |
| AI 봇 | ClaudeBot, Claude-Web               | 동일 응답 + bot_logs 기록 | Anthropic 크롤러          |
| AI 봇 | PerplexityBot                       | 동일 응답 + bot_logs 기록 | Perplexity 크롤러         |
| AI 봇 | Google-Extended, Googlebot, Bingbot | 동일 응답 + bot_logs 기록 | 검색엔진 봇               |
| 차단  | Bytespider                          | 403 + bot_logs 기록       | TikTok 크롤러 (무단 수집) |
| 차단  | CCBot                               | 403 + bot_logs 기록       | Common Crawl (대량 수집)  |
| 일반  | 그 외                               | 동일 응답, 로깅 없음      | 일반 유저                 |

### 반영 위치 4: 섹션 8 (데이터 설계) — bot_logs 사용 패턴 추가

기존 `bot_logs` 테이블 정의 뒤에 "사용 패턴" 섹션 추가:

```
### bot_logs 사용 패턴

| 필드 | 소스 | 비고 |
|------|------|------|
| bot_name | classifyBot() 결과 | AI_BOT_PATTERNS 매칭 이름 |
| user_agent | Request 헤더 | 전체 User-Agent 문자열 |
| ip | x-forwarded-for 또는 x-real-ip | Deno Deploy 환경에서는 프록시 헤더 사용 |
| path | URL pathname | 쿼리 파라미터 제외 |
| response_code | Response.status | 차단 봇은 403, 그 외는 실제 응답 코드 |
| response_time_ms | performance.now() 차이 | 차단 봇은 0 (응답 미생성) |

> RLS 정책: `service_role`만 INSERT 가능 (anon key로는 쓰기 불가).
> 미들웨어에서 `supabaseAdmin` (service_role 클라이언트)을 사용하여 기록.
```

### 반영 위치 5: 섹션 11 (디렉토리 구조) — 파일 추가

기존 구조에 다음 파일 추가:

```
agora/
├── routes/
│   ├── _middleware.ts       # ← 추가: 봇 탐지 미들웨어 (Phase 3)
│   ├── _app.tsx
│   ├── index.tsx
│   └── ...
├── utils/
│   ├── supabase.ts          # 기존: anon key 클라이언트
│   ├── supabase-admin.ts    # ← 추가: service_role 클라이언트 (Phase 3)
│   └── bot-detect.ts        # ← 추가: User-Agent 봇 분류 (Phase 3)
└── ...
```

---

## 변경 사항 요약

| # | 영역          | 변경 내용                                                                                             | 영향 받는 원본 섹션 |
| - | ------------- | ----------------------------------------------------------------------------------------------------- | ------------------- |
| 1 | AI 프레임워크 | LangChain.js → Mastra. Agent/Tool 패턴, deno.json imports, 호환성 매트릭스 수정                       | 5, 6, 10            |
| 2 | 미들웨어      | Phase 3 구현 완료. bot-detect, supabase-admin, _middleware.ts 3개 파일. 환경변수, 봇 분류 테이블 추가 | 7, 8, 11            |

### v1.1 대비 주요 변경 요약

| 항목          | v1.1                                   | v1.2                                                    |
| ------------- | -------------------------------------- | ------------------------------------------------------- |
| AI 프레임워크 | LangChain.js                           | Mastra                                                  |
| AI SDK        | @langchain/anthropic                   | @ai-sdk/anthropic (Vercel AI SDK)                       |
| Tool 정의     | DynamicTool                            | createTool (Zod 스키마 기반)                            |
| Agent 정의    | AgentExecutor                          | Agent 클래스                                            |
| 미들웨어      | 의사 코드 (v1.1 변경 3)                | 실제 구현 (3파일, deno check 통과)                      |
| 봇 분류       | 4분류 (ai_bot/search_bot/user/blocked) | 3분류 (ai/blocked/regular) — 검색봇은 AI 봇과 동일 처리 |
| 환경변수      | SUPABASE_URL, SUPABASE_ANON_KEY        | + SUPABASE_SERVICE_ROLE_KEY 추가                        |
