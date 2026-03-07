import { define } from "../utils.ts";
import ChatBot from "../islands/ChatBot.tsx";
import "../assets/styles.css";

const BASE_URL = Deno.env.get("BASE_URL") ||
  "https://agora-supplements.deno.dev";
const GOOGLE_SITE_VERIFICATION = Deno.env.get("GOOGLE_SITE_VERIFICATION");

const SITE_NAME = "Agora Supplements";
const SITE_DESCRIPTION =
  "영양제 성분, 함량, 가격을 비교하고 증상별 최적의 영양제를 추천합니다.";
const SITE_TITLE = `${SITE_NAME} - 영양제 비교 추천`;

function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default define.page(function App({ Component }) {
  return (
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {GOOGLE_SITE_VERIFICATION && (
          <meta
            name="google-site-verification"
            content={GOOGLE_SITE_VERIFICATION}
          />
        )}
        <title>{SITE_TITLE}</title>
        <meta name="description" content={SITE_DESCRIPTION} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:url" content={BASE_URL} />
        <link rel="icon" href="/favicon.ico" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": SITE_NAME,
              "description": SITE_DESCRIPTION,
              "url": BASE_URL,
            }),
          }}
        />
      </head>
      <body class="bg-gray-50 text-gray-900 min-h-screen">
        <nav class="bg-white border-b border-gray-200 px-4 py-3">
          <div class="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" class="text-xl font-bold text-blue-700">
              Agora Supplements
            </a>
            <div class="flex gap-6 text-sm">
              <a href="/products" class="hover:text-blue-700">제품</a>
              <a href="/compare" class="hover:text-blue-700">비교</a>
              <a href="/symptoms" class="hover:text-blue-700">증상별 추천</a>
            </div>
          </div>
        </nav>
        <Component />
        <footer class="bg-white border-t border-gray-200 px-4 py-6 mt-12">
          <div class="max-w-5xl mx-auto text-center text-sm text-gray-500">
            <p>
              이 사이트는 정보 제공 목적이며, 의학적 진단이나 처방을 대체하지
              않습니다.
            </p>
            <p class="mt-1">영양제 복용 전 전문가와 상담하시기 바랍니다.</p>
          </div>
        </footer>
        <ChatBot />
      </body>
    </html>
  );
});
