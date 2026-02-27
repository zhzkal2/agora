import "@std/dotenv/load";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const tables = [
  "brands",
  "products",
  "ingredients",
  "product_ingredients",
  "symptoms",
  "ingredient_symptoms",
  "bot_logs",
  "click_logs",
];

console.log("=== 테이블 존재 확인 ===\n");

for (const table of tables) {
  const { data, error } = await supabase.from(table).select("id").limit(1);
  const status = error ? `실패: ${error.message}` : `존재 (${data.length}행)`;
  console.log(`${table.padEnd(22)} ${status}`);
}
