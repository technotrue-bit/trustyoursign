import { createFileRoute } from "@tanstack/react-router";
import { feedbackMethodNotAllowedResponse, handleFeedbackPost } from "@/lib/feedback-http";

const methodNotAllowed = ({ request }: { request: Request }) =>
  feedbackMethodNotAllowedResponse(request.method);

/**
 * POST is the only intake. GET/OPTIONS/HEAD/ANY are registered on purpose:
 * a missing method falls through to page rendering and errors without a submit.
 */
export const Route = createFileRoute("/api/feedback")({
  server: {
    handlers: {
      POST: ({ request }) => handleFeedbackPost(request),
      GET: methodNotAllowed,
      OPTIONS: methodNotAllowed,
      PUT: methodNotAllowed,
      PATCH: methodNotAllowed,
      DELETE: methodNotAllowed,
      HEAD: methodNotAllowed,
      ANY: methodNotAllowed,
    },
  },
});
