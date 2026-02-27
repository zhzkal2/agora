# CLAUDE.md

- **Language**: Think in English, respond in Korean

---

## Tech Stack

- **Runtime**: Deno
- **Frontend**: Fresh (Islands Architecture, Preact + Signals)
- **Backend**: Hono
- **Styling**: Tailwind CSS 4.x (CSS-first configuration)
- **Package**: deno.json (not package.json)
- **Import**: `npm:` specifier, `jsr:` specifier, 또는 `deno add`

---

## Deno Rules

- `node_modules` 사용하지 않음. Deno 네이티브 import 사용.
- `deno.json`으로 의존성, 태스크, 컴파일러 옵션 관리
- `require()` 금지. ESM import만 사용.
- Deno 표준 라이브러리 우선 사용 (`@std/*`)
- 파일 확장자 항상 명시 (`.ts`, `.tsx`)
- `deno fmt`로 포맷팅, `deno lint`로 린트
- `deno test`로 테스트 실행
- 퍼미션 플래그 최소 권한 원칙: `--allow-read`, `--allow-net` 등 필요한 것만

---

## Fresh (Frontend) Rules

### Architecture
- Islands Architecture: 기본적으로 JS를 클라이언트에 전송하지 않음
- 인터랙티브가 필요한 컴포넌트만 `islands/`에 배치하여 선택적 hydration
- `components/`의 컴포넌트는 서버에서만 렌더링 (JS 미전송)

### Structure
```
routes/          # 파일 기반 라우팅 + 핸들러
islands/         # 클라이언트 hydration이 필요한 인터랙티브 컴포넌트
components/      # 서버 전용 정적 컴포넌트
static/          # 정적 파일 (이미지, 폰트 등)
utils/           # 유틸리티 함수
types/           # 공유 타입 정의
```

### Conventions
- Preact 사용. React가 아님. (`import { useState } from "preact/hooks"`)
- 상태 관리는 Preact Signals 우선 사용 (`@preact/signals`)
- `useState`/`useEffect` 등 hooks도 사용 가능하나 Signals가 더 효율적
- 라우트 파일: `routes/about.tsx` → `/about`
- 라우트 핸들러: `handler` export로 서버 로직 처리
- Islands는 `export default`로 내보내야 함 (Fresh 규칙)
- 나머지 컴포넌트는 named export 사용

### Component Patterns
```tsx
// components/ (서버 전용, JS 미전송)
interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return <header><h1>{title}</h1></header>;
}
```

```tsx
// islands/ (클라이언트 hydration)
import { useSignal } from "@preact/signals";

export default function Counter({ start }: { start: number }) {
  const count = useSignal(start);
  return (
    <div>
      <button onClick={() => count.value--}>-</button>
      <span>{count}</span>
      <button onClick={() => count.value++}>+</button>
    </div>
  );
}
```

```tsx
// routes/ (핸들러 + 페이지)
import { define } from "fresh";
import Counter from "../islands/Counter.tsx";
import { Header } from "../components/Header.tsx";

export const handler = define.handlers({
  GET(ctx) {
    return ctx.render();
  },
});

export default define.page(function Home() {
  return (
    <div>
      <Header title="Home" />
      <Counter start={0} />
    </div>
  );
});
```

### Fresh Decision Guide
- 정적 콘텐츠 → `components/` (JS 전송 없음)
- 클릭, 입력, 토글 등 인터랙션 필요 → `islands/`
- 데이터 fetch, 리다이렉트, 인증 → `routes/` handler
- 판단 기준: "이 컴포넌트가 브라우저에서 JS가 필요한가?"

---

## Hono (Backend) Rules

### Basics
```ts
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("Hello Hono!"));

Deno.serve(app.fetch);
```

### Conventions
- 라우트 그룹화: `app.route("/api/users", userRoutes)`
- Context `c` 하나로 request/response 처리 (Express의 req/res 분리 아님)
- 입력값 검증: `zValidator` + Zod 조합 사용
- 미들웨어: Hono 빌트인 우선 (cors, logger, bearerAuth 등)
- 에러 핸들링: `app.onError()` 글로벌 핸들러 설정
- RPC: `hc<AppType>` 클라이언트로 타입 안전한 API 호출

### Structure
```
api/
├── routes/        # 라우트 모듈
│   ├── users.ts
│   ├── auth.ts
│   └── posts.ts
├── middleware/     # 커스텀 미들웨어
├── validators/    # Zod 스키마
├── services/      # 비즈니스 로직
├── types/         # API 타입 정의
└── app.ts         # Hono 앱 진입점
```

### Validation Pattern
```ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const app = new Hono();

app.post(
  "/users",
  zValidator("json", createUserSchema),
  (c) => {
    const data = c.req.valid("json");
    return c.json({ user: data }, 201);
  }
);
```

### RPC Pattern (Frontend ↔ Backend 타입 공유)
```ts
// api/app.ts
const route = app.get("/hello", (c) => c.json({ message: "Hello" }));
export type AppType = typeof route;

// frontend에서
import { hc } from "hono/client";
import type { AppType } from "../api/app.ts";
const client = hc<AppType>("/api");
const res = await client.hello.$get();
```

---

## Tailwind CSS 4.x Rules

### Setup
- `tailwind.config.js` 사용하지 않음. CSS-first configuration.
- CSS 파일에 `@import "tailwindcss"` 한 줄로 시작
- 컨텐츠 경로 자동 감지 (수동 `content` 배열 불필요)
- PostCSS, autoprefixer 불필요 (Lightning CSS 내장)

### Configuration
```css
/* styles.css */
@import "tailwindcss";

@theme {
  --font-display: "Satoshi", sans-serif;
  --font-body: "Inter", sans-serif;
  --color-brand-primary: oklch(0.7 0.15 250);
  --color-brand-secondary: oklch(0.8 0.12 160);
  --breakpoint-3xl: 1920px;
}
```

### Conventions
- `@theme` 디렉티브로 디자인 토큰 정의 (JS 설정 아님)
- OKLCH 색상 공간 사용 권장
- 컨테이너 쿼리 네이티브 지원: `@container`, `@sm`, `@lg`
- `class` 어트리뷰트 사용 (Preact/Fresh는 `className` 아닌 `class`)
- 컴포넌트 추출로 클래스 중복 방지
- 반응형: `sm:`, `md:`, `lg:`, `xl:`, `2xl:` 프리픽스

---

## TypeScript Rules

### Strict
- `any` 금지. `unknown` 사용 후 타입 가드로 좁히기
- `as` 타입 단언 최소화. type guard 함수 사용 권장
- 함수 인자와 반환값에 타입 명시
- `null`과 `undefined` 명확히 구분

### Type Patterns
```tsx
// Props 인터페이스
interface ButtonProps {
  variant: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  children: preact.ComponentChildren;
  onClick: () => void;
}

// 유니온 타입으로 상태 모델링
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

// 타입 가드
function isApiError(error: unknown): error is { message: string; code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "code" in error
  );
}
```

### Naming
- 타입/인터페이스: PascalCase (`UserProfile`, `ApiResponse`)
- `I` 접두사 금지 (`IUser` ❌ → `User` ✅)
- Props 타입: `컴포넌트명 + Props` (`ButtonProps`)
- Enum 대신 `as const` 객체 사용 권장

### Type vs Interface
- 객체 형태: `interface`
- 유니온, 인터섹션, 유틸리티: `type`
- Props: `interface`

---

## Code Quality

### General
- `console.log` 디버그용 잔존 금지 (커밋 전 제거)
- 매직넘버 금지. 상수로 추출
- 함수는 한 가지 역할만
- 중첩 3단계 이상이면 early return 패턴 사용
- 주석은 "왜(why)"를 설명. "무엇(what)"은 코드로 표현
- 에러 핸들링: try-catch에서 구체적 에러 처리

### Import Order
1. Deno 표준/외부 라이브러리 (`npm:`, `jsr:`, `@std/`)
2. 프레임워크 (`fresh`, `hono`, `preact`)
3. 내부 모듈 (`~/`, `../`, `./`)
4. 타입 (`type` imports)

### Git
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- 커밋 메시지는 영어
- 브랜치: `feat/기능명`, `fix/버그명`, `refactor/대상`