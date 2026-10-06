/**
 * Dev-only gate for `/?mesh=sagittarius`.
 * Lives apart from the review shell so the sky does not import that canvas.
 */
export function wantsMeshReview(search = "") {
  // Dev-only stage — never open from a public share URL in production builds.
  if (!import.meta.env.DEV) return false;
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("mesh");
  return q === "sagittarius" || q === "1" || q === "sagitarius";
}
