/**
 * ChatBot Island — AI 영양제 상담 챗봇
 * 플로팅 버튼 + 채팅 패널 UI
 * Fresh Islands Architecture: 클라이언트에서 hydration
 */

import { useSignal } from "@preact/signals";
import { useRef } from "preact/hooks";
import type { ChatMessage } from "../types/index.ts";

export default function ChatBot() {
  const isOpen = useSignal(false);
  const messages = useSignal<ChatMessage[]>([]);
  const input = useSignal("");
  const isLoading = useSignal(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const sendMessage = async () => {
    const text = input.value.trim();
    if (!text || isLoading.value) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    messages.value = [...messages.value, userMessage];
    input.value = "";
    isLoading.value = true;
    scrollToBottom();

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.value.slice(0, -1),
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => null);
        const errorMsg = errorData?.error ??
          "응답을 받을 수 없습니다. 잠시 후 다시 시도해주세요.";
        messages.value = [...messages.value, {
          role: "assistant",
          content: errorMsg,
        }];
        return;
      }

      const data = await resp.json();
      messages.value = [...messages.value, {
        role: "assistant",
        content: data.reply,
      }];
    } catch (_err) {
      messages.value = [...messages.value, {
        role: "assistant",
        content: "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.",
      }];
    } finally {
      isLoading.value = false;
      scrollToBottom();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /** HTML 엔티티 이스케이프 (XSS 방지) */
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  /** URL이 안전한 프로토콜인지 확인 */
  const isSafeUrl = (url: string): boolean => {
    const trimmed = url.trim().toLowerCase();
    return trimmed.startsWith("http://") || trimmed.startsWith("https://") ||
      trimmed.startsWith("/");
  };

  /** 마크다운 기본 포맷팅 (링크, 볼드, 리스트) — HTML 이스케이프 후 변환 */
  const formatMessage = (text: string): string => {
    return escapeHtml(text)
      // 링크: [text](url) -> <a> (안전한 프로토콜만 허용)
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (_match, label: string, url: string) => {
          if (!isSafeUrl(url)) return label;
          return `<a href="${url}" class="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener">${label}</a>`;
        },
      )
      // 볼드: **text** -> <strong>
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      // 줄바꿈
      .replace(/\n/g, "<br>");
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      {!isOpen.value && (
        <button
          type="button"
          onClick={() => {
            isOpen.value = true;
            if (messages.value.length === 0) {
              messages.value = [{
                role: "assistant",
                content:
                  "안녕하세요! 영양제 전문 상담사입니다. 어떤 건강 고민이 있으신가요?\n\n" +
                  "예시 질문:\n" +
                  "- 피로감이 심한데 어떤 영양제가 좋을까요?\n" +
                  "- 비타민B12와 엽산을 같이 먹어도 되나요?\n" +
                  "- 마그네슘은 언제 먹는 게 좋나요?",
              }];
            }
          }}
          class="fixed bottom-6 right-6 z-50 bg-blue-700 text-white w-14 h-14 rounded-full shadow-lg hover:bg-blue-800 transition-colors flex items-center justify-center"
          aria-label="AI 상담 챗봇 열기"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="w-6 h-6"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
        </button>
      )}

      {/* 채팅 패널 */}
      {isOpen.value && (
        <div class="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div class="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 bg-green-400 rounded-full" />
              <span class="font-medium text-sm">AI 영양제 상담</span>
            </div>
            <button
              type="button"
              onClick={() => {
                isOpen.value = false;
              }}
              class="text-white/80 hover:text-white transition-colors"
              aria-label="채팅 닫기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="w-5 h-5"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 메시지 영역 */}
          <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.value.map((msg, i) => (
              <div
                key={i}
                class={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  class={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-700 text-white rounded-br-md"
                      : "bg-gray-100 text-gray-800 rounded-bl-md"
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: formatMessage(msg.content),
                  }}
                />
              </div>
            ))}
            {isLoading.value && (
              <div class="flex justify-start">
                <div class="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div class="flex gap-1.5">
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 입력 영역 */}
          <div class="border-t border-gray-200 px-4 py-3 shrink-0">
            <div class="flex gap-2">
              <input
                type="text"
                value={input.value}
                onInput={(e) => {
                  input.value = (e.target as HTMLInputElement).value;
                }}
                onKeyDown={handleKeyDown}
                placeholder="증상이나 영양제에 대해 물어보세요..."
                class="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                disabled={isLoading.value}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={isLoading.value || input.value.trim().length === 0}
                class="bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shrink-0"
              >
                전송
              </button>
            </div>
            <p class="text-xs text-gray-400 mt-2 text-center">
              AI 상담은 참고용이며, 전문가 상담을 대체하지 않습니다.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
