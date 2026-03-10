import { define } from "../utils.ts";
import { BOT_TYPE, classifyBot } from "../utils/bot-detect.ts";
import { logBotAccess } from "../utils/supabase-admin.ts";

/** 클라이언트 IP 추출 (프록시 헤더 우선) */
function getClientIp(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null;
}

/** 빌드된 CSS를 서버 시작 시 한 번만 읽어서 캐시 */
let cachedCss: string | null = null;
function loadCss(): string | null {
  if (cachedCss !== null) return cachedCss;
  try {
    for (const entry of Deno.readDirSync("_fresh/client/assets")) {
      if (
        entry.name.startsWith("server-entry-") && entry.name.endsWith(".css")
      ) {
        cachedCss = Deno.readTextFileSync(`_fresh/client/assets/${entry.name}`);
        return cachedCss;
      }
    }
  } catch {
    // dev 모드 또는 빌드 미완료 시 무시
  }
  return null;
}

/** HTML 응답에서 <link rel="stylesheet"> → 인라인 <style> 변환 */
function inlineCss(html: string, css: string): string {
  return html.replace(
    /<link\s+rel="stylesheet"\s+href="\/assets\/[^"]+\.css"[^>]*>/,
    `<style>${css}</style>`,
  );
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

  // HTML 응답의 렌더 차단 CSS를 인라인으로 변환
  const contentType = resp.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    const css = loadCss();
    if (css) {
      const html = await resp.text();
      const headers = new Headers(resp.headers);
      return new Response(inlineCss(html, css), {
        status: resp.status,
        headers,
      });
    }
  }

  return resp;
});
