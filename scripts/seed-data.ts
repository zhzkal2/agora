import "@std/dotenv/load";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.");
  Deno.exit(1);
}

// 운영 DB 보호: --allow-seed 플래그 없이 실행 시 확인 프롬프트
if (!Deno.args.includes("--allow-seed")) {
  console.warn(`\n⚠️  대상 DB: ${supabaseUrl}`);
  console.warn("이 스크립트는 기존 데이터를 삭제하고 시드 데이터를 삽입합니다.");
  console.warn("운영 환경이 아닌지 확인하세요. 확인 후 --allow-seed 플래그를 추가하여 실행하세요.\n");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log("=== AIEO MVP 목 데이터 시딩 ===\n");

// 1. 브랜드 4개
console.log("1. 브랜드 시딩...");
const { data: brands, error: brandsErr } = await supabase
  .from("brands")
  .upsert([
    {
      name: "VitaCore Labs",
      slug: "vitacore-labs",
      origin: "USA",
      concept: "미국풍, 고함량 프리미엄",
    },
    {
      name: "NutriZen",
      slug: "nutrizen",
      origin: "USA",
      concept: "자연주의, 활성형",
    },
    {
      name: "BioPlus Health",
      slug: "bioplus-health",
      origin: "USA",
      concept: "가성비, 대용량",
    },
    {
      name: "MediPure Labs",
      slug: "medipure-labs",
      origin: "USA",
      concept: "의약품급 GMP",
    },
  ], { onConflict: "slug" })
  .select();

if (brandsErr) {
  console.error("  브랜드 시딩 실패:", brandsErr.message);
  Deno.exit(1);
}
console.log(`  ${brands.length}개 브랜드 완료`);

// 브랜드 ID 맵
const brandMap = Object.fromEntries(brands.map((b) => [b.slug, b.id]));

// 2. 성분
console.log("2. 성분 시딩...");
// 기존 데이터 삭제 후 재삽입
await supabase.from("ingredient_symptoms").delete().neq("id", "");
await supabase.from("product_ingredients").delete().neq("id", "");
await supabase.from("ingredients").delete().neq("id", "");

const { data: ingredients, error: ingredientsErr } = await supabase
  .from("ingredients")
  .insert([
    {
      name: "Vitamin B1 (Thiamine)",
      name_ko: "비타민 B1 (티아민)",
      category: "vitamin",
      description: "탄수화물 대사에 필수. 에너지 생성과 신경계 기능 지원.",
    },
    {
      name: "Vitamin B6 (P-5-P)",
      name_ko: "비타민 B6 (피리독살 5-인산)",
      category: "vitamin",
      description:
        "활성형 B6. 아미노산 대사, 신경전달물질 합성, 면역 기능 지원.",
    },
    {
      name: "Vitamin B12 (Methylcobalamin)",
      name_ko: "비타민 B12 (메틸코발라민)",
      category: "vitamin",
      description:
        "활성형 B12. 적혈구 생성, DNA 합성, 신경 건강. 채식인에게 필수 보충.",
    },
    {
      name: "Folate (Methylfolate)",
      name_ko: "엽산 (메틸폴레이트)",
      category: "vitamin",
      description:
        "활성형 엽산. 세포 분열, DNA 합성. MTHFR 변이가 있어도 흡수 가능.",
    },
    {
      name: "Biotin",
      name_ko: "비오틴",
      category: "vitamin",
      description: "모발, 피부, 손톱 건강 지원. 지방산 합성과 에너지 대사에 관여.",
    },
    {
      name: "Pantothenic Acid (B5)",
      name_ko: "판토텐산 (B5)",
      category: "vitamin",
      description:
        "CoA 합성에 필수. 에너지 대사, 호르몬 합성, 스트레스 대응 지원.",
    },
    {
      name: "Magnesium Glycinate",
      name_ko: "마그네슘 글리시네이트",
      category: "mineral",
      description:
        "흡수율 높은 킬레이트 형태. 근육 이완, 수면 개선, 스트레스 완화.",
    },
    {
      name: "Vitamin D3",
      name_ko: "비타민 D3",
      category: "vitamin",
      description: "면역력 강화, 칼슘 흡수 촉진, 뼈 건강. 실내 생활이 많은 현대인에게 필수.",
    },
  ])
  .select();

if (ingredientsErr) {
  console.error("  성분 시딩 실패:", ingredientsErr.message);
  Deno.exit(1);
}
console.log(`  ${ingredients.length}개 성분 완료`);

const ingredientMap = Object.fromEntries(
  ingredients.map((i) => [i.name, i.id]),
);

// 3. 제품
console.log("3. 제품 시딩...");
await supabase.from("products").delete().neq("id", "");

const productsData = [
  {
    brand_id: brandMap["vitacore-labs"],
    name: "VitaCore B-Complex Ultra 3000",
    slug: "vitacore-b-complex-ultra-3000",
    subtitle: "고함량 활성형 비타민B 콤플렉스",
    description:
      "VitaCore Labs B-Complex Ultra 3000은 활성형 비타민B군 복합 영양제입니다. 메틸코발라민 형태의 B12를 3000mcg, P-5-P 형태의 B6를 100mg 함유하여 체내 흡수율이 일반 비타민B 대비 높습니다. 1캡슐당 90일분이며 GMP, NSF 인증을 받았습니다.",
    price: 28.99,
    serving_size: "1캡슐",
    servings_per_container: 90,
    form: "캡슐",
    certification: ["GMP", "NSF", "Vegan"],
    rating: 4.7,
    review_count: 342,
  },
  {
    brand_id: brandMap["nutrizen"],
    name: "NutriZen Active B-Complex",
    slug: "nutrizen-active-b-complex",
    subtitle: "자연 유래 활성형 비타민B",
    description:
      "NutriZen Active B-Complex는 자연 유래 원료로 만든 활성형 비타민B군입니다. 메틸코발라민 B12 1000mcg, 메틸폴레이트 400mcg 함유. 유기농 인증 원료 사용.",
    price: 22.99,
    serving_size: "1캡슐",
    servings_per_container: 60,
    form: "캡슐",
    certification: ["USDA Organic", "Non-GMO", "Vegan"],
    rating: 4.5,
    review_count: 218,
  },
  {
    brand_id: brandMap["bioplus-health"],
    name: "BioPlus Mega B-50",
    slug: "bioplus-mega-b-50",
    subtitle: "대용량 가성비 비타민B",
    description:
      "BioPlus Mega B-50은 주요 B군 비타민을 각 50mg씩 균형있게 배합한 대용량 제품입니다. 250캡슐 8개월분. GMP 시설 제조.",
    price: 15.99,
    serving_size: "1캡슐",
    servings_per_container: 250,
    form: "정제",
    certification: ["GMP"],
    rating: 4.3,
    review_count: 567,
  },
  {
    brand_id: brandMap["medipure-labs"],
    name: "MediPure Clinical B-Complex",
    slug: "medipure-clinical-b-complex",
    subtitle: "의약품급 고순도 비타민B",
    description:
      "MediPure Clinical B-Complex는 의약품 수준의 GMP 시설에서 제조된 고순도 비타민B군입니다. B12 2000mcg (시아노코발라민), B6 50mg 함유. 의료진 추천 제품.",
    price: 34.99,
    serving_size: "1캡슐",
    servings_per_container: 120,
    form: "캡슐",
    certification: ["GMP", "NSF", "USP"],
    rating: 4.8,
    review_count: 156,
  },
  {
    brand_id: brandMap["vitacore-labs"],
    name: "VitaCore Magnesium Plus",
    slug: "vitacore-magnesium-plus",
    subtitle: "고흡수 마그네슘 글리시네이트",
    description:
      "VitaCore Magnesium Plus는 마그네슘 글리시네이트 400mg을 함유한 고흡수 마그네슘입니다. 수면 개선, 근육 이완, 스트레스 완화에 도움.",
    price: 24.99,
    serving_size: "2캡슐",
    servings_per_container: 60,
    form: "캡슐",
    certification: ["GMP", "Vegan"],
    rating: 4.6,
    review_count: 289,
  },
];

const { data: products, error: productsErr } = await supabase
  .from("products")
  .insert(productsData)
  .select();

if (productsErr) {
  console.error("  제품 시딩 실패:", productsErr.message);
  Deno.exit(1);
}
console.log(`  ${products.length}개 제품 완료`);

const productMap = Object.fromEntries(products.map((p) => [p.slug, p.id]));

// 4. 제품-성분 매핑
console.log("4. 제품-성분 매핑 시딩...");
const piData = [
  // VitaCore B-Complex
  { product_id: productMap["vitacore-b-complex-ultra-3000"], ingredient_id: ingredientMap["Vitamin B1 (Thiamine)"], amount: 100, unit: "mg", daily_value_pct: 8333, form: "티아민 HCl" },
  { product_id: productMap["vitacore-b-complex-ultra-3000"], ingredient_id: ingredientMap["Vitamin B6 (P-5-P)"], amount: 100, unit: "mg", daily_value_pct: 5882, form: "피리독살 5-인산" },
  { product_id: productMap["vitacore-b-complex-ultra-3000"], ingredient_id: ingredientMap["Vitamin B12 (Methylcobalamin)"], amount: 3000, unit: "mcg", daily_value_pct: 125000, form: "메틸코발라민" },
  { product_id: productMap["vitacore-b-complex-ultra-3000"], ingredient_id: ingredientMap["Folate (Methylfolate)"], amount: 800, unit: "mcg", daily_value_pct: 200, form: "메틸폴레이트" },
  { product_id: productMap["vitacore-b-complex-ultra-3000"], ingredient_id: ingredientMap["Biotin"], amount: 5000, unit: "mcg", daily_value_pct: 16667, form: "D-비오틴" },
  { product_id: productMap["vitacore-b-complex-ultra-3000"], ingredient_id: ingredientMap["Pantothenic Acid (B5)"], amount: 500, unit: "mg", daily_value_pct: 10000, form: "판토텐산 칼슘" },
  // NutriZen Active B-Complex
  { product_id: productMap["nutrizen-active-b-complex"], ingredient_id: ingredientMap["Vitamin B12 (Methylcobalamin)"], amount: 1000, unit: "mcg", daily_value_pct: 41667, form: "메틸코발라민" },
  { product_id: productMap["nutrizen-active-b-complex"], ingredient_id: ingredientMap["Folate (Methylfolate)"], amount: 400, unit: "mcg", daily_value_pct: 100, form: "메틸폴레이트" },
  { product_id: productMap["nutrizen-active-b-complex"], ingredient_id: ingredientMap["Vitamin B6 (P-5-P)"], amount: 25, unit: "mg", daily_value_pct: 1471, form: "피리독살 5-인산" },
  // BioPlus Mega B-50
  { product_id: productMap["bioplus-mega-b-50"], ingredient_id: ingredientMap["Vitamin B1 (Thiamine)"], amount: 50, unit: "mg", daily_value_pct: 4167, form: "티아민 HCl" },
  { product_id: productMap["bioplus-mega-b-50"], ingredient_id: ingredientMap["Vitamin B6 (P-5-P)"], amount: 50, unit: "mg", daily_value_pct: 2941, form: "피리독신 HCl" },
  { product_id: productMap["bioplus-mega-b-50"], ingredient_id: ingredientMap["Vitamin B12 (Methylcobalamin)"], amount: 50, unit: "mcg", daily_value_pct: 2083, form: "시아노코발라민" },
  // MediPure Clinical B-Complex
  { product_id: productMap["medipure-clinical-b-complex"], ingredient_id: ingredientMap["Vitamin B12 (Methylcobalamin)"], amount: 2000, unit: "mcg", daily_value_pct: 83333, form: "시아노코발라민" },
  { product_id: productMap["medipure-clinical-b-complex"], ingredient_id: ingredientMap["Vitamin B6 (P-5-P)"], amount: 50, unit: "mg", daily_value_pct: 2941, form: "피리독신 HCl" },
  { product_id: productMap["medipure-clinical-b-complex"], ingredient_id: ingredientMap["Folate (Methylfolate)"], amount: 1000, unit: "mcg", daily_value_pct: 250, form: "엽산" },
  // VitaCore Magnesium Plus
  { product_id: productMap["vitacore-magnesium-plus"], ingredient_id: ingredientMap["Magnesium Glycinate"], amount: 400, unit: "mg", daily_value_pct: 95, form: "마그네슘 글리시네이트" },
];

const { data: piResult, error: piErr } = await supabase
  .from("product_ingredients")
  .insert(piData)
  .select();

if (piErr) {
  console.error("  제품-성분 매핑 실패:", piErr.message);
  Deno.exit(1);
}
console.log(`  ${piResult.length}개 매핑 완료`);

// 5. 증상
console.log("5. 증상 시딩...");
await supabase.from("symptoms").delete().neq("id", "");

const { data: symptoms, error: symptomsErr } = await supabase
  .from("symptoms")
  .insert([
    { name: "fatigue", name_ko: "피로회복", slug: "fatigue", description: "만성 피로, 무기력, 에너지 부족" },
    { name: "sleep", name_ko: "수면 개선", slug: "sleep", description: "불면증, 수면의 질 저하, 잠들기 어려움" },
    { name: "focus", name_ko: "집중력", slug: "focus", description: "집중력 저하, 브레인 포그, 인지 기능 저하" },
    { name: "immunity", name_ko: "면역력", slug: "immunity", description: "면역력 저하, 잦은 감기, 회복 지연" },
    { name: "stress", name_ko: "스트레스", slug: "stress", description: "스트레스, 불안, 긴장" },
  ])
  .select();

if (symptomsErr) {
  console.error("  증상 시딩 실패:", symptomsErr.message);
  Deno.exit(1);
}
console.log(`  ${symptoms.length}개 증상 완료`);

const symptomMap = Object.fromEntries(symptoms.map((s) => [s.slug, s.id]));

// 6. 성분-증상 매핑
console.log("6. 성분-증상 매핑 시딩...");
const isData = [
  { ingredient_id: ingredientMap["Vitamin B1 (Thiamine)"], symptom_id: symptomMap["fatigue"], relevance_score: 8, evidence_level: "strong" },
  { ingredient_id: ingredientMap["Vitamin B6 (P-5-P)"], symptom_id: symptomMap["fatigue"], relevance_score: 7, evidence_level: "strong" },
  { ingredient_id: ingredientMap["Vitamin B6 (P-5-P)"], symptom_id: symptomMap["focus"], relevance_score: 7, evidence_level: "moderate" },
  { ingredient_id: ingredientMap["Vitamin B6 (P-5-P)"], symptom_id: symptomMap["immunity"], relevance_score: 6, evidence_level: "moderate" },
  { ingredient_id: ingredientMap["Vitamin B12 (Methylcobalamin)"], symptom_id: symptomMap["fatigue"], relevance_score: 9, evidence_level: "strong" },
  { ingredient_id: ingredientMap["Vitamin B12 (Methylcobalamin)"], symptom_id: symptomMap["focus"], relevance_score: 8, evidence_level: "strong" },
  { ingredient_id: ingredientMap["Folate (Methylfolate)"], symptom_id: symptomMap["fatigue"], relevance_score: 7, evidence_level: "strong" },
  { ingredient_id: ingredientMap["Biotin"], symptom_id: symptomMap["fatigue"], relevance_score: 5, evidence_level: "moderate" },
  { ingredient_id: ingredientMap["Pantothenic Acid (B5)"], symptom_id: symptomMap["stress"], relevance_score: 7, evidence_level: "moderate" },
  { ingredient_id: ingredientMap["Pantothenic Acid (B5)"], symptom_id: symptomMap["fatigue"], relevance_score: 6, evidence_level: "moderate" },
  { ingredient_id: ingredientMap["Magnesium Glycinate"], symptom_id: symptomMap["sleep"], relevance_score: 9, evidence_level: "strong" },
  { ingredient_id: ingredientMap["Magnesium Glycinate"], symptom_id: symptomMap["stress"], relevance_score: 8, evidence_level: "strong" },
  { ingredient_id: ingredientMap["Vitamin D3"], symptom_id: symptomMap["immunity"], relevance_score: 9, evidence_level: "strong" },
  { ingredient_id: ingredientMap["Vitamin D3"], symptom_id: symptomMap["fatigue"], relevance_score: 6, evidence_level: "moderate" },
];

const { data: isResult, error: isErr } = await supabase
  .from("ingredient_symptoms")
  .insert(isData)
  .select();

if (isErr) {
  console.error("  성분-증상 매핑 실패:", isErr.message);
  Deno.exit(1);
}
console.log(`  ${isResult.length}개 매핑 완료`);

console.log("\n=== 시딩 완료! ===");
