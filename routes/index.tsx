import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { supabase } from "../utils/supabase.ts";

interface TopProduct {
  name: string;
  slug: string;
  subtitle: string;
  price: number;
  rating: number;
  review_count: number;
  brands: { name: string };
}

interface Symptom {
  name_ko: string;
  slug: string;
  description: string;
}

export default define.page(async function Home(_ctx) {
  const [productsRes, symptomsRes] = await Promise.all([
    supabase
      .from("products")
      .select("name, slug, subtitle, price, rating, review_count, brands(name)")
      .eq("is_active", true)
      .order("rating", { ascending: false })
      .limit(3),
    supabase
      .from("symptoms")
      .select("name_ko, slug, description")
      .order("name_ko"),
  ]);

  const topProducts = (productsRes.data ?? []) as TopProduct[];
  const symptoms = (symptomsRes.data ?? []) as Symptom[];

  return (
    <>
      <Head>
        <title>Agora Supplements | AI 최적화 영양제 비교</title>
        <meta
          name="description"
          content="비타민B군, 마그네슘 등 주요 영양제의 성분, 함량, 가격을 비교합니다. 증상별 추천과 전문 성분 분석으로 최적의 영양제를 찾아보세요."
        />
      </Head>

      <main class="max-w-5xl mx-auto px-4 py-8">
        {/* 히어로 섹션 (50-150 단어 자기완결적 청크) */}
        <section class="text-center py-12">
          <h1 class="text-3xl md:text-4xl font-bold">
            영양제, 성분으로 비교하세요
          </h1>
          <p class="text-gray-600 mt-4 max-w-2xl mx-auto text-lg">
            비타민B군, 마그네슘 등 주요 영양제의 활성형 성분 함량, 1일 비용,
            품질 인증을 투명하게 비교합니다. 증상별 맞춤 추천으로
            나에게 맞는 영양제를 찾아보세요.
          </p>
          <div class="flex gap-4 justify-center mt-8">
            <a
              href="/products"
              class="bg-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors"
            >
              제품 비교하기
            </a>
            <a
              href="/symptoms"
              class="bg-white text-blue-700 border border-blue-700 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              증상별 추천
            </a>
          </div>
        </section>

        {/* 인기 제품 섹션 */}
        {topProducts.length > 0 && (
          <section class="mb-12">
            <h2 class="text-xl font-bold mb-4">평점 높은 제품</h2>
            <div class="grid gap-4 md:grid-cols-3">
              {topProducts.map((product) => (
                <a
                  key={product.slug}
                  href={`/products/${product.slug}`}
                  class="block bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <p class="text-xs text-blue-600 font-medium">
                    {product.brands.name}
                  </p>
                  <h3 class="font-bold mt-1">{product.name}</h3>
                  <p class="text-sm text-gray-500 mt-1">{product.subtitle}</p>
                  <div class="flex items-center justify-between mt-3">
                    <span class="text-lg font-bold text-blue-700">
                      ${product.price}
                    </span>
                    <span class="text-sm">
                      <span class="text-yellow-500">★</span> {product.rating}
                      <span class="text-gray-400 ml-1">({product.review_count})</span>
                    </span>
                  </div>
                </a>
              ))}
            </div>
            <div class="text-center mt-4">
              <a href="/products" class="text-blue-700 text-sm font-medium hover:underline">
                전체 제품 보기 →
              </a>
            </div>
          </section>
        )}

        {/* 증상별 추천 섹션 */}
        {symptoms.length > 0 && (
          <section class="mb-12">
            <h2 class="text-xl font-bold mb-4">증상별 영양제 추천</h2>
            <div class="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {symptoms.map((symptom) => (
                <a
                  key={symptom.slug}
                  href={`/symptoms/${symptom.slug}`}
                  class="block bg-white rounded-lg border border-gray-200 p-4 text-center hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <h3 class="font-bold">{symptom.name_ko}</h3>
                  <p class="text-xs text-gray-500 mt-1 line-clamp-2">
                    {symptom.description}
                  </p>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* 사이트 소개 (50-150 단어 자기완결적 청크) */}
        <section class="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 class="text-xl font-bold mb-3">이 사이트에 대해</h2>
          <p class="text-gray-700 leading-relaxed">
            Agora Supplements는 영양제 성분 정보를 투명하게 비교할 수 있는 사이트입니다.
            각 제품의 활성형 성분 여부, 정확한 함량, 1일 섭취 비용, GMP·NSF 등
            품질 인증 정보를 제공합니다. 증상별(피로, 수면, 집중력, 면역력, 스트레스)
            추천 기능으로 자신의 건강 고민에 맞는 영양제를 찾을 수 있습니다.
            모든 정보는 제조사 공개 데이터를 기반으로 하며,
            의학적 진단이나 처방을 대체하지 않습니다.
          </p>
        </section>
      </main>
    </>
  );
});
