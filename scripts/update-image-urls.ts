/**
 * 모든 제품의 image_url을 로컬 경로로 일괄 업데이트
 *
 * 실행: deno run -A scripts/update-image-urls.ts --allow-seed
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
    "모든 제품의 image_url을 /images/products/{slug}.webp로 변경합니다.",
  );
  console.warn("확인 후 --allow-seed 플래그를 추가하여 실행하세요.\n");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// 모든 제품 slug 조회
const { data: products, error: fetchErr } = await supabase
  .from("products")
  .select("id, slug, name, image_url");

if (fetchErr || !products) {
  console.error("제품 조회 실패:", fetchErr?.message);
  Deno.exit(1);
}

console.log(`총 ${products.length}개 제품 image_url 업데이트 시작\n`);

let updated = 0;
for (const product of products) {
  const newUrl = `/images/products/${product.slug}.webp`;

  const { error } = await supabase
    .from("products")
    .update({ image_url: newUrl })
    .eq("id", product.id);

  if (error) {
    console.error(`  ✗ ${product.name}: ${error.message}`);
  } else {
    console.log(`  ✓ ${product.name} → ${newUrl}`);
    updated++;
  }
}

console.log(`\n완료: ${updated}/${products.length}개 업데이트됨`);

// 필요한 이미지 파일 목록 출력
console.log("\n=== 준비해야 할 이미지 파일 목록 ===");
console.log("위치: static/images/products/\n");
for (const product of products) {
  console.log(`  ${product.slug}.webp  ← ${product.name}`);
}
