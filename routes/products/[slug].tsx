import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { supabase } from "../../utils/supabase.ts";

interface ProductIngredient {
  amount: number;
  unit: string;
  daily_value_pct: number;
  form: string;
  ingredients: {
    name: string;
    name_ko: string;
    category: string;
    description: string;
  };
}

interface Product {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  price: number;
  currency: string;
  serving_size: string;
  servings_per_container: number;
  form: string;
  certification: string[];
  rating: number;
  review_count: number;
  brands: {
    name: string;
    slug: string;
    origin: string;
    concept: string;
  };
  product_ingredients: ProductIngredient[];
}

function buildJsonLd(product: Product) {
  const dailyCost = product.servings_per_container > 0
    ? (product.price / product.servings_per_container).toFixed(2)
    : null;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "brand": { "@type": "Brand", "name": product.brands.name },
    "description": product.description,
    "category": "영양제",
    "offers": {
      "@type": "Offer",
      "price": product.price.toString(),
      "priceCurrency": product.currency || "USD",
      "availability": "https://schema.org/InStock",
    },
    "additionalProperty": [
      { "@type": "PropertyValue", "name": "서빙 사이즈", "value": product.serving_size },
      { "@type": "PropertyValue", "name": "총 서빙수", "value": String(product.servings_per_container) },
      { "@type": "PropertyValue", "name": "제형", "value": product.form },
      ...(product.product_ingredients?.map((pi) => ({
        "@type": "PropertyValue",
        "name": `${pi.ingredients.name_ko} 함량`,
        "value": `${pi.amount}${pi.unit} (${pi.form})`,
      })) ?? []),
      ...(product.certification?.length
        ? [{ "@type": "PropertyValue", "name": "인증", "value": product.certification.join(", ") }]
        : []),
      ...(dailyCost
        ? [{ "@type": "PropertyValue", "name": "1일 비용", "value": `$${dailyCost}` }]
        : []),
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": product.rating.toString(),
      "reviewCount": String(product.review_count),
    },
  };
}

export const handler = define.handlers({
  async GET(ctx) {
    const { slug } = ctx.params;

    const { data, error } = await supabase
      .from("products")
      .select(`
        id, name, slug, subtitle, description, price, currency,
        serving_size, servings_per_container, form, certification,
        rating, review_count,
        brands(name, slug, origin, concept),
        product_ingredients(amount, unit, daily_value_pct, form,
          ingredients(name, name_ko, category, description))
      `)
      .eq("slug", slug)
      .single();

    if (error || !data) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/products" },
      });
    }

    const product = data as Product;
    const dailyCost = product.servings_per_container > 0
      ? (product.price / product.servings_per_container).toFixed(2)
      : null;

    const page = (
      <>
        <Head>
          <title>{product.name} | Agora Supplements</title>
          <meta
            name="description"
            content={`${product.subtitle}. ${product.brands.name} 제조. ${product.certification?.join(", ")} 인증.`}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(product)) }}
          />
        </Head>

        <main class="max-w-5xl mx-auto px-4 py-8">
          <article itemScope itemType="https://schema.org/Product">
            <nav class="text-sm text-gray-500 mb-6">
              <a href="/" class="hover:text-blue-700">홈</a>
              <span class="mx-2">/</span>
              <a href="/products" class="hover:text-blue-700">제품</a>
              <span class="mx-2">/</span>
              <span class="text-gray-900">{product.name}</span>
            </nav>

            {/* 제품 헤더 */}
            <section class="mb-8">
              <div class="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p class="text-sm text-blue-600 font-medium" itemProp="brand">
                    {product.brands.name}
                  </p>
                  <h1 class="text-2xl md:text-3xl font-bold mt-1" itemProp="name">
                    {product.name}
                  </h1>
                  <p class="text-gray-600 mt-1">{product.subtitle}</p>
                </div>
                <div class="text-right">
                  <p class="text-3xl font-bold text-blue-700" itemProp="price">
                    ${product.price}
                  </p>
                  {dailyCost && (
                    <p class="text-sm text-gray-500">1일 ${dailyCost}</p>
                  )}
                </div>
              </div>
              <div class="flex items-center gap-4 mt-4 flex-wrap">
                <div class="flex items-center gap-1">
                  <span class="text-yellow-500">{"★".repeat(Math.round(product.rating))}</span>
                  <span class="font-medium">{product.rating}</span>
                  <span class="text-gray-500 text-sm">({product.review_count}개 리뷰)</span>
                </div>
                {product.certification?.map((cert) => (
                  <span
                    key={cert}
                    class="inline-block bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded"
                  >
                    {cert}
                  </span>
                ))}
              </div>
            </section>

            {/* 제품 설명 (50-150 단어 자기완결적 청크) */}
            <section class="mb-8 bg-white rounded-lg border border-gray-200 p-6">
              <h2 class="text-lg font-bold mb-3">제품 요약</h2>
              <p class="text-gray-700 leading-relaxed" itemProp="description">
                {product.description}
                {` ${product.serving_size}당 ${product.servings_per_container}일분이며`}
                {` ${product.form} 제형입니다.`}
                {dailyCost && ` 가격은 $${product.price}이며 1일 비용은 $${dailyCost}입니다.`}
              </p>
            </section>

            {/* 성분 정보 테이블 */}
            {product.product_ingredients?.length > 0 && (
              <section class="mb-8 bg-white rounded-lg border border-gray-200 p-6">
                <h2 class="text-lg font-bold mb-4">성분 정보</h2>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b border-gray-200">
                        <th class="text-left py-3 pr-4 font-medium text-gray-500">성분</th>
                        <th class="text-right py-3 px-4 font-medium text-gray-500">함량</th>
                        <th class="text-right py-3 px-4 font-medium text-gray-500">일일 권장량 대비</th>
                        <th class="text-left py-3 pl-4 font-medium text-gray-500">형태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.product_ingredients.map((pi, i) => (
                        <tr key={i} class="border-b border-gray-100">
                          <td class="py-3 pr-4">
                            <p class="font-medium">{pi.ingredients.name_ko}</p>
                            <p class="text-gray-500 text-xs">{pi.ingredients.name}</p>
                          </td>
                          <td class="text-right py-3 px-4 font-medium">
                            {pi.amount}{pi.unit}
                          </td>
                          <td class="text-right py-3 px-4 text-gray-600">
                            {pi.daily_value_pct}%
                          </td>
                          <td class="py-3 pl-4 text-gray-600">{pi.form}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 성분별 효능 (50-150 단어 자기완결적 청크) */}
            {product.product_ingredients?.length > 0 && (
              <section class="mb-8 bg-white rounded-lg border border-gray-200 p-6">
                <h2 class="text-lg font-bold mb-4">성분별 효능</h2>
                <div class="space-y-4">
                  {product.product_ingredients.map((pi, i) => (
                    <div key={i} class="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <h3 class="font-medium">
                        {pi.ingredients.name_ko} ({pi.amount}{pi.unit})
                      </h3>
                      <p class="text-gray-600 text-sm mt-1">
                        {pi.ingredients.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 제품 기본 정보 */}
            <section class="mb-8 bg-white rounded-lg border border-gray-200 p-6">
              <h2 class="text-lg font-bold mb-4">제품 기본 정보</h2>
              <dl class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <dt class="text-gray-500">브랜드</dt>
                  <dd class="font-medium mt-1">{product.brands.name}</dd>
                </div>
                <div>
                  <dt class="text-gray-500">원산지</dt>
                  <dd class="font-medium mt-1">{product.brands.origin}</dd>
                </div>
                <div>
                  <dt class="text-gray-500">제형</dt>
                  <dd class="font-medium mt-1">{product.form}</dd>
                </div>
                <div>
                  <dt class="text-gray-500">서빙 사이즈</dt>
                  <dd class="font-medium mt-1">{product.serving_size}</dd>
                </div>
                <div>
                  <dt class="text-gray-500">총 서빙수</dt>
                  <dd class="font-medium mt-1">{product.servings_per_container}회분</dd>
                </div>
                <div>
                  <dt class="text-gray-500">인증</dt>
                  <dd class="font-medium mt-1">{product.certification?.join(", ") || "-"}</dd>
                </div>
              </dl>
            </section>
          </article>
        </main>
      </>
    );

    return ctx.render(page);
  },
});
