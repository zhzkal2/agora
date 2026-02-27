import { define } from "../utils.ts";
import { supabase } from "../utils/supabase.ts";

const BASE_URL = Deno.env.get("BASE_URL") || "https://agora-supplements.deno.dev";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const handler = define.handlers({
  async GET(_ctx) {
    const [productsRes, symptomsRes] = await Promise.all([
      supabase.from("products").select("slug, updated_at").eq("is_active", true),
      supabase.from("symptoms").select("slug"),
    ]);

    const products = productsRes.data ?? [];
    const symptoms = symptomsRes.data ?? [];

    const urls = [
      { loc: "/", priority: "1.0", changefreq: "weekly" },
      { loc: "/products", priority: "0.9", changefreq: "weekly" },
      { loc: "/symptoms", priority: "0.9", changefreq: "weekly" },
      ...products.map((p) => ({
        loc: `/products/${p.slug}`,
        priority: "0.8",
        changefreq: "weekly",
        lastmod: p.updated_at?.split("T")[0],
      })),
      ...symptoms.map((s) => ({
        loc: `/symptoms/${s.slug}`,
        priority: "0.8",
        changefreq: "weekly",
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(BASE_URL + u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${
      "lastmod" in u && u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""
    }
  </url>`
  )
  .join("\n")}
</urlset>`;

    return new Response(xml, {
      headers: { "Content-Type": "application/xml" },
    });
  },
});
