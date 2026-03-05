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

const VALID_SOURCES = new Set([
  "product_page",
  "compare",
  "recommendation",
  "chatbot",
]);

export const handler = define.handlers({
  async POST(ctx) {
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
