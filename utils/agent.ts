/**
 * Mastra AI Agent: 영양제 상담 전문 에이전트
 * - 키워드 검색, 증상 기반 검색, 성분 상호작용, 복용법 안내
 */

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { supabase } from "./supabase.ts";

// ─── 환경변수 ────────────────────────────────────────────────────

const MASTRA_MODEL = Deno.env.get("MASTRA_MODEL") ??
  "anthropic/claude-sonnet-4-20250514";

// ─── ILIKE 와일드카드 이스케이프 ─────────────────────────────────

/** ILIKE 쿼리에서 사용자 입력의 특수 와일드카드 문자를 이스케이프 */
function escapeLike(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

// ─── 정적 데이터: 영양제 상호작용 ────────────────────────────────

const KNOWN_INTERACTIONS: Record<string, {
  type: string;
  description: string;
  recommendation: string;
}> = {
  "칼슘+마그네슘": {
    type: "경쟁적 흡수",
    description:
      "칼슘과 마그네슘은 같은 흡수 경로를 사용하여 서로의 흡수를 방해할 수 있습니다.",
    recommendation: "2시간 이상 간격을 두고 복용하세요.",
  },
  "칼슘+철분": {
    type: "흡수 방해",
    description: "칼슘은 철분의 흡수를 최대 50%까지 감소시킬 수 있습니다.",
    recommendation:
      "반드시 다른 시간에 복용하세요. 철분은 공복에, 칼슘은 식후에 권장.",
  },
  "비타민C+철분": {
    type: "시너지",
    description:
      "비타민C는 비헴 철분(식물성 철분)의 흡수를 최대 6배까지 증가시킵니다.",
    recommendation: "함께 복용하면 좋습니다.",
  },
  "비타민D+칼슘": {
    type: "시너지",
    description: "비타민D는 칼슘의 장내 흡수를 촉진합니다.",
    recommendation: "함께 복용하면 좋습니다.",
  },
  "비타민B6+마그네슘": {
    type: "시너지",
    description: "비타민B6은 마그네슘의 세포 내 흡수를 촉진합니다.",
    recommendation: "함께 복용하면 좋습니다.",
  },
  "엽산+비타민B12": {
    type: "시너지",
    description:
      "엽산과 B12는 메틸화 회로에서 함께 작용합니다. B12 없이 엽산만 고용량 복용하면 B12 결핍을 숨길 수 있습니다.",
    recommendation: "반드시 함께 복용하세요.",
  },
  "마그네슘+비타민D": {
    type: "시너지",
    description: "마그네슘은 비타민D의 활성화에 필수적인 보조인자입니다.",
    recommendation: "함께 복용하면 비타민D의 효과가 향상됩니다.",
  },
  "아연+구리": {
    type: "경쟁적 흡수",
    description:
      "고용량 아연(50mg 이상)은 구리의 흡수를 방해하여 구리 결핍을 유발할 수 있습니다.",
    recommendation: "아연 장기 복용 시 구리 보충을 고려하세요.",
  },
};

// ─── 정적 데이터: 복용법 가이드 ──────────────────────────────────

const DOSAGE_GUIDES: Record<string, {
  ingredient_name: string;
  recommended_daily: string;
  upper_limit: string;
  best_time: string;
  with_food: string;
  precautions: string[];
  special_notes: string;
}> = {
  "비타민B12": {
    ingredient_name: "비타민 B12 (코발라민)",
    recommended_daily: "2.4mcg (성인 기준). 보충제는 500-1000mcg가 일반적.",
    upper_limit: "상한 섭취량 미설정 (수용성 비타민으로 과잉 시 소변 배출)",
    best_time: "아침 또는 점심 (에너지 대사 관여, 늦은 저녁 수면 방해 가능)",
    with_food: "식사와 함께 또는 공복 모두 가능. 위산이 흡수에 도움.",
    precautions: [
      "메트포르민(당뇨약) 복용자는 B12 결핍 위험 증가",
      "위산억제제(PPI) 장기 복용 시 흡수 저하",
      "채식/비건은 B12 보충 필수",
    ],
    special_notes:
      "메틸코발라민 형태가 활성형으로 체내 즉시 사용 가능. 시아노코발라민은 간에서 전환 필요.",
  },
  "비타민B6": {
    ingredient_name: "비타민 B6 (피리독신)",
    recommended_daily: "1.3mg (성인 기준). 보충제는 25-100mg가 일반적.",
    upper_limit: "100mg/일 (장기 고용량 복용 시 말초신경병증 위험)",
    best_time: "아침 또는 점심",
    with_food: "식사와 함께 권장",
    precautions: [
      "100mg 초과 장기 복용 시 신경 손상 가능",
      "레보도파(파킨슨병 약) 효과 감소 가능",
    ],
    special_notes: "P-5-P (피리독살 5-인산) 형태가 활성형. 간 전환 불필요.",
  },
  "마그네슘": {
    ingredient_name: "마그네슘",
    recommended_daily:
      "남성 400-420mg, 여성 310-320mg. 보충제는 200-400mg가 일반적.",
    upper_limit: "보충제 기준 350mg/일 (식품 포함 시 상한 없음)",
    best_time: "저녁 또는 취침 전 (수면 개선 효과, 근육 이완)",
    with_food: "식사와 함께 권장 (위장 불편 감소)",
    precautions: [
      "신장 기능 저하 시 축적 위험",
      "항생제(테트라사이클린, 퀴놀론)와 2시간 간격",
      "과량 복용 시 설사 가능",
    ],
    special_notes:
      "글리시네이트 형태가 흡수율 높고 위장 부작용 적음. 산화마그네슘은 흡수율 4%로 낮음.",
  },
  "엽산": {
    ingredient_name: "엽산 (폴레이트)",
    recommended_daily: "400mcg (성인 기준). 임신부 600mcg.",
    upper_limit: "1000mcg/일 (합성 엽산 기준)",
    best_time: "아침 식사와 함께",
    with_food: "식사와 함께 권장",
    precautions: [
      "고용량 엽산은 B12 결핍을 숨길 수 있음",
      "항경련제 효과 감소 가능",
      "MTHFR 유전자 변이 보유자는 메틸폴레이트 형태 권장",
    ],
    special_notes:
      "메틸폴레이트(5-MTHF)가 활성형. MTHFR 변이가 있어도 바로 사용 가능.",
  },
  "비타민D": {
    ingredient_name: "비타민 D3 (콜레칼시페롤)",
    recommended_daily: "600-800IU (성인 기준). 결핍 시 2000-4000IU.",
    upper_limit: "4000IU/일 (의사 지도하 10000IU까지)",
    best_time: "아침 또는 점심 (지용성이므로 식사와 함께)",
    with_food: "반드시 지방 함유 식사와 함께 (흡수율 50% 향상)",
    precautions: [
      "고칼슘혈증 위험 (장기 고용량)",
      "신장 질환자 주의",
      "일부 이뇨제와 상호작용",
    ],
    special_notes:
      "D3(콜레칼시페롤)가 D2보다 체내 활용률 높음. 한국인 70% 이상 결핍/부족.",
  },
  "비오틴": {
    ingredient_name: "비오틴 (비타민 B7)",
    recommended_daily: "30mcg (성인 기준). 보충제는 2500-5000mcg가 일반적.",
    upper_limit: "상한 섭취량 미설정",
    best_time: "아침 또는 점심",
    with_food: "식사와 함께 또는 공복 모두 가능",
    precautions: [
      "고용량 비오틴은 갑상선 혈액 검사 결과를 왜곡할 수 있음",
      "혈액 검사 48시간 전 중단 권장",
    ],
    special_notes:
      "모발, 피부, 손톱 건강에 기여. 단 효과가 나타나려면 3-6개월 꾸준한 복용 필요.",
  },
};

// ─── 성분 이름 정규화 매핑 ───────────────────────────────────────

const INGREDIENT_NAME_MAPPING: Record<string, string> = {
  "magnesium": "마그네슘",
  "magnesium glycinate": "마그네슘",
  "마그네슘 글리시네이트": "마그네슘",
  "calcium": "칼슘",
  "iron": "철분",
  "vitamin c": "비타민C",
  "vitamin d": "비타민D",
  "vitamin d3": "비타민D",
  "vitamin b6": "비타민B6",
  "vitamin b12": "비타민B12",
  "folate": "엽산",
  "methylfolate": "엽산",
  "메틸폴레이트": "엽산",
  "folic acid": "엽산",
  "zinc": "아연",
  "copper": "구리",
};

// ─── Tool 1: 키워드 기반 제품 검색 ─────────────────────────────────

export const searchProductsTool = createTool({
  id: "search_products",
  description:
    "키워드로 영양제 제품을 검색합니다. 제품명과 설명에서 검색합니다. " +
    "예: '비타민B', 'VitaCore', '마그네슘'",
  inputSchema: z.object({
    keyword: z.string().trim().min(1).describe(
      "검색 키워드 (제품명, 설명)",
    ),
    limit: z.number().min(1).max(20).default(5).describe("최대 반환 수"),
  }),
  outputSchema: z.object({
    products: z.array(z.object({
      name: z.string(),
      slug: z.string(),
      price: z.number(),
      rating: z.number(),
      review_count: z.number(),
      brand_name: z.string(),
      description: z.string(),
      form: z.string(),
      serving_size: z.string(),
      servings_per_container: z.number(),
      daily_cost: z.string().nullable(),
      certification: z.array(z.string()),
    })),
    total: z.number(),
  }),
  execute: async (input) => {
    const { keyword, limit } = input;
    const searchPattern = `%${escapeLike(keyword)}%`;

    const { data, error } = await supabase
      .from("products")
      .select(`
        name, slug, price, rating, review_count, description,
        form, serving_size, servings_per_container, certification,
        brands!inner(name)
      `)
      .eq("is_active", true)
      .or(
        `name.ilike.${searchPattern},description.ilike.${searchPattern}`,
      )
      .order("rating", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[searchProducts] 검색 실패:", error.message);
      return { products: [], total: 0 };
    }

    interface ProductRow {
      name: string;
      slug: string;
      price: number;
      rating: number;
      review_count: number;
      description: string;
      form: string;
      serving_size: string;
      servings_per_container: number;
      certification: string[];
      brands: { name: string };
    }

    const products = (data as unknown as ProductRow[]).map((p) => ({
      name: p.name,
      slug: p.slug,
      price: p.price,
      rating: p.rating,
      review_count: p.review_count,
      brand_name: p.brands.name,
      description: p.description,
      form: p.form,
      serving_size: p.serving_size,
      servings_per_container: p.servings_per_container,
      daily_cost: p.servings_per_container > 0
        ? (p.price / p.servings_per_container).toFixed(2)
        : null,
      certification: p.certification ?? [],
    }));

    return { products, total: products.length };
  },
});

// ─── Tool 2: 증상 기반 제품 검색 ───────────────────────────────────

export const searchBySymptomTool = createTool({
  id: "search_by_symptom",
  description: "증상/효능 기반으로 적합한 영양제를 찾습니다. " +
    "'피로', '수면', '집중력', '면역력', '스트레스' 같은 증상 키워드를 사용하세요. " +
    "관련 성분과 해당 성분을 함유한 제품을 함께 반환합니다.",
  inputSchema: z.object({
    symptom: z.string().trim().min(1).describe(
      "증상 또는 효능 키워드 (예: 피로, 수면, 집중력)",
    ),
    limit: z.number().min(1).max(20).default(5).describe("최대 반환 제품 수"),
  }),
  outputSchema: z.object({
    symptom_name: z.string(),
    symptom_description: z.string(),
    ingredients: z.array(z.object({
      name_ko: z.string(),
      name: z.string(),
      description: z.string(),
      relevance_score: z.number(),
      evidence_level: z.string(),
    })),
    products: z.array(z.object({
      name: z.string(),
      slug: z.string(),
      price: z.number(),
      rating: z.number(),
      brand_name: z.string(),
      relevant_ingredients: z.string(),
      daily_cost: z.string().nullable(),
    })),
  }),
  execute: async (input) => {
    const { symptom, limit } = input;
    const searchPattern = `%${escapeLike(symptom)}%`;

    // 증상 테이블에서 매칭
    const { data: symptomData, error: symptomError } = await supabase
      .from("symptoms")
      .select(`
        name, name_ko, description,
        ingredient_symptoms(
          relevance_score, evidence_level,
          ingredients(
            name, name_ko, description,
            product_ingredients(
              amount, unit,
              products(name, slug, price, rating, servings_per_container,
                brands(name))
            )
          )
        )
      `)
      .or(
        `name_ko.ilike.${searchPattern},name.ilike.${searchPattern},description.ilike.${searchPattern}`,
      )
      .limit(1)
      .single();

    if (symptomError || !symptomData) {
      return {
        symptom_name: symptom,
        symptom_description: "해당 증상에 대한 정보를 찾을 수 없습니다.",
        ingredients: [],
        products: [],
      };
    }

    interface SymptomRow {
      name: string;
      name_ko: string;
      description: string;
      ingredient_symptoms: {
        relevance_score: number;
        evidence_level: string;
        ingredients: {
          name: string;
          name_ko: string;
          description: string;
          product_ingredients: {
            amount: number;
            unit: string;
            products: {
              name: string;
              slug: string;
              price: number;
              rating: number;
              servings_per_container: number;
              brands: { name: string };
            };
          }[];
        };
      }[];
    }

    const s = symptomData as unknown as SymptomRow;

    const ingredients = s.ingredient_symptoms
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .map((is) => ({
        name_ko: is.ingredients.name_ko,
        name: is.ingredients.name,
        description: is.ingredients.description,
        relevance_score: is.relevance_score,
        evidence_level: is.evidence_level,
      }));

    // 중복 제거하여 제품 목록 생성
    const productMap = new Map<string, {
      name: string;
      slug: string;
      price: number;
      rating: number;
      brand_name: string;
      relevant_ingredients: string[];
      servings_per_container: number;
    }>();

    for (const is of s.ingredient_symptoms) {
      for (const pi of is.ingredients.product_ingredients) {
        const existing = productMap.get(pi.products.slug);
        const ingredientStr =
          `${is.ingredients.name_ko} ${pi.amount}${pi.unit}`;
        if (existing) {
          existing.relevant_ingredients.push(ingredientStr);
        } else {
          productMap.set(pi.products.slug, {
            name: pi.products.name,
            slug: pi.products.slug,
            price: pi.products.price,
            rating: pi.products.rating,
            brand_name: pi.products.brands.name,
            relevant_ingredients: [ingredientStr],
            servings_per_container: pi.products.servings_per_container,
          });
        }
      }
    }

    const products = [...productMap.values()]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit)
      .map((p) => ({
        name: p.name,
        slug: p.slug,
        price: p.price,
        rating: p.rating,
        brand_name: p.brand_name,
        relevant_ingredients: p.relevant_ingredients.join(", "),
        daily_cost: p.servings_per_container > 0
          ? (p.price / p.servings_per_container).toFixed(2)
          : null,
      }));

    return {
      symptom_name: s.name_ko,
      symptom_description: s.description,
      ingredients,
      products,
    };
  },
});

// ─── Tool 3: 성분 상호작용 체크 ────────────────────────────────────

export const checkInteractionTool = createTool({
  id: "check_ingredient_interaction",
  description:
    "두 가지 이상의 영양 성분 간 상호작용(충돌, 시너지)을 확인합니다. " +
    "복수 영양제 병용 시 안전성을 확인할 때 사용하세요.",
  inputSchema: z.object({
    ingredients: z.array(z.string()).min(2).describe(
      "확인할 성분 이름 목록 (최소 2개)",
    ),
  }),
  outputSchema: z.object({
    interactions: z.array(z.object({
      pair: z.string(),
      type: z.string(),
      description: z.string(),
      recommendation: z.string(),
    })),
    summary: z.string(),
  }),
  // deno-lint-ignore require-await
  execute: async (input) => {
    const { ingredients } = input;

    const interactions: {
      pair: string;
      type: string;
      description: string;
      recommendation: string;
    }[] = [];

    // 성분 이름 정규화 (한글/영문 매핑)
    const normalize = (name: string): string => {
      const lower = name.toLowerCase().trim();
      return INGREDIENT_NAME_MAPPING[lower] ?? name;
    };

    const normalized = ingredients.map(normalize);

    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const pair1 = `${normalized[i]}+${normalized[j]}`;
        const pair2 = `${normalized[j]}+${normalized[i]}`;
        const interaction = KNOWN_INTERACTIONS[pair1] ??
          KNOWN_INTERACTIONS[pair2];

        if (interaction) {
          interactions.push({
            pair: `${normalized[i]} + ${normalized[j]}`,
            ...interaction,
          });
        }
      }
    }

    const summary = interactions.length > 0
      ? `${
        ingredients.join(", ")
      } 간 ${interactions.length}개의 알려진 상호작용이 있습니다.`
      : `${
        ingredients.join(", ")
      } 간 알려진 주요 상호작용은 없습니다. 다만 개인 차이가 있으므로 전문가 상담을 권장합니다.`;

    return { interactions, summary };
  },
});

// ─── Tool 4: 복용법 안내 ───────────────────────────────────────────

export const getDosageGuideTool = createTool({
  id: "get_dosage_guide",
  description:
    "특정 영양 성분의 권장 복용량, 복용 시간, 주의사항을 안내합니다. " +
    "'비타민B12 얼마나 먹어야 해?', '마그네슘 복용법' 같은 질문에 사용하세요.",
  inputSchema: z.object({
    ingredient: z.string().trim().min(1).describe(
      "성분 이름 (예: 비타민B12, 마그네슘)",
    ),
  }),
  outputSchema: z.object({
    ingredient_name: z.string(),
    recommended_daily: z.string(),
    upper_limit: z.string(),
    best_time: z.string(),
    with_food: z.string(),
    precautions: z.array(z.string()),
    special_notes: z.string(),
  }),
  execute: async (input) => {
    const { ingredient } = input;

    const lower = ingredient.toLowerCase().trim();

    // 유사 매칭
    const matchKey = Object.keys(DOSAGE_GUIDES).find((key) => {
      const k = key.toLowerCase();
      return k.includes(lower) || lower.includes(k);
    });

    if (matchKey) {
      return DOSAGE_GUIDES[matchKey];
    }

    // DB에서 성분 정보 조회
    const escapedIngredient = escapeLike(ingredient);
    const { data } = await supabase
      .from("ingredients")
      .select("name, name_ko, description")
      .or(
        `name.ilike.%${escapedIngredient}%,name_ko.ilike.%${escapedIngredient}%`,
      )
      .limit(1)
      .single();

    if (data) {
      return {
        ingredient_name: `${data.name_ko} (${data.name})`,
        recommended_daily: "제품 라벨의 권장 용량을 따르세요.",
        upper_limit: "구체적인 상한 정보는 전문가와 상담하세요.",
        best_time: "제품 라벨의 안내를 참고하세요.",
        with_food: "일반적으로 식사와 함께 권장됩니다.",
        precautions: [
          "개인의 건강 상태에 따라 복용량이 달라질 수 있습니다",
          "다른 약물 복용 중이면 의사와 상담하세요",
        ],
        special_notes: data.description,
      };
    }

    return {
      ingredient_name: ingredient,
      recommended_daily: "해당 성분에 대한 구체적인 정보가 없습니다.",
      upper_limit: "전문가와 상담하세요.",
      best_time: "제품 라벨을 참고하세요.",
      with_food: "일반적으로 식사와 함께 권장됩니다.",
      precautions: ["정확한 복용 정보는 의료 전문가와 상담하세요."],
      special_notes: "",
    };
  },
});

// ─── Agent 정의 ────────────────────────────────────────────────────

const SYSTEM_INSTRUCTIONS =
  `당신은 'Agora Supplements'의 영양제 전문 상담사입니다.

역할:
- 사용자의 건강 고민과 증상을 듣고 적절한 영양제를 추천합니다.
- 추천 시 반드시 근거(성분, 함량, 임상 연구 수준)를 함께 제시합니다.
- 제품 추천 시 가격, 1일 비용, 인증 정보도 포함합니다.

규칙:
1. 의학적 진단이나 처방을 하지 마세요. "이 정보는 참고용이며, 전문가 상담을 권장합니다."를 적절히 포함하세요.
2. 데이터베이스에 있는 제품만 추천하세요. 없는 제품을 만들어내지 마세요.
3. 제품 추천 시 제품 페이지 링크를 포함하세요: /products/{slug} 형식
4. 성분 상호작용 질문에는 반드시 checkInteraction 도구를 사용하세요.
5. 복용법 질문에는 반드시 getDosageGuide 도구를 사용하세요.
6. 한국어로 응답하세요.
7. 답변은 명확하고 구조적으로 작성하세요 (목록, 소제목 활용).
8. 비교 요청 시에는 표 형태로 정리해 주세요.`;

export const supplementAgent = new Agent({
  id: "supplement-advisor",
  name: "supplement-advisor",
  instructions: SYSTEM_INSTRUCTIONS,
  model: MASTRA_MODEL,
  tools: {
    searchProducts: searchProductsTool,
    searchBySymptom: searchBySymptomTool,
    checkInteraction: checkInteractionTool,
    getDosageGuide: getDosageGuideTool,
  },
});
