// ─── Image proxy helper ────────────────────────────────────────────────────────
// Routes external product images through the backend ImageProxyController
// (/api/v1/image-proxy) which resizes + converts to WebP and caches 7 days.
// The SW's "image-cache" runtime rule caches these responses as well.
//
// Returns null for empty / non-http(s) URLs (data:, blob:, relative paths)
// so callers can fall back to the raw URL / placeholder.
//
// Same-origin URLs (the app's own /storage/... uploads) are returned verbatim —
// the proxy's SSRF guard rejects loopback/private hosts (400), so the app's own
// images must NEVER be routed through it.
//
// Known CDN domains that block server-side requests (TLS fingerprinting / bot
// detection) are skipped — the browser can fetch them directly.

/** Domains whose CDNs reject server-side fetches but work from the browser. */
const SKIP_PROXY_HOSTS = new Set([
  'fbcdn.net',        // Facebook / Instagram CDN
  'fna.fbcdn.net',
  'scontent-*.fbcdn.net',
]);

function shouldSkipProxy(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    for (const pattern of SKIP_PROXY_HOSTS) {
      if (pattern.startsWith('*.')) {
        if (host.endsWith(pattern.slice(1))) return true;
      } else if (host === pattern || host.endsWith('.' + pattern)) {
        return true;
      }
    }
  } catch { /* ignore */ }
  return false;
}

export function proxyImage(
  url?: string | null,
  width = 300,
): string | null {
  if (!url) return null;

  if (!/^https?:\/\//i.test(url)) return null;

  try {
    const target = new URL(url);
    if (target.host === window.location.host) return url;
  } catch {
    return null;
  }

  if (shouldSkipProxy(url)) return url;

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
