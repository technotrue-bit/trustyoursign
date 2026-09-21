/**
 * Backup for the Vercel route patch: if a hashed `/assets` URL still reaches
 * the function, do not answer with the HTML app (that response was cached
 * `immutable` and stuck the sky on a 404 chunk).
 */
import { assetMissResponse, isHashedAssetMiss } from "../../scripts/asset-miss.mjs";

interface AssetMissEvent {
  url: URL;
}

export default function assetMissMiddleware(
  event: AssetMissEvent,
  next: () => unknown,
): unknown {
  if (isHashedAssetMiss(event.url.pathname)) return assetMissResponse();
  return next();
}
