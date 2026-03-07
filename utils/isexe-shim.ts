/**
 * isexe shim for Deno Deploy
 * Deno Deploy는 서버리스 환경이라 파일 실행 권한 확인이 불필요.
 * Mastra의 transitive dependency(which → isexe)가 번들링 시
 * CJS require('./mode.js')를 사용해 Deno Deploy에서 실패하므로 심으로 대체.
 */

function isexe(
  _path: string,
  _options: unknown,
  cb?: (err: null, result: boolean) => void,
): Promise<boolean> | void {
  if (typeof cb === "function") {
    cb(null, true);
    return;
  }
  return Promise.resolve(true);
}

isexe.sync = function sync(_path: string, _options?: unknown): boolean {
  return true;
};

export default isexe;
export { isexe };
