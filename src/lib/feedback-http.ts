/**
 * HTTP edge for POST /api/feedback.
 *
 * TanStack Start only runs `server.handlers` for methods that are registered.
 * Anything else is rendered as a page. This route has no page, so a GET or
 * OPTIONS becomes either the app shell (200 HTML) or, when Accept is not
 * HTML, a framework 500 ("Only HTML requests are supported here"). An unhandled
 * throw on that render is what the host reports as 502 — with no submit, no
 * validation, and no call to Resend.
 *
 * Every non-POST method is answered here so that path never runs.
 */

import type { FeedbackRawInput } from "./feedback.ts";
import {
  clientKeyFromHeaders,
  submitFeedback,
  type FeedbackSubmitDeps,
} from "./feedback-submit.ts";

export const FEEDBACK_ALLOWED_METHOD = "POST";

const UNAVAILABLE =
  "Feedback is temporarily unavailable. Try again in a bit, or email directly.";

export function feedbackMethodNotAllowedResponse(method: string): Response {
  const headers = { Allow: FEEDBACK_ALLOWED_METHOD };
  // HEAD must not carry a body. The status is still "not an intake".
  if (method.toUpperCase() === "HEAD") {
    return new Response(null, { status: 405, headers });
  }
  return Response.json(
    { ok: false, error: "Method not allowed. Use POST.", status: 405 },
    { status: 405, headers },
  );
}

export type FeedbackPostDeps = Omit<FeedbackSubmitDeps, "clientKey"> & {
  clientKey?: string;
};

function jsonError(error: string, status: number): Response {
  return Response.json({ ok: false, error, status }, { status });
}

/**
 * The only path that can return 502 is a validated note whose mail send throws.
 * Invalid bodies, other methods, and limiter failures return before that.
 */
export async function handleFeedbackPost(
  request: Request,
  deps: FeedbackPostDeps = {},
): Promise<Response> {
  let body: FeedbackRawInput = {};
  try {
    body = (await request.json()) as FeedbackRawInput;
  } catch {
    return jsonError("Send JSON with kind and message.", 400);
  }

  const headers = request.headers;
  const userAgent =
    typeof body.userAgent === "string" && body.userAgent.trim()
      ? body.userAgent
      : (headers.get("user-agent") ?? undefined);

  try {
    const result = await submitFeedback(
      { ...body, userAgent },
      {
        ...deps,
        clientKey: deps.clientKey ?? clientKeyFromHeaders(headers),
      },
    );
    if (result.ok) return Response.json({ ok: true }, { status: 200 });
    return jsonError(result.error, result.status);
  } catch (err) {
    console.error("[feedback] submit failed:", err);
    return jsonError(UNAVAILABLE, 503);
  }
}
