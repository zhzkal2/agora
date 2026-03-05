/**
 * POST /api/click — 어필리에이트 클릭 로그 기록
 * click_logs 테이블에 INSERT (service_role 권한)
 */

import { define } from "../../utils.ts";
import { supabaseAdmin } from "../../utils/supabase-admin.ts";

/** product_slug 최대 길이 */
const MAX_SLUG_LENGTH = 200;
/** referrer 최대 길이 */
const MAX_REFERRER_LENGTH = 2000;
/** affiliate_url 최대 길이 */
const MAX_AFFILIATE_URL_LENGTH = 2048;
/** 레이트 리밋: 분당 최대 요청 수 */
const RATE_LIMIT_PER_MINUTE = 30;
/** 레이트 리밋: 윈도우 (밀리초) */
const RATE_LIMIT_WINDOW_MS = 60_000;
/** lazy cleanup: 마지막 정리 이후 경과 시간 기준 (밀리초) */
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 300_000;

const VALID_SOURCES = new Set([
  "product_page",
  "compare",
  "recommendation",
  "chatbot",
]);

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
  cleanupRateLimitMapIfNeeded();

  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) {
    rateLimitMap.set(ip, { timestamps: [now] });
    return false;
  }

  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );

  if (entry.timestamps.length >= RATE_LIMIT_PER_MINUTE) {
    return true;
  }

  entry.timestamps.push(now);
  return false;
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

      const productSlug = body.product_slug as string | undefined;
      const referrer = body.referrer as string | undefined;
      const source = body.source as string | undefined;
      const affiliateUrl = body.affiliate_url as string | undefined;

      // 입력 검증
      if (!productSlug || typeof productSlug !== "string") {
        return Response.json(
          { error: "product_slug는 필수입니다.", status: 400 },
          { status: 400 },
        );
      }

      if (productSlug.length > MAX_SLUG_LENGTH) {
        return Response.json(
          { error: "product_slug가 너무 깁니다.", status: 400 },
          { status: 400 },
        );
      }

      if (referrer !== undefined && typeof referrer !== "string") {
        return Response.json(
          { error: "referrer는 문자열이어야 합니다.", status: 400 },
          { status: 400 },
        );
      }

      if (source && !VALID_SOURCES.has(source)) {
        return Response.json(
          { error: "유효하지 않은 source입니다.", status: 400 },
          { status: 400 },
        );
      }

      // affiliate_url 검증: 길이 + https/http 프로토콜만 허용
      if (affiliateUrl) {
        if (affiliateUrl.length > MAX_AFFILIATE_URL_LENGTH) {
          return Response.json(
            { error: "affiliate_url이 너무 깁니다.", status: 400 },
            { status: 400 },
          );
        }
        try {
          const parsed = new URL(affiliateUrl);
          if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            return Response.json(
              {
                error: "affiliate_url은 http 또는 https만 허용됩니다.",
                status: 400,
              },
              { status: 400 },
            );
          }
        } catch {
          return Response.json(
            { error: "affiliate_url 형식이 올바르지 않습니다.", status: 400 },
            { status: 400 },
          );
        }
      }

      // service_role 클라이언트가 없으면 OK 반환 (로깅 생략)
      if (!supabaseAdmin) {
        return Response.json({ ok: true });
      }

      const { error } = await supabaseAdmin.from("click_logs").insert({
        product_slug: productSlug,
        referrer: referrer?.slice(0, MAX_REFERRER_LENGTH) ?? null,
        source: source ?? null,
        affiliate_url: affiliateUrl ?? null,
      });

      if (error) {
        console.error("[click-log] INSERT 실패:", error.message);
        // 로깅 실패해도 클라이언트에는 OK 반환
      }

      return Response.json({ ok: true });
    } catch (_err) {
      // JSON 파싱 실패 등
      return Response.json(
        { error: "잘못된 요청입니다.", status: 400 },
        { status: 400 },
      );
    }
  },
});
