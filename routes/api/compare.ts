/**
 * GET /api/compare?slugs=slug1,slug2 — 제품 비교 데이터 API
 * 최대 4개 제품까지 비교 가능
 */

import { define } from "../../utils.ts";
import { supabase } from "../../utils/supabase.ts";

/** 비교 가능 최대 제품 수 */
const MAX_COMPARE_PRODUCTS = 4;
/** slug 허용 패턴: 영문 소문자, 숫자, 하이픈만 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const handler = define.handlers({
  async GET(ctx) {
    const slugsParam = ctx.url.searchParams.get("slugs");

    if (!slugsParam) {
      return Response.json(
        {
          error: "slugs 파라미터가 필요합니다. (쉼표로 구분)",
          status: 400,
        },
        { status: 400 },
      );
    }

    const slugs = slugsParam.split(",").map((s) => s.trim()).filter(Boolean);

    if (slugs.length < 2) {
      return Response.json(
        { error: "최소 2개 제품을 선택해주세요.", status: 400 },
        { status: 400 },
      );
    }

    if (slugs.length > MAX_COMPARE_PRODUCTS) {
      return Response.json(
        {
          error: `최대 ${MAX_COMPARE_PRODUCTS}개까지 비교 가능합니다.`,
          status: 400,
        },
        { status: 400 },
      );
    }

    // slug 형식 검증 (영문 소문자, 숫자, 하이픈만 허용)
    const invalidSlug = slugs.find((s) => !SLUG_PATTERN.test(s));
    if (invalidSlug) {
      return Response.json(
        { error: "유효하지 않은 제품 slug 형식입니다.", status: 400 },
        { status: 400 },
      );
    }

    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          name, slug, price, currency, serving_size, servings_per_container,
          form, certification, rating, review_count,
          brands(name),
          product_ingredients(
            amount, unit, daily_value_pct, form,
            ingredients(name, name_ko)
          )
        `)
        .in("slug", slugs)
        .eq("is_active", true);

      if (error) {
        console.error("[compare] 쿼리 실패:", error.message);
        return Response.json(
          { error: "제품 정보를 불러오는데 실패했습니다.", status: 500 },
          { status: 500 },
        );
      }

      if (!data || data.length === 0) {
        return Response.json(
          { error: "선택한 제품을 찾을 수 없습니다.", status: 404 },
          { status: 404 },
        );
      }

      interface ProductRow {
        name: string;
        slug: string;
        price: number;
        currency: string;
        serving_size: string;
        servings_per_container: number;
        form: string;
        certification: string[];
        rating: number;
        review_count: number;
        brands: { name: string } | null;
        product_ingredients: {
          amount: number;
          unit: string;
          daily_value_pct: number;
          form: string;
          ingredients: { name: string; name_ko: string } | null;
        }[] | null;
      }

      const products = (data as unknown as ProductRow[]).map((p) => ({
        name: p.name,
        slug: p.slug,
        price: p.price,
        currency: p.currency ?? "USD",
        serving_size: p.serving_size,
        servings_per_container: p.servings_per_container,
        form: p.form,
        certification: p.certification ?? [],
        rating: p.rating,
        review_count: p.review_count,
        daily_cost: p.servings_per_container > 0
          ? (p.price / p.servings_per_container).toFixed(2)
          : null,
        brand_name: p.brands?.name ?? "알 수 없는 브랜드",
        ingredients: (p.product_ingredients ?? []).map((pi) => ({
          name_ko: pi.ingredients?.name_ko ?? "",
          name: pi.ingredients?.name ?? "",
          amount: pi.amount,
          unit: pi.unit,
          daily_value_pct: pi.daily_value_pct,
          form: pi.form,
        })),
      }));

      // 요청한 순서 유지
      const ordered = slugs
        .map((slug) => products.find((p) => p.slug === slug))
        .filter(Boolean);

      return Response.json({ products: ordered });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      console.error("[compare] 오류:", msg);
      return Response.json(
        { error: "제품 비교에 실패했습니다.", status: 500 },
        { status: 500 },
      );
    }
  },
});
