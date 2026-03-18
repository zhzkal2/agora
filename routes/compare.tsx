/**
 * /compare — 제품 비교 페이지
 * URL: /compare?slugs=slug1,slug2
 */

import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { supabase } from "../utils/supabase.ts";
import ProductCompare from "../islands/ProductCompare.tsx";
import { safeJsonLd } from "../utils/safe-json-ld.ts";

const BASE_URL = Deno.env.get("BASE_URL") ||
  "https://vitacompare.deno.dev";

function buildItemListJsonLd(
  products: { name: string; slug: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "영양제 제품 비교",
    "description":
      "영양제 제품을 나란히 비교하세요. 가격, 성분 함량, 인증, 1일 비용을 한눈에 확인할 수 있습니다.",
    "numberOfItems": products.length,
    "itemListElement": products.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${BASE_URL}/products/${product.slug}`,
      "item": {
        "@type": "Product",
        "name": product.name,
      },
    })),
  };
}

export default define.page(async function ComparePage(ctx) {
  const MAX_COMPARE_SLUGS = 4;
  const slugsParam = ctx.url.searchParams.get("slugs") ?? "";
  const initialSlugs = [
    ...new Set(
      slugsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_COMPARE_SLUGS);

  // 전체 활성 제품 목록 (선택지용)
  let allProducts: { name: string; slug: string }[] = [];

  try {
    const { data, error } = await supabase
      .from("products")
      .select("name, slug")
      .eq("is_active", true)
      .order("name");

    if (!error && data) {
      allProducts = data as { name: string; slug: string }[];
    }
  } catch (_err) {
    // DB 오류 시 빈 목록
  }

  return (
    <>
      <Head>
        <title>영양제 비교 | VitaCompare</title>
        <meta
          name="description"
          content="영양제 제품을 나란히 비교하세요. 가격, 성분 함량, 인증, 1일 비용을 한눈에 확인할 수 있습니다."
        />
        <meta
          property="og:title"
          content="영양제 비교 | VitaCompare"
        />
        <meta
          property="og:description"
          content="영양제 제품을 나란히 비교하세요. 가격, 성분 함량, 인증, 1일 비용을 한눈에 확인할 수 있습니다."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${BASE_URL}/compare`} />
        {allProducts.length > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: safeJsonLd(buildItemListJsonLd(allProducts)),
            }}
          />
        )}
      </Head>

      <main class="max-w-5xl mx-auto px-4 py-8">
        <nav class="text-sm text-gray-500 mb-6">
          <a href="/" class="hover:text-blue-700">홈</a>
          <span class="mx-2">/</span>
          <span class="text-gray-900">제품 비교</span>
        </nav>

        <h1 class="text-2xl md:text-3xl font-bold mb-2">영양제 비교</h1>
        <p class="text-gray-600 mb-8">
          최대 4개 제품의 가격, 성분 함량, 인증, 1일 비용을 나란히 비교해보세요.
        </p>

        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <ProductCompare
            initialSlugs={initialSlugs}
            allProducts={allProducts}
          />
        </div>
      </main>
    </>
  );
});
