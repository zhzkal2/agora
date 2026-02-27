import "@std/dotenv/load";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceKey) {
  console.error("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.");
  Deno.exit(1);
}

async function runSql(sql: string, label: string): Promise<boolean> {
  console.log(`\n실행 중: ${label}...`);

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: serviceKey!,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ sql_query: sql }),
      signal: AbortSignal.timeout(30_000),
    });

    if (res.ok) {
      console.log(`  완료: ${label}`);
      return true;
    }

    const errorText = await res.text();
    if (errorText.includes("exec_sql")) {
      return false;
    }

    console.error(`  실패: ${label}`, errorText);
    return false;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      console.error(`  타임아웃: ${label} (30초 초과)`);
    } else {
      console.error(`  네트워크 오류: ${label}`, err instanceof Error ? err.message : err);
    }
    return false;
  }
}

// schema.sql 파일에서 스키마 읽기 (단일 소스)
const SCHEMA_SQL = await Deno.readTextFile(
  new URL("./schema.sql", import.meta.url),
);

console.log("=== AIEO MVP DB 스키마 생성 ===\n");

const success = await runSql(SCHEMA_SQL, "전체 스키마");

if (!success) {
  console.log("\n========================================");
  console.log("Supabase REST API로 직접 SQL 실행이 불가합니다.");
  console.log("아래 SQL을 Supabase 대시보드 > SQL Editor에 붙여넣고 실행해주세요.");
  console.log("========================================\n");
  console.log(SCHEMA_SQL);
  Deno.exit(1);
}
