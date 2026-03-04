import "@std/dotenv/load";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("SUPABASE_URL 또는 SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다.");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("=== 데이터 조회 테스트 (anon key 사용) ===\n");

// 1. 전체 브랜드 조회
console.log("--- 브랜드 목록 ---");
const { data: brands } = await supabase.from("brands").select("name, slug, concept");
for (const b of brands ?? []) {
  console.log(`  ${b.name} (${b.slug}) — ${b.concept}`);
}

// 2. 제품 + 브랜드 JOIN 조회
console.log("\n--- 제품 목록 (브랜드 포함) ---");
const { data: products } = await supabase
  .from("products")
  .select("name, slug, price, rating, brands(name)")
  .order("price", { ascending: true });

for (const p of products ?? []) {
  const brandName = (p.brands as { name: string })?.name ?? "?";
  console.log(`  $${p.price} | ${p.name} (${brandName}) — ${p.rating}점`);
}

// 3. 특정 제품 상세 + 성분 조회
console.log("\n--- VitaCore B-Complex 상세 ---");
const { data: detail } = await supabase
  .from("products")
  .select(`
    name, price, description, certification,
    brands(name),
    product_ingredients(
      amount, unit, daily_value_pct, form,
      ingredients(name, name_ko)
    )
  `)
  .eq("slug", "vitacore-b-complex-ultra-3000")
  .single();

if (detail) {
  console.log(`  제품: ${detail.name}`);
  console.log(`  가격: $${detail.price}`);
  console.log(`  인증: ${(detail.certification as string[]).join(", ")}`);
  console.log(`  성분:`);
  for (const pi of detail.product_ingredients as Array<Record<string, unknown>>) {
    const ing = pi.ingredients as { name: string; name_ko: string };
    console.log(`    - ${ing.name_ko} ${pi.amount}${pi.unit} (일일 ${pi.daily_value_pct}%)`);
  }
}

// 4. 증상별 추천: "피로" → 관련 성분 → 관련 제품
console.log("\n--- 증상별 추천: 피로회복 ---");
const { data: fatigueProducts } = await supabase
  .from("ingredient_symptoms")
  .select(`
    relevance_score, evidence_level,
    ingredients(name, name_ko),
    symptoms!inner(name_ko)
  `)
  .eq("symptoms.slug", "fatigue")
  .order("relevance_score", { ascending: false });

for (const item of fatigueProducts ?? []) {
  const ing = item.ingredients as { name_ko: string };
  console.log(`  ${ing.name_ko} — 관련도 ${item.relevance_score}/10 (${item.evidence_level})`);
}

console.log("\n=== 조회 테스트 완료! ===");
