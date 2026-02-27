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
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data);
  },
});
