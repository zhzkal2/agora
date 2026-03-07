/**
 * gray-matter shim for Deno Deploy
 * Mastra workspace 모듈이 gray-matter를 사용하지만,
 * 챗봇 에이전트에서는 workspace 기능을 사용하지 않으므로 no-op shim으로 대체.
 * gray-matter → js-yaml(CJS)이 Vite 번들링 시 타입 초기화 순서가 깨져서 에러 발생.
 */

interface MatterResult {
  data: Record<string, unknown>;
  content: string;
  excerpt: string;
  orig: string;
}

function matter(input: string): MatterResult {
  return {
    data: {},
    content: typeof input === "string" ? input : "",
    excerpt: "",
    orig: typeof input === "string" ? input : "",
  };
}

matter.stringify = function (content: string): string {
  return content;
};

matter.read = function (_filepath: string): MatterResult {
  return { data: {}, content: "", excerpt: "", orig: "" };
};

matter.test = function (_input: string): boolean {
  return false;
};

export default matter;
export { matter };
