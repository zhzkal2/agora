/**
 * 실제 영양제 제품 추가 시드 스크립트
 * 기존 가짜 데이터는 유지하고 실제 브랜드/제품을 추가 (8:2 비율)
 *
 * 실행: deno run -A scripts/seed-real-products.ts --allow-seed
 */
import "@std/dotenv/load";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.",
  );
  Deno.exit(1);
}

if (!Deno.args.includes("--allow-seed")) {
  console.warn(`\n⚠️  대상 DB: ${supabaseUrl}`);
  console.warn(
    "이 스크립트는 기존 데이터를 유지하면서 실제 제품 데이터를 추가합니다.",
  );
  console.warn("확인 후 --allow-seed 플래그를 추가하여 실행하세요.\n");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log("=== 실제 제품 데이터 추가 시딩 시작 ===\n");

// ─── 1. 실제 브랜드 추가 (기존 가짜 브랜드 유지) ───
console.log("1. 브랜드 추가...");
const { data: brands, error: brandsErr } = await supabase
  .from("brands")
  .upsert([
    {
      name: "Thorne",
      slug: "thorne",
      origin: "USA",
      concept:
        "의료 전문가급 프리미엄 영양제. NSF Certified for Sport 인증으로 운동선수와 전문가에게 신뢰받는 브랜드.",
    },
    {
      name: "NOW Foods",
      slug: "now-foods",
      origin: "USA",
      concept:
        "1968년 설립. 가성비와 품질의 균형으로 미국에서 가장 많이 판매되는 영양제 브랜드 중 하나.",
    },
    {
      name: "Jarrow Formulas",
      slug: "jarrow-formulas",
      origin: "USA",
      concept:
        "과학 기반 포뮬레이션. 활성형 성분과 특허 원료를 적극 활용하는 혁신적 브랜드.",
    },
    {
      name: "Life Extension",
      slug: "life-extension",
      origin: "USA",
      concept:
        "1980년 설립. 최신 과학 연구를 기반으로 한 프리미엄 영양제. 자체 연구소 보유.",
    },
    {
      name: "Doctor's Best",
      slug: "doctors-best",
      origin: "USA",
      concept:
        "과학 기반 영양제. Albion 특허 킬레이트 미네랄 등 검증된 원료를 합리적 가격에 제공.",
    },
    {
      name: "Nordic Naturals",
      slug: "nordic-naturals",
      origin: "Norway",
      concept:
        "노르웨이산 프리미엄 오메가-3 전문 브랜드. Friend of the Sea 인증. 순도와 신선도 업계 최고 수준.",
    },
    {
      name: "Garden of Life",
      slug: "garden-of-life",
      origin: "USA",
      concept:
        "유기농 홀푸드 영양제 선두 브랜드. USDA Organic, Non-GMO Project Verified 인증.",
    },
    {
      name: "California Gold Nutrition",
      slug: "california-gold-nutrition",
      origin: "USA",
      concept:
        "iHerb 자체 브랜드. 고품질 원료를 가장 합리적인 가격에 제공. GMP 인증 시설 제조.",
    },
  ])
  .select();

if (brandsErr) {
  console.error("  브랜드 추가 실패:", brandsErr.message);
  Deno.exit(1);
}
console.log(`  ${brands.length}개 브랜드 추가 완료`);
const brandMap = Object.fromEntries(brands.map((b) => [b.slug, b.id]));

// ─── 2. 새 성분 추가 (기존 성분 유지) ───
console.log("2. 성분 추가...");
const { data: ingredients, error: ingredientsErr } = await supabase
  .from("ingredients")
  .upsert([
    {
      name: "Vitamin B1 (Thiamine)",
      name_ko: "비타민 B1 (티아민)",
      category: "vitamin",
      description:
        "탄수화물 대사에 필수적인 조효소. 에너지 생성과 신경계 기능을 지원합니다.",
    },
    {
      name: "Vitamin B2 (Riboflavin)",
      name_ko: "비타민 B2 (리보플라빈)",
      category: "vitamin",
      description:
        "에너지 대사의 핵심 조효소(FAD, FMN). 세포 성장, 피부·점막 건강, 항산화에 관여합니다.",
    },
    {
      name: "Vitamin B3 (Niacin)",
      name_ko: "비타민 B3 (나이아신)",
      category: "vitamin",
      description:
        "NAD/NADP 합성에 필수. 에너지 대사, DNA 수복, 세포 신호전달에 관여합니다.",
    },
    {
      name: "Vitamin B5 (Pantothenic Acid)",
      name_ko: "비타민 B5 (판토텐산)",
      category: "vitamin",
      description:
        "CoA 합성에 필수. 에너지 대사, 호르몬 합성, 스트레스 대응을 지원합니다.",
    },
    {
      name: "Vitamin B6 (Pyridoxine/P-5-P)",
      name_ko: "비타민 B6 (피리독신/P-5-P)",
      category: "vitamin",
      description:
        "아미노산 대사, 신경전달물질(세로토닌, 도파민) 합성, 면역 기능을 지원합니다. P-5-P는 활성형입니다.",
    },
    {
      name: "Vitamin B12 (Methylcobalamin)",
      name_ko: "비타민 B12 (메틸코발라민)",
      category: "vitamin",
      description:
        "활성형 B12. 적혈구 생성, DNA 합성, 신경 건강에 필수. 채식인은 반드시 보충이 필요합니다.",
    },
    {
      name: "Folate (5-MTHF)",
      name_ko: "엽산 (5-MTHF)",
      category: "vitamin",
      description:
        "활성형 엽산(메틸폴레이트). 세포 분열, DNA 합성에 필수. MTHFR 변이가 있어도 흡수 가능합니다.",
    },
    {
      name: "Biotin",
      name_ko: "비오틴",
      category: "vitamin",
      description:
        "모발, 피부, 손톱 건강을 지원합니다. 지방산 합성과 에너지 대사에도 관여합니다.",
    },
    {
      name: "Magnesium Glycinate",
      name_ko: "마그네슘 글리시네이트",
      category: "mineral",
      description:
        "아미노산 글리신과 킬레이트 결합한 고흡수 마그네슘. 근육 이완, 수면 개선, 스트레스 완화에 도움을 줍니다.",
    },
    {
      name: "Magnesium Citrate",
      name_ko: "마그네슘 시트레이트",
      category: "mineral",
      description:
        "구연산과 결합한 마그네슘. 흡수율이 비교적 높고 가격이 합리적. 300가지 이상 효소 반응에 필수입니다.",
    },
    {
      name: "Vitamin D3 (Cholecalciferol)",
      name_ko: "비타민 D3 (콜레칼시페롤)",
      category: "vitamin",
      description:
        "면역력 강화, 칼슘 흡수 촉진, 뼈 건강에 필수. 한국인의 약 75%가 비타민D 부족 상태입니다.",
    },
    {
      name: "Vitamin K2 (MK-7)",
      name_ko: "비타민 K2 (MK-7)",
      category: "vitamin",
      description:
        "칼슘을 뼈로 운반하고 혈관 석회화를 방지합니다. 비타민 D3와 함께 복용하면 시너지 효과가 있습니다.",
    },
    {
      name: "EPA (Eicosapentaenoic Acid)",
      name_ko: "EPA (에이코사펜타엔산)",
      category: "omega_3",
      description:
        "오메가-3 지방산. 항염증 작용이 강하며 심혈관 건강, 관절 건강, 기분 개선에 도움을 줍니다.",
    },
    {
      name: "DHA (Docosahexaenoic Acid)",
      name_ko: "DHA (도코사헥사엔산)",
      category: "omega_3",
      description:
        "오메가-3 지방산. 뇌세포막의 핵심 구성성분. 인지 기능, 기억력, 시력 건강에 필수적입니다.",
    },
    {
      name: "Vitamin C (Ascorbic Acid)",
      name_ko: "비타민 C (아스코르브산)",
      category: "vitamin",
      description:
        "강력한 항산화제. 면역세포 기능 강화, 콜라겐 합성, 철분 흡수 촉진에 필수적입니다.",
    },
    {
      name: "Zinc",
      name_ko: "아연",
      category: "mineral",
      description:
        "면역세포 발달과 기능에 핵심적인 미네랄. 상처 치유, 단백질 합성, DNA 합성에도 관여합니다.",
    },
    {
      name: "Lactobacillus/Bifidobacterium Complex",
      name_ko: "유산균 복합체",
      category: "probiotic",
      description:
        "장내 유익균을 보충하여 장 건강과 면역 기능을 개선합니다. 소화 흡수, 비타민 합성에도 관여합니다.",
    },
  ])
  .select();

if (ingredientsErr) {
  console.error("  성분 추가 실패:", ingredientsErr.message);
  Deno.exit(1);
}
console.log(`  ${ingredients.length}개 성분 추가 완료`);
const ingredientMap = Object.fromEntries(
  ingredients.map((i) => [i.name, i.id]),
);

// ─── 3. 실제 제품 추가 ───
console.log("3. 실제 제품 추가...");
const productsData = [
  // === B-Complex ===
  {
    brand_id: brandMap["thorne"],
    name: "Thorne B-Complex #12",
    slug: "thorne-b-complex-12",
    subtitle: "의료 전문가급 활성형 비타민B 복합제",
    description:
      "Thorne B-Complex #12은 활성형 비타민B군을 의약품급 기준으로 배합한 프리미엄 제품입니다. 메틸코발라민 B12 600mcg, 활성형 엽산(5-MTHF) 1000mcg DFE, P-5-P 형태의 B6 22.5mg을 포함합니다. NSF Certified for Sport 인증을 받아 운동선수도 안심하고 복용할 수 있습니다. Thorne은 미국의 의료진이 가장 많이 추천하는 영양제 브랜드입니다.",
    price: 21.00,
    serving_size: "1캡슐",
    servings_per_container: 60,
    form: "캡슐",
    certification: ["NSF Certified for Sport", "GMP"],
    image_url: "/images/products/thorne-b-complex-12.webp",
    affiliate_url:
      "https://www.iherb.com/pr/thorne-b-complex-12-60-capsules/18126",
    rating: 4.7,
    review_count: 1842,
  },
  {
    brand_id: brandMap["now-foods"],
    name: "NOW Foods B-50",
    slug: "now-foods-b-50",
    subtitle: "균형 잡힌 B군 비타민 50mg 복합제",
    description:
      "NOW Foods B-50은 주요 B군 비타민을 각 50mg씩 균형 있게 배합한 가성비 제품입니다. 100캡슐에 $9 미만의 합리적 가격이며, GMP 인증 시설에서 제조됩니다. 1968년부터 이어온 NOW Foods의 품질 관리 노하우가 담겨 있습니다. B군 비타민 입문용으로 가장 많이 추천되는 제품입니다.",
    price: 8.99,
    serving_size: "1캡슐",
    servings_per_container: 100,
    form: "캡슐",
    certification: ["GMP", "Non-GMO"],
    image_url: "/images/products/now-foods-b-50.webp",
    affiliate_url:
      "https://www.iherb.com/pr/now-foods-b-50-100-veg-capsules/39670",
    rating: 4.6,
    review_count: 3215,
  },
  {
    brand_id: brandMap["jarrow-formulas"],
    name: "Jarrow Formulas B-Right",
    slug: "jarrow-formulas-b-right",
    subtitle: "최적화된 활성형 비타민B 콤플렉스",
    description:
      "Jarrow Formulas B-Right는 각 B군 비타민의 최적 형태를 선별하여 배합한 프리미엄 제품입니다. 메틸코발라민 B12 100mcg, Quatrefolic® 브랜드 메틸폴레이트 400mcg, P-5-P 형태 B6 25mg을 포함합니다. 판토텐산, 비오틴, 나이아신도 적정 함량으로 포함되어 균형 잡힌 포뮬러를 제공합니다.",
    price: 14.49,
    serving_size: "1캡슐",
    servings_per_container: 100,
    form: "캡슐",
    certification: ["GMP", "Non-GMO"],
    image_url: "/images/products/jarrow-formulas-b-right.webp",
    affiliate_url:
      "https://www.iherb.com/pr/jarrow-formulas-b-right-100-veggie-capsules/110",
    rating: 4.6,
    review_count: 2108,
  },
  {
    brand_id: brandMap["life-extension"],
    name: "Life Extension BioActive Complete B-Complex",
    slug: "life-extension-bioactive-b-complex",
    subtitle: "효소 활성형 B군 비타민 복합제",
    description:
      "Life Extension BioActive Complete B-Complex는 체내에서 즉시 사용 가능한 효소 활성형 B군 비타민을 함유합니다. 5-MTHF 엽산 400mcg, 메틸코발라민 B12 300mcg, P-5-P B6 100mg이 포함됩니다. Life Extension의 40년 이상 과학 연구 경험이 반영된 최적 포뮬러입니다.",
    price: 12.00,
    serving_size: "2캡슐",
    servings_per_container: 30,
    form: "캡슐",
    certification: ["GMP", "Non-GMO"],
    image_url: "/images/products/life-extension-bioactive-b-complex.webp",
    affiliate_url:
      "https://www.iherb.com/pr/life-extension-bioactive-complete-b-complex-60-vegetarian-capsules/67051",
    rating: 4.7,
    review_count: 987,
  },
  {
    brand_id: brandMap["garden-of-life"],
    name: "Garden of Life Vitamin Code Raw B-Complex",
    slug: "garden-of-life-raw-b-complex",
    subtitle: "유기농 홀푸드 비타민B 복합제",
    description:
      "Garden of Life Vitamin Code Raw B-Complex는 23가지 유기농 과일·채소에서 추출한 홀푸드 비타민B군입니다. 열을 가하지 않는 RAW 공법으로 영양소를 보존합니다. USDA Organic, Non-GMO Project Verified 인증. 유산균과 효소도 함께 포함되어 소화 흡수를 돕습니다.",
    price: 22.79,
    serving_size: "2캡슐",
    servings_per_container: 30,
    form: "캡슐",
    certification: ["USDA Organic", "Non-GMO", "Vegan"],
    image_url: "/images/products/garden-of-life-raw-b-complex.webp",
    affiliate_url:
      "https://www.iherb.com/pr/garden-of-life-vitamin-code-raw-b-complex-120-vegan-capsules/46039",
    rating: 4.5,
    review_count: 1456,
  },

  // === Magnesium ===
  {
    brand_id: brandMap["doctors-best"],
    name: "Doctor's Best High Absorption Magnesium",
    slug: "doctors-best-magnesium-glycinate",
    subtitle: "Albion 특허 킬레이트 고흡수 마그네슘",
    description:
      "Doctor's Best High Absorption Magnesium은 Albion® TRAACS® 특허 기술로 만든 마그네슘 글리시네이트/라이시네이트 킬레이트입니다. 2정당 마그네슘 200mg 함유. 일반 산화마그네슘 대비 흡수율이 월등히 높으며, 위장 불편감이 적습니다. 근육 이완, 수면 개선, 스트레스 완화에 도움을 줍니다.",
    price: 14.54,
    serving_size: "2정",
    servings_per_container: 120,
    form: "정제",
    certification: ["GMP", "Vegan", "Non-GMO"],
    image_url: "/images/products/doctors-best-magnesium-glycinate.webp",
    affiliate_url:
      "https://www.iherb.com/pr/doctor-s-best-high-absorption-magnesium-120-tablets/15",
    rating: 4.7,
    review_count: 5623,
  },
  {
    brand_id: brandMap["now-foods"],
    name: "NOW Foods Magnesium Glycinate",
    slug: "now-foods-magnesium-glycinate",
    subtitle: "고흡수 마그네슘 글리시네이트 200mg",
    description:
      "NOW Foods Magnesium Glycinate는 킬레이트 형태의 마그네슘으로, 흡수율이 높고 위장 부담이 적습니다. 1정당 마그네슘 200mg을 제공합니다. 근육 긴장, 수면 문제, 스트레스에 도움이 필요한 분에게 적합합니다. GMP 인증 시설에서 제조됩니다.",
    price: 17.99,
    serving_size: "1정",
    servings_per_container: 180,
    form: "정제",
    certification: ["GMP", "Vegan", "Non-GMO"],
    image_url: "/images/products/now-foods-magnesium-glycinate.webp",
    affiliate_url:
      "https://www.iherb.com/pr/now-foods-magnesium-glycinate-180-tablets/88819",
    rating: 4.6,
    review_count: 2890,
  },
  {
    brand_id: brandMap["life-extension"],
    name: "Life Extension Magnesium Caps",
    slug: "life-extension-magnesium-caps",
    subtitle: "마그네슘 시트레이트 500mg 고함량",
    description:
      "Life Extension Magnesium Caps는 1캡슐당 마그네슘 500mg(산화마그네슘+시트레이트)을 제공하는 고함량 제품입니다. 뼈 건강, 심혈관 건강, 정상 혈압 유지를 지원합니다. 마그네슘을 충분히 보충하고 싶은 분에게 적합합니다.",
    price: 11.25,
    serving_size: "1캡슐",
    servings_per_container: 100,
    form: "캡슐",
    certification: ["GMP", "Non-GMO"],
    image_url: "/images/products/life-extension-magnesium-caps.webp",
    affiliate_url:
      "https://www.iherb.com/pr/life-extension-magnesium-caps-500-mg-100-vegetarian-capsules/48803",
    rating: 4.5,
    review_count: 1345,
  },

  // === Vitamin D ===
  {
    brand_id: brandMap["now-foods"],
    name: "NOW Foods Vitamin D-3 5000 IU",
    slug: "now-foods-vitamin-d3-5000iu",
    subtitle: "고함량 비타민D3 5000IU 소프트젤",
    description:
      "NOW Foods Vitamin D-3 5000 IU는 콜레칼시페롤 형태의 비타민D3를 소프트젤에 담은 제품입니다. 1일 1캡슐로 5000IU(125mcg)를 섭취할 수 있으며, 240캡슐로 8개월분입니다. 비타민D 결핍이 흔한 한국인에게 특히 추천됩니다. 면역력, 뼈 건강, 기분 개선에 도움을 줍니다.",
    price: 11.99,
    serving_size: "1소프트젤",
    servings_per_container: 240,
    form: "소프트젤",
    certification: ["GMP", "Non-GMO"],
    image_url: "/images/products/now-foods-vitamin-d3-5000iu.webp",
    affiliate_url:
      "https://www.iherb.com/pr/now-foods-vitamin-d-3-5-000-iu-120-softgels/10421",
    rating: 4.8,
    review_count: 8932,
  },
  {
    brand_id: brandMap["thorne"],
    name: "Thorne Vitamin D/K2 Liquid",
    slug: "thorne-vitamin-d-k2-liquid",
    subtitle: "비타민D3 + K2 리퀴드 드롭",
    description:
      "Thorne Vitamin D/K2 Liquid은 비타민D3 1000IU와 비타민K2(MK-7) 200mcg을 액상으로 제공합니다. D3와 K2를 함께 복용하면 칼슘이 뼈에 제대로 침착되고 혈관 석회화를 방지합니다. 1방울로 간편하게 복용 가능하며, 약 600회분이 들어 있습니다.",
    price: 25.00,
    serving_size: "2방울",
    servings_per_container: 600,
    form: "리퀴드",
    certification: ["NSF Certified for Sport", "GMP"],
    image_url: "/images/products/thorne-vitamin-d-k2-liquid.webp",
    affiliate_url:
      "https://www.iherb.com/pr/thorne-vitamin-d-k2-1-fl-oz-30-ml/23517",
    rating: 4.8,
    review_count: 2456,
  },

  // === Omega-3 ===
  {
    brand_id: brandMap["nordic-naturals"],
    name: "Nordic Naturals Ultimate Omega",
    slug: "nordic-naturals-ultimate-omega",
    subtitle: "고순도 오메가-3 EPA+DHA 1280mg",
    description:
      "Nordic Naturals Ultimate Omega는 노르웨이산 야생 어류에서 추출한 고순도 오메가-3입니다. 2소프트젤당 EPA 650mg + DHA 450mg = 총 1280mg을 제공합니다. Friend of the Sea 인증, 제3자 순도 검사 완료. 레몬향 코팅으로 비린내가 없습니다. 심혈관 건강, 뇌 기능, 관절 건강에 도움을 줍니다.",
    price: 27.46,
    serving_size: "2소프트젤",
    servings_per_container: 30,
    form: "소프트젤",
    certification: ["Friend of the Sea", "Non-GMO", "GMP"],
    image_url: "/images/products/nordic-naturals-ultimate-omega.webp",
    affiliate_url:
      "https://www.iherb.com/pr/nordic-naturals-ultimate-omega-120-soft-gels/4200",
    rating: 4.8,
    review_count: 6234,
  },
  {
    brand_id: brandMap["california-gold-nutrition"],
    name: "California Gold Nutrition Omega-3 Premium Fish Oil",
    slug: "cgn-omega-3-fish-oil",
    subtitle: "프리미엄 오메가-3 피쉬오일 180 EPA / 120 DHA",
    description:
      "California Gold Nutrition Omega-3는 분자 증류로 정제한 고순도 피쉬오일입니다. 1소프트젤당 EPA 180mg + DHA 120mg을 포함합니다. 240캡슐 대용량에 합리적 가격으로 오메가-3 입문용으로 적합합니다. IFOS 5성급 인증으로 순도와 신선도가 검증되었습니다.",
    price: 9.00,
    serving_size: "1소프트젤",
    servings_per_container: 240,
    form: "소프트젤",
    certification: ["IFOS 5-Star", "GMP", "Non-GMO"],
    image_url: "/images/products/cgn-omega-3-fish-oil.webp",
    affiliate_url:
      "https://www.iherb.com/pr/california-gold-nutrition-omega-3-premium-fish-oil-240-fish-gelatin-softgels/61856",
    rating: 4.5,
    review_count: 4567,
  },

  // === Probiotic ===
  {
    brand_id: brandMap["jarrow-formulas"],
    name: "Jarrow Formulas Jarro-Dophilus EPS",
    slug: "jarrow-formulas-jarro-dophilus-eps",
    subtitle: "장용성 코팅 8균주 50억 CFU 유산균",
    description:
      "Jarrow Formulas Jarro-Dophilus EPS는 EnteroGuard® 장용성 코팅으로 위산에 파괴되지 않고 장까지 도달하는 프로바이오틱스입니다. 8가지 유익균주 50억 CFU를 함유합니다. 냉장 보관이 필요 없는 상온 안정형(Room Temperature Stable)으로 휴대가 편리합니다.",
    price: 22.46,
    serving_size: "1캡슐",
    servings_per_container: 60,
    form: "캡슐",
    certification: ["GMP", "Non-GMO"],
    image_url: "/images/products/jarrow-formulas-jarro-dophilus-eps.webp",
    affiliate_url:
      "https://www.iherb.com/pr/jarrow-formulas-jarro-dophilus-eps-60-veggie-capsules/124",
    rating: 4.6,
    review_count: 3891,
  },

  // === Vitamin C + Zinc ===
  {
    brand_id: brandMap["now-foods"],
    name: "NOW Foods Vitamin C-1000",
    slug: "now-foods-vitamin-c-1000",
    subtitle: "비타민C 1000mg + 로즈힙",
    description:
      "NOW Foods Vitamin C-1000은 아스코르브산 형태의 비타민C 1000mg에 로즈힙을 추가한 제품입니다. 250정으로 약 8개월분이며 가성비가 뛰어납니다. 면역력 강화, 항산화, 콜라겐 합성에 필수적인 비타민C를 충분히 보충할 수 있습니다.",
    price: 12.99,
    serving_size: "1정",
    servings_per_container: 250,
    form: "정제",
    certification: ["GMP", "Non-GMO", "Vegan"],
    image_url: "/images/products/now-foods-vitamin-c-1000.webp",
    affiliate_url: "https://www.iherb.com/pr/now-foods-c-1000-250-tablets/685",
    rating: 4.7,
    review_count: 7123,
  },
  {
    brand_id: brandMap["thorne"],
    name: "Thorne Zinc Picolinate 30mg",
    slug: "thorne-zinc-picolinate-30mg",
    subtitle: "고흡수 아연 피콜리네이트 30mg",
    description:
      "Thorne Zinc Picolinate는 흡수율이 높은 피콜리네이트 형태의 아연 30mg을 제공합니다. 아연은 면역 기능, 상처 치유, 단백질 합성에 필수적인 미네랄입니다. NSF Certified for Sport 인증으로 운동선수도 안심하고 복용할 수 있습니다.",
    price: 12.00,
    serving_size: "1캡슐",
    servings_per_container: 60,
    form: "캡슐",
    certification: ["NSF Certified for Sport", "GMP"],
    image_url: "/images/products/thorne-zinc-picolinate-30mg.webp",
    affiliate_url:
      "https://www.iherb.com/pr/thorne-zinc-picolinate-30-mg-60-capsules/18159",
    rating: 4.7,
    review_count: 1678,
  },
];

const { data: products, error: productsErr } = await supabase
  .from("products")
  .upsert(productsData, { onConflict: "slug" })
  .select();

if (productsErr) {
  console.error("  제품 추가 실패:", productsErr.message);
  Deno.exit(1);
}
console.log(`  ${products.length}개 실제 제품 추가 완료`);
const productMap = Object.fromEntries(products.map((p) => [p.slug, p.id]));

// ─── 4. 제품-성분 매핑 ───
console.log("4. 제품-성분 매핑...");
const piData = [
  // Thorne B-Complex #12
  {
    product_id: productMap["thorne-b-complex-12"],
    ingredient_id: ingredientMap["Vitamin B1 (Thiamine)"],
    amount: 40,
    unit: "mg",
    daily_value_pct: 3333,
    form: "티아민 HCl",
  },
  {
    product_id: productMap["thorne-b-complex-12"],
    ingredient_id: ingredientMap["Vitamin B2 (Riboflavin)"],
    amount: 6.5,
    unit: "mg",
    daily_value_pct: 500,
    form: "리보플라빈 5'-인산",
  },
  {
    product_id: productMap["thorne-b-complex-12"],
    ingredient_id: ingredientMap["Vitamin B3 (Niacin)"],
    amount: 160,
    unit: "mg",
    daily_value_pct: 1000,
    form: "나이아신아마이드",
  },
  {
    product_id: productMap["thorne-b-complex-12"],
    ingredient_id: ingredientMap["Vitamin B5 (Pantothenic Acid)"],
    amount: 90,
    unit: "mg",
    daily_value_pct: 1800,
    form: "판토텐산 칼슘",
  },
  {
    product_id: productMap["thorne-b-complex-12"],
    ingredient_id: ingredientMap["Vitamin B6 (Pyridoxine/P-5-P)"],
    amount: 22.5,
    unit: "mg",
    daily_value_pct: 1324,
    form: "피리독살 5-인산 (P-5-P)",
  },
  {
    product_id: productMap["thorne-b-complex-12"],
    ingredient_id: ingredientMap["Vitamin B12 (Methylcobalamin)"],
    amount: 600,
    unit: "mcg",
    daily_value_pct: 25000,
    form: "메틸코발라민",
  },
  {
    product_id: productMap["thorne-b-complex-12"],
    ingredient_id: ingredientMap["Folate (5-MTHF)"],
    amount: 1000,
    unit: "mcg DFE",
    daily_value_pct: 250,
    form: "5-MTHF (메틸폴레이트)",
  },
  {
    product_id: productMap["thorne-b-complex-12"],
    ingredient_id: ingredientMap["Biotin"],
    amount: 450,
    unit: "mcg",
    daily_value_pct: 1500,
    form: "D-비오틴",
  },

  // NOW Foods B-50
  {
    product_id: productMap["now-foods-b-50"],
    ingredient_id: ingredientMap["Vitamin B1 (Thiamine)"],
    amount: 50,
    unit: "mg",
    daily_value_pct: 4167,
    form: "티아민 HCl",
  },
  {
    product_id: productMap["now-foods-b-50"],
    ingredient_id: ingredientMap["Vitamin B2 (Riboflavin)"],
    amount: 50,
    unit: "mg",
    daily_value_pct: 3846,
    form: "리보플라빈",
  },
  {
    product_id: productMap["now-foods-b-50"],
    ingredient_id: ingredientMap["Vitamin B3 (Niacin)"],
    amount: 50,
    unit: "mg",
    daily_value_pct: 313,
    form: "나이아신아마이드",
  },
  {
    product_id: productMap["now-foods-b-50"],
    ingredient_id: ingredientMap["Vitamin B5 (Pantothenic Acid)"],
    amount: 50,
    unit: "mg",
    daily_value_pct: 1000,
    form: "판토텐산 칼슘",
  },
  {
    product_id: productMap["now-foods-b-50"],
    ingredient_id: ingredientMap["Vitamin B6 (Pyridoxine/P-5-P)"],
    amount: 50,
    unit: "mg",
    daily_value_pct: 2941,
    form: "피리독신 HCl",
  },
  {
    product_id: productMap["now-foods-b-50"],
    ingredient_id: ingredientMap["Vitamin B12 (Methylcobalamin)"],
    amount: 50,
    unit: "mcg",
    daily_value_pct: 2083,
    form: "시아노코발라민",
  },
  {
    product_id: productMap["now-foods-b-50"],
    ingredient_id: ingredientMap["Folate (5-MTHF)"],
    amount: 400,
    unit: "mcg DFE",
    daily_value_pct: 100,
    form: "엽산",
  },
  {
    product_id: productMap["now-foods-b-50"],
    ingredient_id: ingredientMap["Biotin"],
    amount: 50,
    unit: "mcg",
    daily_value_pct: 167,
    form: "D-비오틴",
  },

  // Jarrow Formulas B-Right
  {
    product_id: productMap["jarrow-formulas-b-right"],
    ingredient_id: ingredientMap["Vitamin B1 (Thiamine)"],
    amount: 25,
    unit: "mg",
    daily_value_pct: 2083,
    form: "티아민 HCl",
  },
  {
    product_id: productMap["jarrow-formulas-b-right"],
    ingredient_id: ingredientMap["Vitamin B2 (Riboflavin)"],
    amount: 25,
    unit: "mg",
    daily_value_pct: 1923,
    form: "리보플라빈",
  },
  {
    product_id: productMap["jarrow-formulas-b-right"],
    ingredient_id: ingredientMap["Vitamin B3 (Niacin)"],
    amount: 25,
    unit: "mg",
    daily_value_pct: 156,
    form: "나이아신아마이드",
  },
  {
    product_id: productMap["jarrow-formulas-b-right"],
    ingredient_id: ingredientMap["Vitamin B5 (Pantothenic Acid)"],
    amount: 50,
    unit: "mg",
    daily_value_pct: 1000,
    form: "판토텐산 칼슘",
  },
  {
    product_id: productMap["jarrow-formulas-b-right"],
    ingredient_id: ingredientMap["Vitamin B6 (Pyridoxine/P-5-P)"],
    amount: 25,
    unit: "mg",
    daily_value_pct: 1471,
    form: "피리독살 5-인산 (P-5-P)",
  },
  {
    product_id: productMap["jarrow-formulas-b-right"],
    ingredient_id: ingredientMap["Vitamin B12 (Methylcobalamin)"],
    amount: 100,
    unit: "mcg",
    daily_value_pct: 4167,
    form: "메틸코발라민",
  },
  {
    product_id: productMap["jarrow-formulas-b-right"],
    ingredient_id: ingredientMap["Folate (5-MTHF)"],
    amount: 400,
    unit: "mcg DFE",
    daily_value_pct: 100,
    form: "Quatrefolic® (5-MTHF)",
  },
  {
    product_id: productMap["jarrow-formulas-b-right"],
    ingredient_id: ingredientMap["Biotin"],
    amount: 300,
    unit: "mcg",
    daily_value_pct: 1000,
    form: "D-비오틴",
  },

  // Life Extension BioActive B-Complex
  {
    product_id: productMap["life-extension-bioactive-b-complex"],
    ingredient_id: ingredientMap["Vitamin B6 (Pyridoxine/P-5-P)"],
    amount: 100,
    unit: "mg",
    daily_value_pct: 5882,
    form: "피리독살 5-인산 (P-5-P)",
  },
  {
    product_id: productMap["life-extension-bioactive-b-complex"],
    ingredient_id: ingredientMap["Vitamin B12 (Methylcobalamin)"],
    amount: 300,
    unit: "mcg",
    daily_value_pct: 12500,
    form: "메틸코발라민",
  },
  {
    product_id: productMap["life-extension-bioactive-b-complex"],
    ingredient_id: ingredientMap["Folate (5-MTHF)"],
    amount: 400,
    unit: "mcg DFE",
    daily_value_pct: 100,
    form: "5-MTHF",
  },
  {
    product_id: productMap["life-extension-bioactive-b-complex"],
    ingredient_id: ingredientMap["Vitamin B1 (Thiamine)"],
    amount: 100,
    unit: "mg",
    daily_value_pct: 8333,
    form: "벤포티아민 + 티아민 HCl",
  },
  {
    product_id: productMap["life-extension-bioactive-b-complex"],
    ingredient_id: ingredientMap["Biotin"],
    amount: 1000,
    unit: "mcg",
    daily_value_pct: 3333,
    form: "D-비오틴",
  },

  // Garden of Life Raw B-Complex
  {
    product_id: productMap["garden-of-life-raw-b-complex"],
    ingredient_id: ingredientMap["Vitamin B12 (Methylcobalamin)"],
    amount: 400,
    unit: "mcg",
    daily_value_pct: 16667,
    form: "메틸코발라민 (홀푸드)",
  },
  {
    product_id: productMap["garden-of-life-raw-b-complex"],
    ingredient_id: ingredientMap["Folate (5-MTHF)"],
    amount: 400,
    unit: "mcg DFE",
    daily_value_pct: 100,
    form: "홀푸드 엽산",
  },
  {
    product_id: productMap["garden-of-life-raw-b-complex"],
    ingredient_id: ingredientMap["Vitamin B6 (Pyridoxine/P-5-P)"],
    amount: 10,
    unit: "mg",
    daily_value_pct: 588,
    form: "피리독신 (홀푸드)",
  },

  // Doctor's Best Magnesium Glycinate
  {
    product_id: productMap["doctors-best-magnesium-glycinate"],
    ingredient_id: ingredientMap["Magnesium Glycinate"],
    amount: 200,
    unit: "mg",
    daily_value_pct: 48,
    form: "Albion® TRAACS® 마그네슘 글리시네이트/라이시네이트 킬레이트",
  },

  // NOW Foods Magnesium Glycinate
  {
    product_id: productMap["now-foods-magnesium-glycinate"],
    ingredient_id: ingredientMap["Magnesium Glycinate"],
    amount: 200,
    unit: "mg",
    daily_value_pct: 48,
    form: "마그네슘 비스글리시네이트",
  },

  // Life Extension Magnesium Caps
  {
    product_id: productMap["life-extension-magnesium-caps"],
    ingredient_id: ingredientMap["Magnesium Citrate"],
    amount: 500,
    unit: "mg",
    daily_value_pct: 119,
    form: "산화마그네슘 + 마그네슘 시트레이트",
  },

  // NOW Foods Vitamin D-3
  {
    product_id: productMap["now-foods-vitamin-d3-5000iu"],
    ingredient_id: ingredientMap["Vitamin D3 (Cholecalciferol)"],
    amount: 125,
    unit: "mcg",
    daily_value_pct: 625,
    form: "콜레칼시페롤 (5000 IU)",
  },

  // Thorne Vitamin D/K2
  {
    product_id: productMap["thorne-vitamin-d-k2-liquid"],
    ingredient_id: ingredientMap["Vitamin D3 (Cholecalciferol)"],
    amount: 25,
    unit: "mcg",
    daily_value_pct: 125,
    form: "콜레칼시페롤 (1000 IU)",
  },
  {
    product_id: productMap["thorne-vitamin-d-k2-liquid"],
    ingredient_id: ingredientMap["Vitamin K2 (MK-7)"],
    amount: 200,
    unit: "mcg",
    daily_value_pct: 167,
    form: "메나퀴논-7 (MK-7)",
  },

  // Nordic Naturals Ultimate Omega
  {
    product_id: productMap["nordic-naturals-ultimate-omega"],
    ingredient_id: ingredientMap["EPA (Eicosapentaenoic Acid)"],
    amount: 650,
    unit: "mg",
    daily_value_pct: 0,
    form: "트리글리세라이드",
  },
  {
    product_id: productMap["nordic-naturals-ultimate-omega"],
    ingredient_id: ingredientMap["DHA (Docosahexaenoic Acid)"],
    amount: 450,
    unit: "mg",
    daily_value_pct: 0,
    form: "트리글리세라이드",
  },

  // CGN Omega-3
  {
    product_id: productMap["cgn-omega-3-fish-oil"],
    ingredient_id: ingredientMap["EPA (Eicosapentaenoic Acid)"],
    amount: 180,
    unit: "mg",
    daily_value_pct: 0,
    form: "에틸에스테르",
  },
  {
    product_id: productMap["cgn-omega-3-fish-oil"],
    ingredient_id: ingredientMap["DHA (Docosahexaenoic Acid)"],
    amount: 120,
    unit: "mg",
    daily_value_pct: 0,
    form: "에틸에스테르",
  },

  // Jarrow Jarro-Dophilus EPS
  {
    product_id: productMap["jarrow-formulas-jarro-dophilus-eps"],
    ingredient_id: ingredientMap["Lactobacillus/Bifidobacterium Complex"],
    amount: 5,
    unit: "billion CFU",
    daily_value_pct: 0,
    form: "8균주 혼합 (EnteroGuard® 장용성 코팅)",
  },

  // NOW Foods Vitamin C-1000
  {
    product_id: productMap["now-foods-vitamin-c-1000"],
    ingredient_id: ingredientMap["Vitamin C (Ascorbic Acid)"],
    amount: 1000,
    unit: "mg",
    daily_value_pct: 1111,
    form: "아스코르브산 + 로즈힙",
  },

  // Thorne Zinc Picolinate
  {
    product_id: productMap["thorne-zinc-picolinate-30mg"],
    ingredient_id: ingredientMap["Zinc"],
    amount: 30,
    unit: "mg",
    daily_value_pct: 273,
    form: "아연 피콜리네이트",
  },
];

const validPiData = piData.filter((pi) => {
  if (!pi.product_id || !pi.ingredient_id) {
    console.warn("  ⚠️ 누락된 ID로 건너뜀:", JSON.stringify(pi));
    return false;
  }
  return true;
});
if (validPiData.length < piData.length) {
  console.warn(
    `  ${piData.length - validPiData.length}개 매핑이 누락된 ID로 제외됨`,
  );
}

const { data: piResult, error: piErr } = await supabase
  .from("product_ingredients")
  .insert(validPiData)
  .select();

if (piErr) {
  console.error("  제품-성분 매핑 실패:", piErr.message);
  Deno.exit(1);
}
console.log(`  ${piResult.length}개 매핑 완료`);

// ─── 5. 증상 (기존 유지, upsert) ───
console.log("5. 증상 확인...");
const { data: symptoms, error: symptomsErr } = await supabase
  .from("symptoms")
  .upsert([
    {
      name: "fatigue",
      name_ko: "피로회복",
      slug: "fatigue",
      description:
        "만성 피로, 무기력, 에너지 부족으로 일상생활에 지장을 느끼는 상태",
    },
    {
      name: "sleep",
      name_ko: "수면 개선",
      slug: "sleep",
      description: "불면증, 수면의 질 저하, 잠들기 어려움, 자주 깨는 수면 문제",
    },
    {
      name: "focus",
      name_ko: "집중력",
      slug: "focus",
      description: "집중력 저하, 브레인 포그, 인지 기능 저하, 기억력 감퇴",
    },
    {
      name: "immunity",
      name_ko: "면역력",
      slug: "immunity",
      description: "면역력 저하, 잦은 감기, 계절 변화에 약한 체질, 회복 지연",
    },
    {
      name: "stress",
      name_ko: "스트레스",
      slug: "stress",
      description: "만성 스트레스, 불안, 긴장, 정서적 피로감",
    },
  ], { onConflict: "slug" })
  .select();

if (symptomsErr) {
  console.error("  증상 확인 실패:", symptomsErr.message);
  Deno.exit(1);
}
console.log(`  ${symptoms.length}개 증상 확인 완료`);
const symptomMap = Object.fromEntries(symptoms.map((s) => [s.slug, s.id]));

// ─── 6. 성분-증상 매핑 ───
console.log("6. 성분-증상 매핑...");
const isData = [
  // B1 → 피로
  {
    ingredient_id: ingredientMap["Vitamin B1 (Thiamine)"],
    symptom_id: symptomMap["fatigue"],
    relevance_score: 8,
    evidence_level: "strong",
  },
  // B2 → 피로
  {
    ingredient_id: ingredientMap["Vitamin B2 (Riboflavin)"],
    symptom_id: symptomMap["fatigue"],
    relevance_score: 7,
    evidence_level: "strong",
  },
  // B3 → 피로, 집중
  {
    ingredient_id: ingredientMap["Vitamin B3 (Niacin)"],
    symptom_id: symptomMap["fatigue"],
    relevance_score: 7,
    evidence_level: "strong",
  },
  {
    ingredient_id: ingredientMap["Vitamin B3 (Niacin)"],
    symptom_id: symptomMap["focus"],
    relevance_score: 6,
    evidence_level: "moderate",
  },
  // B5 → 스트레스, 피로
  {
    ingredient_id: ingredientMap["Vitamin B5 (Pantothenic Acid)"],
    symptom_id: symptomMap["stress"],
    relevance_score: 7,
    evidence_level: "moderate",
  },
  {
    ingredient_id: ingredientMap["Vitamin B5 (Pantothenic Acid)"],
    symptom_id: symptomMap["fatigue"],
    relevance_score: 6,
    evidence_level: "moderate",
  },
  // B6 → 피로, 집중, 면역, 스트레스
  {
    ingredient_id: ingredientMap["Vitamin B6 (Pyridoxine/P-5-P)"],
    symptom_id: symptomMap["fatigue"],
    relevance_score: 7,
    evidence_level: "strong",
  },
  {
    ingredient_id: ingredientMap["Vitamin B6 (Pyridoxine/P-5-P)"],
    symptom_id: symptomMap["focus"],
    relevance_score: 7,
    evidence_level: "moderate",
  },
  {
    ingredient_id: ingredientMap["Vitamin B6 (Pyridoxine/P-5-P)"],
    symptom_id: symptomMap["immunity"],
    relevance_score: 6,
    evidence_level: "moderate",
  },
  {
    ingredient_id: ingredientMap["Vitamin B6 (Pyridoxine/P-5-P)"],
    symptom_id: symptomMap["stress"],
    relevance_score: 6,
    evidence_level: "moderate",
  },
  // B12 → 피로, 집중
  {
    ingredient_id: ingredientMap["Vitamin B12 (Methylcobalamin)"],
    symptom_id: symptomMap["fatigue"],
    relevance_score: 9,
    evidence_level: "strong",
  },
  {
    ingredient_id: ingredientMap["Vitamin B12 (Methylcobalamin)"],
    symptom_id: symptomMap["focus"],
    relevance_score: 8,
    evidence_level: "strong",
  },
  // 엽산 → 피로
  {
    ingredient_id: ingredientMap["Folate (5-MTHF)"],
    symptom_id: symptomMap["fatigue"],
    relevance_score: 7,
    evidence_level: "strong",
  },
  // 비오틴 → 피로
  {
    ingredient_id: ingredientMap["Biotin"],
    symptom_id: symptomMap["fatigue"],
    relevance_score: 5,
    evidence_level: "moderate",
  },
  // 마그네슘 글리시네이트 → 수면, 스트레스, 피로
  {
    ingredient_id: ingredientMap["Magnesium Glycinate"],
    symptom_id: symptomMap["sleep"],
    relevance_score: 9,
    evidence_level: "strong",
  },
  {
    ingredient_id: ingredientMap["Magnesium Glycinate"],
    symptom_id: symptomMap["stress"],
    relevance_score: 8,
    evidence_level: "strong",
  },
  {
    ingredient_id: ingredientMap["Magnesium Glycinate"],
    symptom_id: symptomMap["fatigue"],
    relevance_score: 6,
    evidence_level: "moderate",
  },
  // 마그네슘 시트레이트 → 수면, 스트레스
  {
    ingredient_id: ingredientMap["Magnesium Citrate"],
    symptom_id: symptomMap["sleep"],
    relevance_score: 7,
    evidence_level: "moderate",
  },
  {
    ingredient_id: ingredientMap["Magnesium Citrate"],
    symptom_id: symptomMap["stress"],
    relevance_score: 7,
    evidence_level: "moderate",
  },
  // 비타민 D3 → 면역, 피로
  {
    ingredient_id: ingredientMap["Vitamin D3 (Cholecalciferol)"],
    symptom_id: symptomMap["immunity"],
    relevance_score: 9,
    evidence_level: "strong",
  },
  {
    ingredient_id: ingredientMap["Vitamin D3 (Cholecalciferol)"],
    symptom_id: symptomMap["fatigue"],
    relevance_score: 6,
    evidence_level: "moderate",
  },
  // 비타민 K2 → 면역
  {
    ingredient_id: ingredientMap["Vitamin K2 (MK-7)"],
    symptom_id: symptomMap["immunity"],
    relevance_score: 5,
    evidence_level: "moderate",
  },
  // EPA → 집중, 스트레스
  {
    ingredient_id: ingredientMap["EPA (Eicosapentaenoic Acid)"],
    symptom_id: symptomMap["stress"],
    relevance_score: 8,
    evidence_level: "strong",
  },
  {
    ingredient_id: ingredientMap["EPA (Eicosapentaenoic Acid)"],
    symptom_id: symptomMap["focus"],
    relevance_score: 7,
    evidence_level: "moderate",
  },
  // DHA → 집중
  {
    ingredient_id: ingredientMap["DHA (Docosahexaenoic Acid)"],
    symptom_id: symptomMap["focus"],
    relevance_score: 9,
    evidence_level: "strong",
  },
  {
    ingredient_id: ingredientMap["DHA (Docosahexaenoic Acid)"],
    symptom_id: symptomMap["stress"],
    relevance_score: 6,
    evidence_level: "moderate",
  },
  // 비타민 C → 면역, 피로
  {
    ingredient_id: ingredientMap["Vitamin C (Ascorbic Acid)"],
    symptom_id: symptomMap["immunity"],
    relevance_score: 9,
    evidence_level: "strong",
  },
  {
    ingredient_id: ingredientMap["Vitamin C (Ascorbic Acid)"],
    symptom_id: symptomMap["fatigue"],
    relevance_score: 6,
    evidence_level: "moderate",
  },
  // 아연 → 면역
  {
    ingredient_id: ingredientMap["Zinc"],
    symptom_id: symptomMap["immunity"],
    relevance_score: 9,
    evidence_level: "strong",
  },
  // 유산균 → 면역, 스트레스
  {
    ingredient_id: ingredientMap["Lactobacillus/Bifidobacterium Complex"],
    symptom_id: symptomMap["immunity"],
    relevance_score: 8,
    evidence_level: "strong",
  },
  {
    ingredient_id: ingredientMap["Lactobacillus/Bifidobacterium Complex"],
    symptom_id: symptomMap["stress"],
    relevance_score: 6,
    evidence_level: "moderate",
  },
];

const validIsData = isData.filter((is) => {
  if (!is.ingredient_id || !is.symptom_id) {
    console.warn("  ⚠️ 누락된 ID로 건너뜀:", JSON.stringify(is));
    return false;
  }
  return true;
});
if (validIsData.length < isData.length) {
  console.warn(
    `  ${isData.length - validIsData.length}개 매핑이 누락된 ID로 제외됨`,
  );
}

const { data: isResult, error: isErr } = await supabase
  .from("ingredient_symptoms")
  .insert(validIsData)
  .select();

if (isErr) {
  console.error("  성분-증상 매핑 실패:", isErr.message);
  Deno.exit(1);
}
console.log(`  ${isResult.length}개 매핑 완료`);

console.log("\n=== 실제 제품 시딩 완료! ===");
console.log(`  브랜드: ${brands.length}개`);
console.log(`  성분: ${ingredients.length}개`);
console.log(`  제품: ${products.length}개`);
console.log(`  제품-성분 매핑: ${piResult.length}개`);
console.log(`  증상: ${symptoms.length}개`);
console.log(`  성분-증상 매핑: ${isResult.length}개`);
