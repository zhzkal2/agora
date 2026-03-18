import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { supabase } from "../../utils/supabase.ts";
import { safeJsonLd } from "../../utils/safe-json-ld.ts";

const BASE_URL = Deno.env.get("BASE_URL") ||
  "https://vitacompare.deno.dev";

interface Symptom {
  id: string;
  name: string;
  name_ko: string;
  slug: string;
  description: string;
}

const SYMPTOM_ICONS: Record<string, string> = {
  fatigue: "⚡",
  sleep: "🌙",
  focus: "🧠",
  immunity: "🛡️",
  stress: "🧘",
};

function buildItemListJsonLd(symptoms: Symptom[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "증상별 영양제 추천",
    "description":
      "피로, 수면, 집중력, 면역력, 스트레스 등 증상별로 적합한 영양제를 추천합니다.",
    "numberOfItems": symptoms.length,
    "itemListElement": symptoms.map((symptom, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${BASE_URL}/symptoms/${symptom.slug}`,
      "item": {
        "@type": "MedicalCondition",
        "name": symptom.name_ko,
        "description": symptom.description,
      },
    })),
  };
}

export const handler = define.handlers({
  async GET(ctx) {
    let symptoms: Symptom[];

    try {
      const { data, error } = await supabase
        .from("symptoms")
        .select("id, name, name_ko, slug, description")
        .order("name_ko");

      if (error) {
        console.error("symptoms/index: Supabase query failed", error);
        return ctx.render(
          <main class="max-w-5xl mx-auto px-4 py-16 text-center">
            <h1 class="text-2xl font-bold">데이터를 불러올 수 없습니다</h1>
            <p class="text-gray-600 mt-2">잠시 후 다시 시도해주세요.</p>
          </main>,
          { status: 500 },
        );
      }

      symptoms = (data ?? []) as Symptom[];
    } catch (err: unknown) {
      console.error("symptoms/index: unexpected error", err);
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
          <title>증상별 영양제 추천 | VitaCompare</title>
          <meta
            name="description"
            content="피로, 수면, 집중력, 면역력, 스트레스 등 증상별로 적합한 영양제를 추천합니다. 근거 기반 성분 분석으로 최적의 영양제를 찾아보세요."
          />
          <meta
            property="og:title"
            content="증상별 영양제 추천 | VitaCompare"
          />
          <meta
            property="og:description"
            content="피로, 수면, 집중력, 면역력, 스트레스 등 증상별로 적합한 영양제를 추천합니다."
          />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={`${BASE_URL}/symptoms`} />
          {symptoms.length > 0 && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: safeJsonLd(buildItemListJsonLd(symptoms)),
              }}
            />
          )}
        </Head>

        <main class="max-w-5xl mx-auto px-4 py-8">
          <section class="mb-8">
            <h1 class="text-2xl md:text-3xl font-bold">증상별 영양제 추천</h1>
            <p class="text-gray-600 mt-2">
              피로, 수면 장애, 집중력 저하, 면역력 약화, 스트레스 등 흔한 건강
              고민별로 도움이 되는 영양 성분과 추천 제품을 안내합니다. 각 성분의
              근거 수준과 관련도를 함께 제공하여 합리적인 선택을 돕습니다.
            </p>
          </section>

          {symptoms.length === 0
            ? (
              <p class="text-gray-500 text-center py-12">
                등록된 증상이 없습니다.
              </p>
            )
            : (
              <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {symptoms.map((symptom) => (
                  <a
                    key={symptom.id}
                    href={`/symptoms/${symptom.slug}`}
                    class="block bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <span class="text-3xl">
                      {SYMPTOM_ICONS[symptom.slug] || "💊"}
                    </span>
                    <h2 class="text-lg font-bold mt-3">{symptom.name_ko}</h2>
                    <p class="text-sm text-gray-600 mt-2">
                      {symptom.description}
                    </p>
                    <p class="text-sm text-blue-600 mt-3 font-medium">
                      추천 제품 보기 →
                    </p>
                  </a>
                ))}
              </div>
            )}
        </main>
      </>
    );

    return ctx.render(page);
  },
});
