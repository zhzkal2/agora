import { define } from "../utils.ts";

const BASE_URL = Deno.env.get("BASE_URL") || "https://agora-supplements.deno.dev";

export const handler = define.handlers({
  GET(_ctx) {
    const body = `User-agent: *
Allow: /

# AI 크롤러 허용
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

# 차단 대상
User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;

    return new Response(body, {
      headers: { "Content-Type": "text/plain" },
    });
  },
});
