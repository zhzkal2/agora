# AIEO MVP 프로젝트 진행 현황 (まとめ)

> 최종 업데이트: 2026-03-04

---

## 프로젝트 개요

AI에 최적화된 영양제 비교 사이트 + AI 챗봇 상담 (AIEO: AI Engine Optimization)

```
[커머스 플랫폼] → [우리 데이터 레이어] → [AI] → [유저] → [구매] → [수수료]
```

---

## Phase 진행 상태

| Phase | 내용                           | 상태      | 브랜치                 |
| ----- | ------------------------------ | --------- | ---------------------- |
| 0     | Feasibility (리서치 + 설계)    | ✅ 완료   | `feature/settings`     |
| 1     | Infra + DB + API               | ✅ 완료   | `feature/mvp-phase1-2` |
| 2     | SSR + JSON-LD + 정적 파일      | ✅ 완료   | `feature/mvp-phase1-2` |
| —     | CodeRabbit 코드 리뷰 (5라운드) | ✅ 완료   | `feature/mvp-phase1-2` |
| —     | LangChain → Mastra 의존성 교체 | ✅ 완료   | `feat/phase3-agent`    |
| 3     | 미들웨어 + 봇 로깅             | ✅ 완료   | `feat/phase3-agent`    |
| 4     | 유저 웹앱 (챗봇 + Agent)       | ✅ 완료   | `feat/phase4-agent`    |
| 5     | 배포 + AIEO 실험               | 🔲 미착수 |                        |
| 6     | 확장 (GPT Store, MCP 등)       | 🔲 미착수 |                        |

### PR 현황

| PR | 브랜치                          | 상태                        |
| -- | ------------------------------- | --------------------------- |
| #1 | `feature/mvp-phase1-2` → `main` | 오픈 (리뷰 완료, 머지 대기) |

---

## Phase 0: Feasibility (완료)

- 주요 EC 사이트 AI 크롤러 차단 현황 리서치
- AIEO 실험 설계 (가짜 브랜드 4개 × JSON-LD/도메인 2x2 실험)
- 기술 스택 확정: Deno + Fresh 2.0 + Supabase + Tailwind CSS 4.x
- 설계 문서 작성: `AIEO_MVP_v1.0.md`, `AIEO_MVP_v1.1.md`

---

## Phase 1: Infra + DB + API (완료)

### DB (Supabase + pgvector)

- 8개 테이블: brands, products, ingredients, product_ingredients, symptoms,
  ingredient_symptoms, bot_logs, click_logs
- pgvector 확장 (products, ingredients에 `embedding vector(1536)` 컬럼)
- RLS: SELECT 공개, INSERT는 service_role 전용 (bot_logs, click_logs)
- FK CASCADE 설정

### 시드 데이터

- 가짜 브랜드 4개: VitaCore Labs, NutriZen, BioPlus Health, MediPure Labs
- 제품, 성분, 증상, 매핑 데이터 시딩

### API 라우트

- `GET /api/products` — 전체 상품 목록
- `GET /api/products/[slug]` — 상품 상세 (성분, 브랜드 포함)

### 스크립트

- `scripts/schema.sql` — 전체 DB 스키마 (단일 소스)
- `scripts/create-schema.ts` — 스키마 생성 (try/catch + 30s 타임아웃)
- `scripts/seed-data.ts` — 데이터 시딩 (`--allow-seed` 안전장치)
- `scripts/check-tables.ts` — 테이블 확인
- `scripts/test-query.ts` — 쿼리 테스트

---

## Phase 2: SSR + JSON-LD (완료)

### SSR 페이지

- `/products` — 제품 목록 (ItemList JSON-LD, OG 태그)
- `/products/[slug]` — 제품 상세 (Product JSON-LD, 성분 테이블)
- `/symptoms` — 증상 목록 (ItemList JSON-LD, OG 태그)
- `/symptoms/[slug]` — 증상 상세 (MedicalWebPage JSON-LD, 추천 제품)
- `/` — 메인 페이지 (top 3 제품)

### AIEO 최적화

- JSON-LD: Product, ItemList, MedicalWebPage, MedicalCondition,
  DietarySupplement
- XSS 방지: `safeJsonLd()` (`<` → `\u003c`)
- sitemap.xml (동적 생성, 에러 시 500 반환)
- robots.txt (AI 봇 허용: GPTBot, ClaudeBot, PerplexityBot 등)
- OG 메타 태그 (목록 페이지)

### 에러 핸들링

- 모든 Supabase 호출 try-catch 래핑
- DB 실패 시 HTTP 500 + 에러 UI
- 없는 페이지 HTTP 404 (302 리다이렉트 아님)
- API 에러 메시지 내부만 로깅, 유저에게는 제네릭 메시지

---

## 코드 리뷰 (5라운드 완료)

CodeRabbit CLI + GitHub PR 리뷰를 통해 총 5라운드 수정:

| 라운드  | 커밋      | 주요 수정                                               |
| ------- | --------- | ------------------------------------------------------- |
| 1 (CLI) | `2ffad55` | RLS 보안, env 검증, XSS 방지, 404 응답, 스캐폴드 제거   |
| 2 (CLI) | `5862d64` | test-query env 검증, State 정리, robots.txt 동적 라우트 |
| 3 (PR)  | `6c0c9ae` | sitemap XML 이스케이프, 에러 UI, exit code, 문서 수정   |
| 4 (PR)  | `02e42ee` | JSON-LD ItemList, OG 태그, brands null safety, HTTP 500 |
| 5 (PR)  | `3db84a7` | try-catch 래핑, 타임아웃 상수 추출, 유저 경로 마스킹    |

---

## Phase 3: 미들웨어 + 봇 로깅 (완료)

### 구현 내용

| 파일                      | 역할                                                                  |
| ------------------------- | --------------------------------------------------------------------- |
| `utils/bot-detect.ts`     | User-Agent 패턴 매칭으로 AI/차단/일반 봇 분류                         |
| `utils/supabase-admin.ts` | `SUPABASE_SERVICE_ROLE_KEY` 기반 관리자 클라이언트 + `logBotAccess()` |
| `routes/_middleware.ts`   | Fresh 미들웨어: 차단→403, AI봇→비동기 로깅, 응답 분기 없음            |

### 봇 분류

| 분류    | 봇                                                                                                             | 동작                          |
| ------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| AI 봇   | GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-Web, PerplexityBot, Google-Extended, Googlebot, Bingbot | 동일 응답 + bot_logs 기록     |
| 차단 봇 | Bytespider, CCBot                                                                                              | 403 Forbidden + bot_logs 기록 |
| 일반    | 그 외                                                                                                          | 동일 응답, 로깅 없음          |

### 설계 원칙

- 클로킹 방지: AI 봇과 일반 유저에게 동일한 HTML 응답
- 비동기 로깅: `logBotAccess()`는 fire-and-forget, 응답 지연 없음
- Graceful fallback: `SUPABASE_SERVICE_ROLE_KEY` 없어도 앱 정상 동작
- 응답 시간 측정: `performance.now()`로 처리 시간 기록

---

## Phase 4: 유저 웹앱 + AI Agent (완료)

### AI Agent (Mastra)

| 파일             | 역할                                                           |
| ---------------- | -------------------------------------------------------------- |
| `utils/agent.ts` | Mastra Agent + 4개 Tool (Claude claude-sonnet-4-20250514 모델) |

Agent Tools:

| Tool               | ID                           | 데이터 소스                  |
| ------------------ | ---------------------------- | ---------------------------- |
| 키워드 검색        | search_products              | Supabase ilike 검색          |
| 증상 기반 검색     | search_by_symptom            | symptoms 조인 체인           |
| 성분 상호작용 체크 | check_ingredient_interaction | 정적 데이터 (8개 상호작용쌍) |
| 복용법 안내        | get_dosage_guide             | 정적 데이터 (6개 성분) + DB  |

### API 엔드포인트

| 엔드포인트     | 메서드 | 역할                        |
| -------------- | ------ | --------------------------- |
| `/api/chat`    | POST   | AI 챗봇 (Agent.generate)    |
| `/api/click`   | POST   | 어필리에이트 클릭 로깅      |
| `/api/compare` | GET    | 제품 비교 데이터 (최대 4개) |

### Islands (클라이언트 hydration)

| Island                | 역할                                     |
| --------------------- | ---------------------------------------- |
| `ChatBot.tsx`         | AI 상담 챗봇 (플로팅 버튼 + 채팅 패널)   |
| `AffiliateButton.tsx` | 어필리에이트 버튼 + 클릭 추적            |
| `ProductCompare.tsx`  | 제품 비교 테이블 (토글 선택, URL 동기화) |

### 페이지 변경

- `_app.tsx`: ChatBot 전역 배치, "비교" 내비게이션 추가
- `index.tsx`: AI 상담 안내 문구 추가
- `products/[slug].tsx`: AffiliateButton 추가
- `products/index.tsx`: 비교 페이지 링크 추가
- `compare.tsx`: 신규 비교 페이지

### Mastra 버전 (실제 설치)

| 패키지              | 버전      |
| ------------------- | --------- |
| `@mastra/core`      | `^1.9.0`  |
| `mastra`            | `^1.3.6`  |
| `@ai-sdk/anthropic` | `^3.0.56` |
| `zod`               | `^4.3.6`  |

---

## 핵심 기술 결정

### 확정된 스택

| 레이어     | 기술                              | 비고                            |
| ---------- | --------------------------------- | ------------------------------- |
| 런타임     | Deno 2.7+                         | TypeScript 내장, npm: specifier |
| 프론트엔드 | Fresh 2.0 (Islands + Preact)      | SSR 기본, 선택적 hydration      |
| 스타일링   | Tailwind CSS 4.x                  | CSS-first (`@theme`)            |
| DB         | Supabase (PostgreSQL + pgvector)  | 무료 티어                       |
| AI Agent   | **Mastra** (← LangChain에서 교체) | TypeScript 네이티브, Deno 호환  |
| AI SDK     | @ai-sdk/anthropic                 | Claude API 연동                 |
| 검증       | Zod                               | 입력값 스키마 검증              |

### LangChain → Mastra 교체 이유

- TypeScript 네이티브 (Deno + Fresh와 자연스러운 조합)
- Vercel AI SDK 기반 (가벼운 추상화)
- Deno 2.2+ 호환 확인됨 (deno-mastra 레포 존재)
- LangChain 대비 ~50% 빠른 온보딩

### v1.0 → v1.1 주요 변경 (4건)

1. **pgvector 추가** — products, ingredients에 임베딩 컬럼 + 시맨틱 검색
2. **Fresh 단일 서버** — Hono 별도 분리 불필요 (Fresh 2.0이 API 내장)
3. **클로킹 방지** — User-Agent 분기 제거, Islands로 자연스럽게 AI/유저 분리
4. **llms.txt API 제거** — 페이지 URL만 노출, API는 사이트 내 챗봇 전용

---

## 남은 작업

### Phase 3: 미들웨어 + 봇 로깅 (완료)

- [x] User-Agent 판별 미들웨어 (로깅 + 차단 전용, 응답 분기 없음)
- [x] AI 봇 접근 로깅 (bot_logs 테이블)
- [x] 차단 봇 403 응답 (Bytespider, CCBot)

### Phase 4: 유저 웹앱 + AI Agent (완료)

- [x] Mastra Agent 설정 (Claude API 연동, v1.9.0)
- [x] Agent Tools: 키워드 검색, 증상 검색, 성분 상호작용, 복용법 안내
- [x] 챗봇 Island (플로팅 UI + /api/chat)
- [x] 어필리에이트 링크 + 클릭 추적 (/api/click)
- [x] 상품 비교 인터페이스 (/compare + /api/compare)

### Phase 5: 배포 + 실험

- [ ] Deno Deploy 배포
- [ ] AI 플랫폼 테스트 (ChatGPT, Perplexity, Claude)
- [ ] 서버 로그 모니터링

### Phase 6: 확장

- [ ] GPT Store 등록
- [ ] UCP/MCP 서버
- [ ] 아이허브 실제 데이터 연동
- [ ] 어필리에이트 등록 (배포 후)

---

## 파일 구조

```text
agora/
├── assets/styles.css        # Tailwind CSS 4.x 설정
├── components/              # 서버 전용 컴포넌트 (비어있음)
├── islands/
│   ├── ChatBot.tsx          # AI 챗봇 (플로팅 버튼 + 채팅 패널)
│   ├── AffiliateButton.tsx  # 어필리에이트 버튼 + 클릭 추적
│   └── ProductCompare.tsx   # 제품 비교 인터랙티브 테이블
├── types/
│   └── index.ts             # 공유 타입 정의 (Chat, Product, Compare)
├── routes/
│   ├── _app.tsx             # 레이아웃 (내비게이션, 푸터, ChatBot)
│   ├── _middleware.ts       # 봇 탐지 미들웨어 (로깅 + 차단)
│   ├── index.tsx            # 메인 페이지
│   ├── compare.tsx          # 제품 비교 페이지
│   ├── products/
│   │   ├── index.tsx        # 제품 목록 (JSON-LD, OG)
│   │   └── [slug].tsx       # 제품 상세 (JSON-LD, AffiliateButton)
│   ├── symptoms/
│   │   ├── index.tsx        # 증상 목록 (JSON-LD, OG)
│   │   └── [slug].tsx       # 증상 상세 (JSON-LD, 추천 제품)
│   ├── api/
│   │   ├── chat.ts          # POST /api/chat (AI Agent)
│   │   ├── click.ts         # POST /api/click (어필리에이트 추적)
│   │   ├── compare.ts       # GET /api/compare (제품 비교)
│   │   ├── products.ts      # GET /api/products
│   │   └── products/[slug].ts
│   ├── robots.txt.ts        # 동적 robots.txt
│   └── sitemap.xml.ts       # 동적 sitemap
├── scripts/                 # DB 유틸리티
├── setup/                   # 페이즈 완료 로그
├── utils/
│   ├── supabase.ts          # Supabase 클라이언트 (anon key)
│   ├── supabase-admin.ts    # Supabase 서비스 클라이언트 (service_role)
│   ├── bot-detect.ts        # User-Agent 봇 탐지 유틸리티
│   └── agent.ts             # Mastra AI Agent + 4 Tools
├── utils.ts                 # State 타입 + define 헬퍼
├── main.ts                  # Fresh 앱 진입점
├── deno.json                # 의존성 + 태스크
├── AIEO_MVP_v1.0.md         # 원본 설계 문서
├── AIEO_MVP_v1.1.md         # 변경사항 문서 (4건)
├── AIEO_MVP_v1.2.md         # 변경사항 문서 (Mastra 교체, 미들웨어)
├── AIEO_MVP_v1.3.md         # 변경사항 문서 (Phase 4 구현)
└── PROJECT_STATUS.md         # ← 이 파일
```

---

## 참고 문서

- [AIEO_MVP_v1.0.md](./AIEO_MVP_v1.0.md) — 원본 설계 문서 (비전, 리서치, 스키마,
  API, 실험 설계)
- [AIEO_MVP_v1.1.md](./AIEO_MVP_v1.1.md) — 변경사항 4건 (pgvector, Fresh 단일,
  클로킹 방지, llms.txt)
- [AIEO_MVP_v1.2.md](./AIEO_MVP_v1.2.md) — 변경사항 2건 (LangChain→Mastra, 봇
  미들웨어 구현)
- [AIEO_MVP_v1.3.md](./AIEO_MVP_v1.3.md) — 변경사항 5건 (Phase 4: Agent, 챗봇,
  어필리에이트, 비교, 통합)
- [setup/](./setup/) — 페이즈별 작업 로그
