/**
 * ProductCompare Island — 제품 비교 인터페이스
 * URL의 ?slugs= 파라미터를 기반으로 제품을 비교 표시
 */

import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { CompareIngredient, CompareProduct } from "../types/index.ts";

interface ProductCompareProps {
  initialSlugs: string[];
  allProducts: { name: string; slug: string }[];
}

export default function ProductCompare(
  { initialSlugs, allProducts }: ProductCompareProps,
) {
  const products = useSignal<CompareProduct[]>([]);
  const isLoading = useSignal(false);
  const error = useSignal<string | null>(null);
  const selectedSlugs = useSignal<string[]>(initialSlugs);

  const fetchCompareData = async (slugs: string[]) => {
    if (slugs.length < 2) {
      products.value = [];
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const resp = await fetch(
        `/api/compare?slugs=${slugs.join(",")}`,
      );

      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        error.value = data?.error ?? "비교 데이터를 불러올 수 없습니다.";
        return;
      }

      const data = await resp.json();
      products.value = data.products;
    } catch (_err) {
      error.value = "네트워크 오류가 발생했습니다.";
    } finally {
      isLoading.value = false;
    }
  };

  useEffect(() => {
    if (selectedSlugs.value.length >= 2) {
      fetchCompareData(selectedSlugs.value);
    }
  }, []);

  const toggleProduct = (slug: string) => {
    const MAX_PRODUCTS = 4;
    const current = [...selectedSlugs.value];
    const idx = current.indexOf(slug);

    if (idx >= 0) {
      current.splice(idx, 1);
    } else if (current.length < MAX_PRODUCTS) {
      current.push(slug);
    }

    selectedSlugs.value = current;

    // URL 업데이트 (히스토리 교체)
    const url = new URL(globalThis.location.href);
    if (current.length > 0) {
      url.searchParams.set("slugs", current.join(","));
    } else {
      url.searchParams.delete("slugs");
    }
    globalThis.history.replaceState(null, "", url.toString());

    if (current.length >= 2) {
      fetchCompareData(current);
    } else {
      products.value = [];
    }
  };

  // 모든 제품의 성분 이름 합집합 (비교 행 생성용)
  const allIngredientNames = (): string[] => {
    const names = new Set<string>();
    for (const p of products.value) {
      for (const ing of p.ingredients) {
        names.add(ing.name_ko);
      }
    }
    return [...names];
  };

  const getIngredient = (
    product: CompareProduct,
    nameKo: string,
  ): CompareIngredient | undefined => {
    return product.ingredients.find((i) => i.name_ko === nameKo);
  };

  /** 특정 필드에서 최고값 하이라이트를 위한 유틸 */
  const getBestRating = (): number => {
    const ratings = products.value.map((p) => p.rating);
    return ratings.length > 0 ? Math.max(...ratings) : 0;
  };

  const getLowestDailyCost = (): string | null => {
    const costs = products.value
      .map((p) => p.daily_cost)
      .filter((c): c is string => c !== null)
      .map(Number);
    if (costs.length === 0) return null;
    return Math.min(...costs).toFixed(2);
  };

  return (
    <div>
      {/* 제품 선택 영역 */}
      <div class="mb-6">
        <h2 class="text-lg font-bold mb-3">비교할 제품 선택 (최대 4개)</h2>
        <div class="flex flex-wrap gap-2">
          {allProducts.map((p) => {
            const isSelected = selectedSlugs.value.includes(p.slug);
            return (
              <button
                type="button"
                key={p.slug}
                onClick={() => toggleProduct(p.slug)}
                class={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  isSelected
                    ? "bg-blue-700 text-white border-blue-700"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                }`}
              >
                {isSelected && <span class="mr-1">&#10003;</span>}
                {p.name}
              </button>
            );
          })}
        </div>
        {selectedSlugs.value.length < 2 && (
          <p class="text-sm text-gray-500 mt-2">
            2개 이상 선택하면 비교가 시작됩니다.
          </p>
        )}
      </div>

      {/* 로딩 */}
      {isLoading.value && (
        <div class="text-center py-12">
          <div class="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
          <p class="text-gray-500 mt-3">비교 데이터를 불러오는 중...</p>
        </div>
      )}

      {/* 에러 */}
      {error.value && (
        <div class="bg-red-50 text-red-700 rounded-lg p-4 text-sm">
          {error.value}
        </div>
      )}

      {/* 비교 테이블 */}
      {!isLoading.value && !error.value && products.value.length >= 2 && (
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b-2 border-gray-200">
                <th class="text-left py-3 pr-4 font-medium text-gray-500 w-36">
                  항목
                </th>
                {products.value.map((p) => (
                  <th key={p.slug} class="text-left py-3 px-3 min-w-[180px]">
                    <a
                      href={`/products/${p.slug}`}
                      class="text-blue-700 hover:underline font-bold"
                    >
                      {p.name}
                    </a>
                    <p class="text-xs text-gray-500 font-normal mt-0.5">
                      {p.brand_name}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* 가격 */}
              <tr class="border-b border-gray-100">
                <td class="py-3 pr-4 font-medium text-gray-500">가격</td>
                {products.value.map((p) => (
                  <td key={p.slug} class="py-3 px-3 font-bold">
                    ${p.price}
                  </td>
                ))}
              </tr>

              {/* 1일 비용 */}
              <tr class="border-b border-gray-100">
                <td class="py-3 pr-4 font-medium text-gray-500">1일 비용</td>
                {products.value.map((p) => {
                  const lowest = getLowestDailyCost();
                  const isBest = p.daily_cost === lowest;
                  return (
                    <td
                      key={p.slug}
                      class={`py-3 px-3 font-bold ${
                        isBest ? "text-green-600" : ""
                      }`}
                    >
                      {p.daily_cost ? `$${p.daily_cost}` : "-"}
                      {isBest && (
                        <span class="ml-1 text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">
                          최저
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* 평점 */}
              <tr class="border-b border-gray-100">
                <td class="py-3 pr-4 font-medium text-gray-500">평점</td>
                {products.value.map((p) => {
                  const best = getBestRating();
                  const isBest = p.rating === best;
                  return (
                    <td
                      key={p.slug}
                      class={`py-3 px-3 ${
                        isBest ? "text-yellow-600 font-bold" : ""
                      }`}
                    >
                      <span class="text-yellow-500">&#9733;</span> {p.rating}
                      <span class="text-gray-400 ml-1">
                        ({p.review_count})
                      </span>
                      {isBest && (
                        <span class="ml-1 text-xs bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded">
                          최고
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* 서빙 정보 */}
              <tr class="border-b border-gray-100">
                <td class="py-3 pr-4 font-medium text-gray-500">서빙</td>
                {products.value.map((p) => (
                  <td key={p.slug} class="py-3 px-3">
                    {p.serving_size} / {p.servings_per_container}일분
                  </td>
                ))}
              </tr>

              {/* 제형 */}
              <tr class="border-b border-gray-100">
                <td class="py-3 pr-4 font-medium text-gray-500">제형</td>
                {products.value.map((p) => (
                  <td key={p.slug} class="py-3 px-3">{p.form}</td>
                ))}
              </tr>

              {/* 인증 */}
              <tr class="border-b border-gray-200">
                <td class="py-3 pr-4 font-medium text-gray-500">인증</td>
                {products.value.map((p) => (
                  <td key={p.slug} class="py-3 px-3">
                    <div class="flex flex-wrap gap-1">
                      {(p.certification ?? []).map((cert) => (
                        <span
                          key={cert}
                          class="inline-block bg-green-50 text-green-700 text-xs px-1.5 py-0.5 rounded"
                        >
                          {cert}
                        </span>
                      ))}
                      {(!p.certification || p.certification.length === 0) &&
                        <span class="text-gray-400">-</span>}
                    </div>
                  </td>
                ))}
              </tr>

              {/* 성분 비교 헤더 */}
              <tr class="border-b border-gray-200 bg-gray-50">
                <td
                  class="py-2 pr-4 font-bold text-gray-700"
                  colSpan={products.value.length + 1}
                >
                  성분 비교
                </td>
              </tr>

              {/* 성분별 행 */}
              {allIngredientNames().map((nameKo) => (
                <tr key={nameKo} class="border-b border-gray-100">
                  <td class="py-3 pr-4 font-medium text-gray-600 text-xs">
                    {nameKo}
                  </td>
                  {products.value.map((p) => {
                    const ing = getIngredient(p, nameKo);
                    if (!ing) {
                      return (
                        <td
                          key={p.slug}
                          class="py-3 px-3 text-gray-300"
                        >
                          -
                        </td>
                      );
                    }
                    return (
                      <td key={p.slug} class="py-3 px-3">
                        <span class="font-medium">
                          {ing.amount}
                          {ing.unit}
                        </span>
                        <span class="text-gray-400 text-xs ml-1">
                          ({ing.daily_value_pct}%)
                        </span>
                        <p class="text-gray-500 text-xs mt-0.5">{ing.form}</p>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
