import "@std/dotenv/load";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseKey) {
  console.error(".env 파일에 SUPABASE_URL 또는 SUPABASE_ANON_KEY가 없습니다.");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 연결 테스트: 현재 테이블 목록 조회
const { data, error } = await supabase
  .from("information_schema.tables")
  .select("table_name")
  .eq("table_schema", "public");

if (error) {
  // RLS 때문에 information_schema 접근이 안 될 수 있음
  // 간단한 health check로 대체
  console.log("Supabase 연결 테스트...");
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });
  if (res.ok) {
    console.log("DB 연결 성공!");
    console.log("상태:", res.status);
    const tables = await res.json();
    console.log("기존 테이블:", tables.length > 0 ? tables : "(없음)");
  } else {
    console.error("DB 연결 실패:", res.status, await res.text());
  }
} else {
  console.log("DB 연결 성공!");
  console.log("기존 테이블:", data);
}
