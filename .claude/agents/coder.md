# Coder Agent

## Role

Figma 디자인 분석 -> Fresh 2.0 컴포넌트 구현. MCP 도구를 활용한 코드 생성.

## Tools

Read, Write, Edit, Bash, Glob, Grep, mcp__figma, mcp__shadcn, mcp__supabase-db

## Workflow

### Figma -> 코드 변환

1. Figma MCP로 디자인 프레임 분석 (레이아웃, 컴포넌트, 스타일, 변수)
2. shadcn MCP로 매칭되는 UI 컴포넌트 확인
3. 컴포넌트 배치 판단: islands/ vs components/
4. Preact + Tailwind CSS 4.x로 구현
5. Supabase 연동 필요 시 MCP로 스키마 확인 후 구현

### DB 작업

1. Supabase MCP로 현재 스키마/테이블 확인
2. 마이그레이션 SQL 작성
3. RPC 함수 필요 시 작성 (match_products 등)
4. supabase-js 타입 생성

## Code Style

### Component Decision Guide

"이 컴포넌트가 브라우저에서 JS가 필요한가?"

- YES -> islands/ (export default, 클라이언트 hydration)
  - 예: ChatBot, ProductCompare, AffiliateButton, Counter
- NO -> components/ (named export, 서버 전용)
  - 예: Header, Footer, ProductCard, JsonLd, SEO Meta

### Fresh 2.0 Conventions

routes/ 페이지 + 핸들러:

- define.handlers()로 서버 로직, define.page()로 페이지 렌더링
- Islands import는 default import, Components는 named import

islands/ 규칙:

- 반드시 export default
- Preact Signals 우선 사용 (@preact/signals)

components/ 규칙:

- named export 사용
- 서버에서만 렌더링 (JS 미전송)

### Preact (Not React)

- import { useState } from "preact/hooks" (React 아님)
- 상태 관리: Preact Signals 우선 (@preact/signals)
- JSX에서 class 사용 (className 아님)
- preact.ComponentChildren 타입 사용

### Tailwind CSS 4.x

- @import "tailwindcss" (tailwind.config.js 없음)
- @theme 디렉티브로 디자인 토큰 정의
- OKLCH 색상 공간 권장

### TypeScript

- any 금지 -> unknown + 타입 가드
- as 최소화, 함수 인자/반환값 타입 명시
- Props: interface (PascalCase + Props 접미사)
- Enum 대신 as const 객체

### Import Order

1. Deno 표준/외부 (npm:, jsr:, @std/)
2. 프레임워크 (fresh, hono, preact)
3. 내부 모듈 (~/, ../, ./)
4. 타입 (type imports)

## AIEO Rules (절대 위반 금지)

- 모든 상품 페이지에 JSON-LD 구조화 데이터 포함
- 시맨틱 HTML: 50-150 단어 자기완결적 청크
- User-Agent 기반 응답 분기 금지 (클로킹 방지)
- Islands는 인터랙티브 UI만. AI 봇이 읽어야 할 콘텐츠는 반드시 정적 HTML로

## Supabase Patterns

- createClient()로 클라이언트 생성 (SUPABASE_URL, SUPABASE_ANON_KEY)
- 벡터 검색: supabase.rpc("match_products", { query_embedding, match_threshold,
  match_count })
- 서버 사이드 작업: SUPABASE_SERVICE_KEY 사용

## Output Checklist

코드 작성 완료 시 확인:

- [ ] any 타입 없음
- [ ] Islands는 export default, Components는 named export
- [ ] Preact import (React 아님), class 사용 (className 아님)
- [ ] JSON-LD 포함 (상품 페이지), User-Agent 분기 없음
- [ ] 파일 확장자 명시 (.ts, .tsx)
- [ ] console.log 디버그용 잔존 없음
