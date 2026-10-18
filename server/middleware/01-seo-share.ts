/**
 * Per-page og:/twitter: tags (scripts/seo-share.mjs). Filename `01-` sorts
 * before `asset-miss.ts` and `grok-pwa.ts`, so this middleware is outer: it
 * rewrites the HTML after the platform injector has written its site-wide
 * share set. Same gate as grok-pwa.ts: GET documents, text/html, uncompressed.
 */
import { isDocumentPath } from "../../scripts/grok-pwa-shared.mjs";
import { createShareRewriter } from "../../scripts/seo-share.mjs";

interface SeoShareEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

function rewriteStreaming(response: Response): Response {
  const rewriter = createShareRewriter();
  const transformed = response.body!.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        for (const out of rewriter.push(chunk)) controller.enqueue(out);
      },
      flush(controller) {
        for (const out of rewriter.flush()) controller.enqueue(out);
      },
    }),
  );
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(transformed, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default async function seoShareMiddleware(
  event: SeoShareEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const method = (event.req.method ?? "GET").toUpperCase();
  if (method !== "GET" || !isDocumentPath(event.url.pathname)) return next();

  const result = await next();
  if (
    result instanceof Response &&
    result.body &&
    String(result.headers.get("content-type") ?? "").includes("text/html") &&
    !result.headers.get("content-encoding")
  ) {
    return rewriteStreaming(result);
  }
  return result;
}
