/**
 * Hashed build output that reached the server function was not on the CDN.
 * Returning the HTML app here is what got cached as the chunk body.
 */

/** @param {string} pathname */
export function isHashedAssetMiss(pathname) {
  return pathname.startsWith("/assets/") && /\/[^/]+\.[a-z0-9]+$/i.test(pathname);
}

export function assetMissResponse() {
  return new Response("Not found", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
