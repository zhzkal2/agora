import { define } from "../utils.ts";
import { BOT_TYPE, classifyBot } from "../utils/bot-detect.ts";
import { logBotAccess } from "../utils/supabase-admin.ts";

/** 클라이언트 IP 추출 (프록시 헤더 우선) */
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
    await logBotAccess({
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
    }).catch((err) => console.error("[bot-log] 비동기 로깅 실패:", err));
  }

  return resp;
});
