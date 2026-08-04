// ─── Image proxy helper ────────────────────────────────────────────────────────
// Routes external product images through the backend ImageProxyController
// (/api/v1/image-proxy) which resizes + converts to WebP and caches 7 days.
// The SW's "image-cache" runtime rule caches these responses as well.
//
// Returns null for empty / non-http(s) URLs (data:, blob:, relative paths)
// so callers can fall back to the raw URL / placeholder.

export function proxyImage(
  url?: string | null,
  width = 300,
): string | null {
  if (!url) return null;

  if (!/^https?:\/\//i.test(url)) return null;

  const q = new URLSearchParams({ url, w: String(width) });
  return `/api/v1/image-proxy?${q.toString()}`;
}

/** Resolves the "best" image URL for a variant-ish object, then proxies it. */
export function proxiedVariantImage(
  v: {
    image_url?: string | null;
    product?: { default_image?: string | null; images?: string[] | null } | null;
  } | null,
  width = 300,
): string | null {
  if (!v) return null;
  const raw = v.image_url ?? v.product?.default_image ?? v.product?.images?.[0] ?? null;
  return proxyImage(raw, width);
}
