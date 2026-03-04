import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { supabase } from "../../utils/supabase.ts";

interface IngredientWithProducts {
  relevance_score: number;
  evidence_level: string;
  ingredients: {
    id: string;
    name: string;
    name_ko: string;
    category: string;
    description: string;
    product_ingredients: {
      amount: number;
      unit: string;
      form: string;
      products: {
        name: string;
        slug: string;
        price: number;
        rating: number;
        review_count: number;
        servings_per_container: number;
        brands: {
          name: string;
        };
      };
    }[];
  };
}

interface Symptom {
  id: string;
  name: string;
  name_ko: string;
  slug: string;
  description: string;
  ingredient_symptoms: IngredientWithProducts[];
}

const EVIDENCE_LABELS: Record<string, { text: string; color: string }> = {
  strong: { text: "근거 강함", color: "bg-green-50 text-green-700" },
  moderate: { text: "근거 보통", color: "bg-yellow-50 text-yellow-700" },
  weak: { text: "근거 약함", color: "bg-gray-100 text-gray-600" },
};

function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function buildJsonLd(symptom: Symptom) {
  const productSlugs = new Set<string>();
  const products: { name: string; slug: string }[] = [];

  for (const is of symptom.ingredient_symptoms) {
    for (const pi of is.ingredients.product_ingredients) {
      if (!productSlugs.has(pi.products.slug)) {
        productSlugs.add(pi.products.slug);
        products.push({ name: pi.products.name, slug: pi.products.slug });
      }
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "name": `${symptom.name_ko} - 영양제 추천`,
    "description": symptom.description,
    "mainEntity": {
      "@type": "MedicalCondition",
      "name": symptom.name_ko,
      "description": symptom.description,
      "possibleTreatment": symptom.ingredient_symptoms.map((is) => ({
        "@type": "DietarySupplement",
        "name": is.ingredients.name_ko,
        "description": is.ingredients.description,
      })),
    },
    "about": products.map((p) => ({
      "@type": "Product",
      "name": p.name,
      "url": `/products/${p.slug}`,
    })),
  };
}

export const handler = define.handlers({
  async GET(ctx) {
    const { slug } = ctx.params;

    const { data, error } = await supabase
      .from("symptoms")
      .select(`
        id, name, name_ko, slug, description,
        ingredient_symptoms(
          relevance_score, evidence_level,
          ingredients(
            id, name, name_ko, category, description,
            product_ingredients(
              amount, unit, form,
              products(name, slug, price, rating, review_count, servings_per_container,
                brands(name))
            )
          )
        )
      `)
      .eq("slug", slug)
      .single();

    if (error || !data) {
      return ctx.render(
        <main class="max-w-5xl mx-auto px-4 py-16 text-center">
          <h1 class="text-2xl font-bold">증상을 찾을 수 없습니다</h1>
          <p class="text-gray-600 mt-2">요청하신 증상 정보가 존재하지 않습니다.</p>
          <a href="/symptoms" class="text-blue-600 hover:underline mt-4 inline-block">증상 목록으로 돌아가기</a>
        </main>,
        { status: 404 },
      );
    }

    const symptom = data as Symptom;
    symptom.ingredient_symptoms.sort((a, b) => b.relevance_score - a.relevance_score);

    // 추천 제품 목록 (중복 제거, 평점순)
    const productMap = new Map<string, {
      name: string;
      slug: string;
      price: number;
      rating: number;
      review_count: number;
      servings_per_container: number;
      brand_name: string;
      ingredients: string[];
    }>();

    for (const is of symptom.ingredient_symptoms) {
      for (const pi of is.ingredients.product_ingredients) {
        const existing = productMap.get(pi.products.slug);
        if (existing) {
          existing.ingredients.push(`${is.ingredients.name_ko} ${pi.amount}${pi.unit}`);
        } else {
          productMap.set(pi.products.slug, {
            name: pi.products.name,
            slug: pi.products.slug,
            price: pi.products.price,
            rating: pi.products.rating,
            review_count: pi.products.review_count,
            servings_per_container: pi.products.servings_per_container,
            brand_name: pi.products.brands.name,
            ingredients: [`${is.ingredients.name_ko} ${pi.amount}${pi.unit}`],
          });
        }
      }
    }

    const recommendedProducts = [...productMap.values()].sort((a, b) => b.rating - a.rating);

    const page = (
      <>
        <Head>
          <title>{symptom.name_ko} 영양제 추천 | Agora Supplements</title>
          <meta
            name="description"
            content={`${symptom.description} ${symptom.name_ko}에 도움이 되는 영양 성분과 추천 제품을 확인하세요.`}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeJsonLd(buildJsonLd(symptom)) }}
          />
        </Head>

        <main class="max-w-5xl mx-auto px-4 py-8">
          <nav class="text-sm text-gray-500 mb-6">
            <a href="/" class="hover:text-blue-700">홈</a>
            <span class="mx-2">/</span>
            <a href="/symptoms" class="hover:text-blue-700">증상별 추천</a>
            <span class="mx-2">/</span>
            <span class="text-gray-900">{symptom.name_ko}</span>
          </nav>

          <article>
            <section class="mb-8">
              <h1 class="text-2xl md:text-3xl font-bold">{symptom.name_ko}에 도움되는 영양제</h1>
              <p class="text-gray-600 mt-2">
                {symptom.description}. 아래는 {symptom.name_ko}에 도움이 될 수 있는
                영양 성분과 해당 성분을 함유한 추천 제품입니다.
                각 성분의 관련도와 근거 수준을 참고하여 선택하세요.
              </p>
            </section>

            <section class="mb-8">
              <h2 class="text-xl font-bold mb-4">관련 영양 성분</h2>
              <div class="space-y-4">
                {symptom.ingredient_symptoms.map((is, i) => {
                  const evidence = EVIDENCE_LABELS[is.evidence_level] || EVIDENCE_LABELS.weak;
                  return (
                    <div key={i} class="bg-white rounded-lg border border-gray-200 p-5">
                      <div class="flex items-start justify-between gap-3">
                        <div>
                          <h3 class="font-bold">{is.ingredients.name_ko}</h3>
                          <p class="text-sm text-gray-500">{is.ingredients.name}</p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                          <span class={`text-xs font-medium px-2 py-1 rounded ${evidence.color}`}>
                            {evidence.text}
                          </span>
                          <span class="text-sm font-medium text-blue-700">
                            관련도 {is.relevance_score}/10
                          </span>
                        </div>
                      </div>
                      <p class="text-gray-600 text-sm mt-2">{is.ingredients.description}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {recommendedProducts.length > 0 && (
              <section class="mb-8">
                <h2 class="text-xl font-bold mb-4">추천 제품</h2>
                <div class="space-y-4">
                  {recommendedProducts.map((product) => {
                    const dailyCost = product.servings_per_container > 0
                      ? (product.price / product.servings_per_container).toFixed(2)
                      : null;

                    return (
                      <a
                        key={product.slug}
                        href={`/products/${product.slug}`}
                        class="block bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
                      >
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <p class="text-xs text-blue-600 font-medium">{product.brand_name}</p>
                            <h3 class="font-bold mt-1">{product.name}</h3>
                            <p class="text-sm text-gray-600 mt-1">
                              관련 성분: {product.ingredients.join(", ")}
                            </p>
                          </div>
                          <div class="text-right shrink-0">
                            <p class="text-lg font-bold text-blue-700">${product.price}</p>
                            {dailyCost && (
                              <p class="text-xs text-gray-500">1일 ${dailyCost}</p>
                            )}
                            <div class="flex items-center gap-1 mt-1 text-sm justify-end">
                              <span class="text-yellow-500">★</span>
                              <span class="font-medium">{product.rating}</span>
                              <span class="text-gray-400">({product.review_count})</span>
                            </div>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </section>
            )}
          </article>
        </main>
      </>
    );

    return ctx.render(page);
  },
});
