/**
 * User-Agent 기반 봇 탐지 유틸리티
 * - AI 봇: 로깅 대상 (GPTBot, ClaudeBot 등)
 * - 차단 봇: 403 응답 (Bytespider, CCBot)
 * - 일반: 통과
 */

export const BOT_TYPE = {
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
    if (pattern.test(userAgent)) {
      return { type: BOT_TYPE.BLOCKED, name };
    }
  }

  for (const { pattern, name } of AI_BOT_PATTERNS) {
    if (pattern.test(userAgent)) {
      return { type: BOT_TYPE.AI, name };
    }
  }

  return { type: BOT_TYPE.REGULAR, name: null };
}

export type { BotInfo, BotType };
