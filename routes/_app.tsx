import { define } from "../utils.ts";
import "../assets/styles.css";

export default define.page(function App({ Component }) {
  return (
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body class="bg-gray-50 text-gray-900 min-h-screen">
        <nav class="bg-white border-b border-gray-200 px-4 py-3">
          <div class="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" class="text-xl font-bold text-blue-700">
              Agora Supplements
            </a>
            <div class="flex gap-6 text-sm">
              <a href="/products" class="hover:text-blue-700">제품</a>
              <a href="/symptoms" class="hover:text-blue-700">증상별 추천</a>
            </div>
          </div>
        </nav>
        <Component />
        <footer class="bg-white border-t border-gray-200 px-4 py-6 mt-12">
          <div class="max-w-5xl mx-auto text-center text-sm text-gray-500">
            <p>이 사이트는 정보 제공 목적이며, 의학적 진단이나 처방을 대체하지 않습니다.</p>
            <p class="mt-1">영양제 복용 전 전문가와 상담하시기 바랍니다.</p>
          </div>
        </footer>
      </body>
    </html>
  );
});
