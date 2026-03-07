/**
 * JSON-LD를 dangerouslySetInnerHTML에 안전하게 삽입하기 위한 직렬화 함수.
 * `<`를 `\u003c`로 치환하여 스크립트 주입을 방지한다.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
