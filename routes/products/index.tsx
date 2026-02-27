import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { supabase } from "../../utils/supabase.ts";

const BASE_URL = Deno.env.get("BASE_URL") || "https://agora-supplements.deno.dev";

interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  price: number;
  rating: number;
  review_count: number;
  form: string;
  certification: string[];
  servings_per_container: number;
  brands: {
    name: string;
    slug: string;
  } | null;
}

function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function buildItemListJsonLd(products: ProductListItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "영양제 제품 목록",
    "description": "비타민B군, 마그네슘 등 주요 영양제의 성분, 함량, 가격을 비교합니다.",
    "numberOfItems": products.length,
    "itemListElement": products.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${BASE_URL}/products/${product.slug}`,
      "item": {
        "@type": "Product",
        "name": product.name,
        "description": product.subtitle,
        ...(product.brands ? { "brand": { "@type": "Brand", "name": product.brands.name } } : {}),
        "offers": {
          "@type": "Offer",
          "price": product.price.toString(),
          "priceCurrency": "USD",
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": product.rating.toString(),
          "reviewCount": String(product.review_count),
        },
      },
    })),
  };
}

export const handler = define.handlers({
  async GET(ctx) {
    let products: ProductListItem[];

    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, slug, subtitle, price, rating, review_count,
          form, certification, servings_per_container,
          brands(name, slug)
        `)
        .eq("is_active", true)
        .order("rating", { ascending: false });

      if (error) {
        console.error("products/index: Supabase query failed", error);
        return ctx.render(
          <main class="max-w-5xl mx-auto px-4 py-16 text-center">
            <h1 class="text-2xl font-bold">데이터를 불러올 수 없습니다</h1>
            <p class="text-gray-600 mt-2">잠시 후 다시 시도해주세요.</p>
          </main>,
          { status: 500 },
        );
      }

      products = (data ?? []) as ProductListItem[];
    } catch (err: unknown) {
      console.error("products/index: unexpected error", err);
      return ctx.render(
        <main class="max-w-5xl mx-auto px-4 py-16 text-center">
          <h1 class="text-2xl font-bold">데이터를 불러올 수 없습니다</h1>
          <p class="text-gray-600 mt-2">잠시 후 다시 시도해주세요.</p>
        </main>,
        { status: 500 },
      );
    }

    const page = (
      <>
        <Head>
          <title>영양제 제품 목록 | Agora Supplements</title>
          <meta
            name="description"
            content="비타민B군, 마그네슘 등 주요 영양제의 성분, 함량, 가격을 비교합니다. 전문가 리뷰와 인증 정보를 확인하세요."
          />
          <meta property="og:title" content="영양제 제품 목록 | Agora Supplements" />
          <meta
            property="og:description"
            content="비타민B군, 마그네슘 등 주요 영양제의 성분, 함량, 가격을 비교합니다."
          />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={`${BASE_URL}/products`} />
          {products.length > 0 && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: safeJsonLd(buildItemListJsonLd(products)) }}
            />
          )}
        </Head>

        <main class="max-w-5xl mx-auto px-4 py-8">
          <section class="mb-8">
            <h1 class="text-2xl md:text-3xl font-bold">영양제 제품 비교</h1>
            <p class="text-gray-600 mt-2">
              비타민B군, 마그네슘 등 주요 영양제의 성분 함량, 가격, 인증 정보를 비교합니다.
              각 제품의 활성형 성분 여부, 1일 비용, GMP/NSF 등 품질 인증을 확인하여
              자신에게 맞는 영양제를 선택하세요.
            </p>
          </section>

          {products.length === 0 ? (
            <p class="text-gray-500 text-center py-12">등록된 제품이 없습니다.</p>
          ) : (
            <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const dailyCost = product.servings_per_container > 0
                  ? (product.price / product.servings_per_container).toFixed(2)
                  : null;

                return (
                  <a
                    key={product.id}
                    href={`/products/${product.slug}`}
                    class="block bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <p class="text-xs text-blue-600 font-medium">
                      {product.brands?.name ?? "Unknown Brand"}
                    </p>
                    <h2 class="text-lg font-bold mt-1 line-clamp-2">
                      {product.name}
                    </h2>
                    <p class="text-sm text-gray-500 mt-1 line-clamp-1">
                      {product.subtitle}
                    </p>
                    <div class="mt-4 flex items-baseline gap-2">
                      <span class="text-xl font-bold text-blue-700">
                        ${product.price}
                      </span>
                      {dailyCost && (
                        <span class="text-sm text-gray-500">
                          (1일 ${dailyCost})
                        </span>
                      )}
                    </div>
                    <div class="flex items-center gap-1 mt-2 text-sm">
                      <span class="text-yellow-500">★</span>
                      <span class="font-medium">{product.rating}</span>
                      <span class="text-gray-400">({product.review_count})</span>
                    </div>
                    <div class="flex flex-wrap gap-1.5 mt-3">
                      <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {product.form}
                      </span>
                      {product.certification?.map((cert) => (
                        <span
                          key={cert}
                          class="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </main>
      </>
    );

    return ctx.render(page);
  },
});
