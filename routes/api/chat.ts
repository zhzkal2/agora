/**
 * POST /api/chat — AI 챗봇 API
 * Mastra Agent를 사용하여 영양제 상담 응답 생성
 */

import { z } from "zod";
import { define } from "../../utils.ts";
import { supplementAgent } from "../../utils/agent.ts";
import type { ChatMessage } from "../../types/index.ts";

/** 메시지 최대 길이 */
const MAX_MESSAGE_LENGTH = 1000;
/** 히스토리 최대 턴 수 */
const MAX_HISTORY_TURNS = 20;
/** 레이트 리밋: 분당 최대 요청 수 */
const RATE_LIMIT_PER_MINUTE = 10;
/** 레이트 리밋: 윈도우 (밀리초) */
const RATE_LIMIT_WINDOW_MS = 60_000;
/** lazy cleanup: 마지막 정리 이후 경과 시간 기준 (밀리초) */
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 300_000;

// ─── IP 기반 인메모리 레이트 리밋 ──────────────────────────────────

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/** 마지막 클린업 시각 */
let lastCleanupAt = Date.now();

/** 오래된 레이트 리밋 항목 정리 (요청 시점에 lazy 실행) */
function cleanupRateLimitMapIfNeeded(): void {
  const now = Date.now();
  if (now - lastCleanupAt < RATE_LIMIT_CLEANUP_INTERVAL_MS) return;

  lastCleanupAt = now;
  for (const [ip, entry] of rateLimitMap) {
    entry.timestamps = entry.timestamps.filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS,
    );
    if (entry.timestamps.length === 0) {
      rateLimitMap.delete(ip);
    }
  }
}

/** IP 기반 레이트 리밋 확인. 초과 시 true 반환 */
function isRateLimited(ip: string): boolean {
  // 서버리스 환경 호환: 요청 시점에 lazy cleanup
  cleanupRateLimitMapIfNeeded();

  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) {
    rateLimitMap.set(ip, { timestamps: [now] });
    return false;
  }

  // 윈도우 밖 타임스탬프 제거
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );

  if (entry.timestamps.length >= RATE_LIMIT_PER_MINUTE) {
    return true;
  }

  entry.timestamps.push(now);
  return false;
}

// ─── 히스토리 검증 스키마 ──────────────────────────────────────────

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(MAX_MESSAGE_LENGTH),
});

const historySchema = z.array(chatMessageSchema).max(MAX_HISTORY_TURNS);

// ─── 프롬프트 빌더 ────────────────────────────────────────────────

/**
 * 대화 히스토리를 프롬프트 문자열로 변환
 * Mastra Agent의 MessageListInput은 string을 허용하므로
 * 히스토리 + 현재 메시지를 하나의 문자열로 구성
 */
function buildPrompt(history: ChatMessage[], currentMessage: string): string {
  if (history.length === 0) return currentMessage;

  const historyLines = history.map((msg) =>
    msg.role === "user"
      ? `[사용자]: ${msg.content}`
      : `[상담사]: ${msg.content}`
  ).join("\n\n");

  return `이전 대화:\n${historyLines}\n\n[사용자]: ${currentMessage}`;
}

export const handler = define.handlers({
  async POST(ctx) {
    // IP 추출 (프록시 헤더 우선)
    const ip = ctx.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    // 레이트 리밋 확인
    if (isRateLimited(ip)) {
      return Response.json(
        {
          error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
          status: 429,
        },
        { status: 429 },
      );
    }

    try {
      const body = await ctx.req.json();
      const message = body.message as string | undefined;

      // 입력 검증
      if (
        !message || typeof message !== "string" || message.trim().length === 0
      ) {
        return Response.json(
          { error: "메시지를 입력해주세요.", status: 400 },
          { status: 400 },
        );
      }

      if (message.length > MAX_MESSAGE_LENGTH) {
        return Response.json(
          {
            error: `메시지는 ${MAX_MESSAGE_LENGTH}자 이내로 입력해주세요.`,
            status: 400,
          },
          { status: 400 },
        );
      }

      // 히스토리 Zod 검증
      const historyResult = historySchema.safeParse(body.history ?? []);
      if (!historyResult.success) {
        return Response.json(
          { error: "대화 히스토리 형식이 올바르지 않습니다.", status: 400 },
          { status: 400 },
        );
      }

      // 히스토리 길이 제한
      const trimmedHistory = historyResult.data.slice(-MAX_HISTORY_TURNS);

      // Agent 호출: 히스토리와 현재 메시지를 프롬프트 문자열로 구성
      const prompt = buildPrompt(trimmedHistory, message.trim());
      const response = await supplementAgent.generate(prompt);

      return Response.json({
        reply: response.text,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error
        ? err.message
        : "알 수 없는 오류";
      console.error("[chat] Agent 호출 실패:", errorMessage);

      return Response.json(
        {
          error: "상담 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
          status: 500,
        },
        { status: 500 },
      );
    }
  },
});
