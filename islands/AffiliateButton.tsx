/**
 * AffiliateButton Island — 어필리에이트 링크 버튼 + 클릭 추적
 * 클릭 시 click_logs에 비동기 기록 후 외부 URL로 이동
 */

import { useSignal } from "@preact/signals";

// Duration (in ms) for visual feedback before resetting clicked state
const CLICK_FEEDBACK_DURATION_MS = 2000;

interface AffiliateButtonProps {
  productSlug: string;
  affiliateUrl: string;
  source: "product_page" | "compare" | "recommendation" | "chatbot";
  label?: string;
}

export default function AffiliateButton(
  { productSlug, affiliateUrl, source, label = "구매하러 가기" }:
    AffiliateButtonProps,
) {
  const isClicked = useSignal(false);

  const handleClick = () => {
    if (isClicked.value) return;

    // affiliate URL 프로토콜 검증 (http/https만 허용)
    try {
      const parsed = new URL(affiliateUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return;
      }
    } catch {
      return;
    }

    isClicked.value = true;

    // 비동기로 클릭 로그 기록 (응답 대기 안 함)
    fetch("/api/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_slug: productSlug,
        referrer: globalThis.location?.href ?? "",
        source,
        affiliate_url: affiliateUrl,
      }),
    }).catch(() => {
      // 로깅 실패해도 무시
    });

    // 새 탭에서 어필리에이트 URL 열기
    globalThis.open(affiliateUrl, "_blank", "noopener,noreferrer");

    // 시각적 피드백 유지 후 클릭 상태 초기화: 사용자가 "이동 중..." 상태를 충분히 볼 수 있도록 함
    setTimeout(() => {
      isClicked.value = false;
    }, CLICK_FEEDBACK_DURATION_MS);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isClicked.value}
      class="inline-flex items-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {isClicked.value
        ? (
          <>
            <svg
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            이동 중...
          </>
        )
        : (
          <>
            <svg
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
            {label}
          </>
        )}
    </button>
  );
}
