import { supabase } from "../../../utils/supabase.ts";
import { define } from "../../../utils.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const { slug } = ctx.params;

    const { data, error } = await supabase
      .from("products")
      .select(`
        id, name, slug, subtitle, description, price, currency,
        serving_size, servings_per_container, form, certification,
        rating, review_count,
        brands(name, slug, origin, concept),
        product_ingredients(
          amount, unit, daily_value_pct, form,
          ingredients(name, name_ko, category, description)
        )
      `)
      .eq("slug", slug)
      .single();

    if (error) {
      return Response.json({ error: "제품을 찾을 수 없습니다" }, { status: 404 });
    }

    return Response.json(data);
  },
});
