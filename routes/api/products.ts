import { supabase } from "../../utils/supabase.ts";
import { define } from "../../utils.ts";

export const handler = define.handlers({
  async GET(_ctx) {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id, name, slug, price, rating, review_count, form, certification,
        brands(name, slug)
      `)
      .eq("is_active", true)
      .order("rating", { ascending: false });

    if (error) {
      console.error("products API error:", error.message);
      return Response.json(
        { error: "제품 목록을 불러오는데 실패했습니다" },
        { status: 500 },
      );
    }

    return Response.json(data);
  },
});
