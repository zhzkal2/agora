/** Phase 4: 공유 타입 정의 */

// ─── Chat ───────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  products?: ProductSummary[];
}

// ─── Product ────────────────────────────────────────────────────────

export interface ProductSummary {
  name: string;
  slug: string;
  price: number;
  rating: number;
  review_count: number;
  brand_name: string;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  price: number;
  currency: string;
  serving_size: string;
  servings_per_container: number;
  form: string;
  certification: string[];
  rating: number;
  review_count: number;
  affiliate_url: string | null;
  brands: {
    name: string;
    slug: string;
    origin: string;
    concept: string;
  };
  product_ingredients: ProductIngredientDetail[];
}

export interface ProductIngredientDetail {
  amount: number;
  unit: string;
  daily_value_pct: number;
  form: string;
  ingredients: {
    name: string;
    name_ko: string;
    category: string;
    description: string;
  };
}

// ─── Compare ────────────────────────────────────────────────────────

export interface CompareRequest {
  slugs: string[];
}

export interface CompareIngredient {
  name_ko: string;
  name: string;
  amount: number;
  unit: string;
  daily_value_pct: number;
  form: string;
}

export interface CompareProduct {
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
  daily_cost: string | null;
  brand_name: string;
  ingredients: CompareIngredient[];
}

// ─── Click Tracking ─────────────────────────────────────────────────

export interface ClickLogEntry {
  product_slug: string;
  referrer: string;
  source: "chatbot" | "product_page" | "compare" | "recommendation";
  affiliate_url: string;
}
