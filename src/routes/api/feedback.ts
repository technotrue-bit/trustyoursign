import { createFileRoute } from "@tanstack/react-router";
import { clientKeyFromHeaders, submitFeedback } from "@/lib/feedback-submit";
import type { FeedbackRawInput } from "@/lib/feedback";

export const Route = createFileRoute("/api/feedback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: FeedbackRawInput = {};
        try {
          body = (await request.json()) as FeedbackRawInput;
        } catch {
          return Response.json(
            { ok: false, error: "Send JSON with kind and message.", status: 400 },
            { status: 400 },
          );
        }

        const headers = request.headers;
        const userAgent =
          typeof body.userAgent === "string" && body.userAgent.trim()
            ? body.userAgent
            : (headers.get("user-agent") ?? undefined);

        const result = await submitFeedback(
          { ...body, userAgent },
          { clientKey: clientKeyFromHeaders(headers) },
        );

        if (result.ok) {
          return Response.json({ ok: true }, { status: 200 });
        }
        return Response.json(
          { ok: false, error: result.error, status: result.status },
          { status: result.status },
        );
      },
    },
  },
});
