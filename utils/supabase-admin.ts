import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

/**
 * Service Role 클라이언트 (bot_logs, click_logs INSERT용)
 * 키가 없으면 null — 로깅 불가 시 앱은 정상 동작
 */
export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export interface BotLogEntry {
  bot_name: string;
  user_agent: string;
  ip: string | null;
  path: string;
  response_code: number;
  response_time_ms: number;
}

/** bot_logs 테이블에 비동기 INSERT (실패해도 앱 동작에 영향 없음) */
export async function logBotAccess(entry: BotLogEntry): Promise<void> {
  if (!supabaseAdmin) return;

  const { error } = await supabaseAdmin.from("bot_logs").insert(entry);

  if (error) {
    console.error("[bot-log] INSERT 실패:", error.message);
  }
}
