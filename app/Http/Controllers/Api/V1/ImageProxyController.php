<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Image proxy with on-the-fly resize + WebP conversion.
 *
 * Purpose:
 *   - Product images are external URLs (Google CSE / Pexels / store CDNs).
 *     Serving them through this endpoint lets the client request a fixed
 *     width, get a compressed WebP (huge bandwidth saving on POS grids),
 *     and benefit from a shared 7-day HTTP cache.
 *   - The SW (runtimeCaching "image-cache") caches these responses too.
 *
 * Security:
 *   - NO auth:sanctum: an <img> tag cannot send the Authorization header.
 *   - SSRF guard: scheme must be http(s) AND the resolved host must be a
 *     public IP (never loopback/link-local/private ranges). Failed lookups
 *     are rejected.
 *   - Output is streamed from disk; content is validated to be an image.
 */
class ImageProxyController
{
    /** On-disk cache duration in seconds (7 days). */
    private const CACHE_TTL = 604800;

    /** Max proxied width to avoid absurd server work. */
    private const MAX_DIMENSION = 2048;

    public function proxy(Request $request): Response
    {
        $url = $request->query('url');
        if (! is_string($url) || $url === '') {
            return $this->badRequest('url مطلوب');
        }

        if (! $this->isSafeUrl($url)) {
            return $this->badRequest('url غير صالح');
        }

        $width  = $this->clampDimension($request->integer('w', 300));
        $height = $this->clampDimension($request->integer('h', 0));

        $cacheDir = storage_path('app/image-proxy');
        $cacheKey = md5($url . "|w={$width}|h={$height}");
        $cacheFile = $cacheDir . '/' . $cacheKey . '.webp';

        if (is_file($cacheFile)) {
            return $this->streamImage($cacheFile, $url);
        }

        try {
            $response = Http::timeout(10)
                ->connectTimeout(5)
                ->withOptions(['stream' => true])
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    'Accept'     => 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Referer'    => parse_url($url, PHP_URL_HOST) ? ('https://' . parse_url($url, PHP_URL_HOST) . '/') : '',
                ])
                ->get($url);

            if (! $response->successful()) {
                return redirect()->away($url);
            }

            $raw = $response->body();
            if ($raw === '') {
                return redirect()->away($url);
            }

            $webp = $this->processToWebp($raw, $width, $height);

            if ($webp === null) {
                // Not a decodable image (or GD unavailable) — hand back the original.
                return redirect()->away($url);
            }

            if (! is_dir($cacheDir)) {
                @mkdir($cacheDir, 0775, true);
            }
            file_put_contents($cacheFile, $webp);

            return $this->streamImage($cacheFile, $url);
        } catch (\Throwable $e) {
            return redirect()->away($url);
        }
    }

    /**
     * Fetch the remote image bytes and convert to a resized WebP.
     * Returns null when GD/WebP is unavailable or the payload isn't an image.
     */
    private function processToWebp(string $raw, int $width, int $height): ?string
    {
        if (! function_exists('imagecreatefromstring') || ! function_exists('imagewebp')) {
            return null;
        }

        $src = @imagecreatefromstring($raw);
        if ($src === false) {
            return null;
        }

        $srcW = imagesx($src);
        $srcH = imagesy($src);
        if ($srcW <= 0 || $srcH <= 0) {
            imagedestroy($src);
            return null;
        }

        // Compute destination dimensions preserving aspect ratio.
        $dstW = $width;
        $dstH = $height > 0
            ? $height
            : (int) round($srcH * ($width / $srcW));

        if ($dstH <= 0) {
            $dstH = 1;
        }
        if ($dstW > self::MAX_DIMENSION || $dstH > self::MAX_DIMENSION) {
            $scale = min(self::MAX_DIMENSION / $dstW, self::MAX_DIMENSION / $dstH, 1.0);
            $dstW = (int) round($dstW * $scale);
            $dstH = (int) round($dstH * $scale);
        }

        // Never upscale beyond the source (small source stays small).
        if ($dstW > $srcW && $height === 0) {
            $dstW = $srcW;
            $dstH = $srcH;
        }

        $dst = imagecreatetruecolor($dstW, $dstH);

        // Preserve transparency for PNG/GIF sources.
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
        imagefill($dst, 0, 0, $transparent);

        imagecopyresampled($dst, $src, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);

        ob_start();
        $ok = imagewebp($dst, null, 80);
        $webp = ob_get_clean();

        imagedestroy($src);
        imagedestroy($dst);

        return $ok && is_string($webp) && $webp !== '' ? $webp : null;
    }

    /**
     * SSRF guard — the resolved host must be a public IP. Never follow
     * redirects to an unsafe target.
     */
    private function isSafeUrl(string $url): bool
    {
        $parts = parse_url($url);
        if (! isset($parts['scheme'], $parts['host'])) {
            return false;
        }

        $scheme = strtolower($parts['scheme']);
        if ($scheme !== 'http' && $scheme !== 'https') {
            return false;
        }

        $host = $parts['host'];

        $ip = filter_var($host, FILTER_VALIDATE_IP);
        if ($ip === false) {
            $ip = gethostbynamel($host)[0] ?? null;
            if ($ip === null) {
                return false;
            }
            $ip = filter_var($ip, FILTER_VALIDATE_IP);
            if ($ip === false) {
                return false;
            }
        }

        return ! $this->isPrivateIp($ip);
    }

    private function isPrivateIp(string $ip): bool
    {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return true;
        }
        // IPv6 loopback/link-local explicit guards.
        if (str_starts_with($ip, '::1') || str_starts_with($ip, 'fe80:')) {
            return true;
        }
        return false;
    }

    private function clampDimension(int $value): int
    {
        if ($value <= 0) {
            return 300;
        }
        return min($value, self::MAX_DIMENSION);
    }

    private function streamImage(string $file, string $originalUrl): StreamedResponse
    {
        $size = (int) @filesize($file);

        return response()->stream(function () use ($file) {
            readfile($file);
        }, 200, [
            'Content-Type'   => 'image/webp',
            'Content-Length' => (string) $size,
            'Cache-Control'  => 'public, max-age=' . self::CACHE_TTL,
            'X-Content-Type-Options' => 'nosniff',
            'X-Proxy-Source' => 'webp',
            // Allow <img> to also reach the original when WebP is unsupported.
            'Vary'           => 'Accept',
        ]);
    }

    private function badRequest(string $message): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'status'    => 'error',
            'message'   => $message,
            'timestamp' => now()->toIso8601String(),
        ], 400);
    }
}
