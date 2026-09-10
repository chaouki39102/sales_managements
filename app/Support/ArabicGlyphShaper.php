<?php

namespace App\Support;

/**
 * Pure-PHP Arabic contextual-form shaper for engines that do not shape Arabic
 * themselves (barryvdh/laravel-dompdf). It rewrites Arabic letter codepoints
 * (U+0621–U+0652) to their Unicode presentation forms (U+FE70–U+FEFF,
 * "Arabic Presentation Forms-B") following the classic two-letter joining
 * algorithm used by ar-php / I18N_Arabic.
 *
 * Everything that is not an Arabic letter is passed through byte-identical,
 * so the shaper is safe to run over an entire rendered HTML document: markup,
 * ASCII/Latin runs, HTML entities and digits are untouched. Any non-Arabic
 * codepoint (space, newline, `<`, Latin letter, digit, ...) resets the joining
 * chain, which is exactly the desired word boundary behaviour.
 */
class ArabicGlyphShaper
{
    /** Arabic letters that join on BOTH sides (have isolated/final/initial/medial forms). */
    private const DUAL_JOINING = [
        0x0628, 0x062A, 0x062B, 0x062C, 0x062D, 0x062E, // ب ت ث ج ح خ
        0x0633, 0x0634, 0x0635, 0x0636, 0x0637, 0x0638, // س ش ص ض ط ظ
        0x0639, 0x063A, 0x0641, 0x0642, 0x0643, 0x0644, // ع غ ف ق ك ل
        0x0645, 0x0646, 0x0647, 0x064A,               // م ن ه ي
    ];

    /** Arabic letters that join only BACKWARD (isolated/final only). */
    private const RIGHT_JOINING = [
        0x0622, 0x0623, 0x0624, 0x0625, 0x0627, // آ أ ؤ إ ا
        0x0629, 0x062F, 0x0630, 0x0631, 0x0632, // ة د ذ ر ز
        0x0648, 0x0649,                         // و ى
    ];

    /** Dual-joining letter contextual forms: base -> [iso, final, initial, medial]. */
    private const DUAL_FORMS = [
        0x0628 => [0xFE8F, 0xFE90, 0xFE91, 0xFE92],
        0x062A => [0xFE95, 0xFE96, 0xFE97, 0xFE98],
        0x062B => [0xFE99, 0xFE9A, 0xFE9B, 0xFE9C],
        0x062C => [0xFE9D, 0xFE9E, 0xFE9F, 0xFEA0],
        0x062D => [0xFEA1, 0xFEA2, 0xFEA3, 0xFEA4],
        0x062E => [0xFEA5, 0xFEA6, 0xFEA7, 0xFEA8],
        0x0633 => [0xFEB1, 0xFEB2, 0xFEB3, 0xFEB4],
        0x0634 => [0xFEB5, 0xFEB6, 0xFEB7, 0xFEB8],
        0x0635 => [0xFEB9, 0xFEBA, 0xFEBB, 0xFEBC],
        0x0636 => [0xFEBD, 0xFEBE, 0xFEBF, 0xFEC0],
        0x0637 => [0xFEC1, 0xFEC2, 0xFEC3, 0xFEC4],
        0x0638 => [0xFEC5, 0xFEC6, 0xFEC7, 0xFEC8],
        0x0639 => [0xFEC9, 0xFECA, 0xFECB, 0xFECC],
        0x063A => [0xFECD, 0xFECE, 0xFECF, 0xFED0],
        0x0641 => [0xFED1, 0xFED2, 0xFED3, 0xFED4],
        0x0642 => [0xFED5, 0xFED6, 0xFED7, 0xFED8],
        0x0643 => [0xFED9, 0xFEDA, 0xFEDB, 0xFEDC],
        0x0644 => [0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0],
        0x0645 => [0xFEE1, 0xFEE2, 0xFEE3, 0xFEE4],
        0x0646 => [0xFEE5, 0xFEE6, 0xFEE7, 0xFEE8],
        0x0647 => [0xFEE9, 0xFEEA, 0xFEEB, 0xFEEC],
        0x064A => [0xFEF1, 0xFEF2, 0xFEF3, 0xFEF4],
    ];

    /** Right-joining letters: base -> final form (isolated stays the base char). */
    private const RIGHT_FORMS = [
        0x0622 => 0xFE82,
        0x0623 => 0xFE84,
        0x0624 => 0xFE86,
        0x0625 => 0xFE88,
        0x0627 => 0xFE8D,
        0x0629 => 0xFE93,
        0x062F => 0xFEAA,
        0x0630 => 0xFEAC,
        0x0631 => 0xFEAE,
        0x0632 => 0xFEB0,
        0x0648 => 0xFEED,
        0x0649 => 0xFEF0,
    ];

    /** Lam + alef ligatures: alef codepoint -> [isolated, final]. */
    private const LAM_ALEF = [
        0x0623 => [0xFEF5, 0xFEF6], // ل + أ
        0x0622 => [0xFEF7, 0xFEF8], // ل + آ
        0x0627 => [0xFEF9, 0xFEFA, 0xFEFB, 0xFEFC], // ل + ا (iso, final, initial, medial)
    ];

    /** Arabic diacritics (fatha, damma, ...): passed through, do not break the chain. */
    private const DIACRITICS = [0x064B, 0x064C, 0x064D, 0x064E, 0x064F, 0x0650, 0x0651, 0x0652];

    /**
     * Shape all Arabic letter runs in $text to their contextual presentation forms.
     */
    public static function shape(string $text): string
    {
        $chars = self::decode($text);
        $n = count($chars);
        $out = '';
        $hasPrev = false; // does the previous emitted Arabic character join forward?

        for ($i = 0; $i < $n; $i++) {
            $c = $chars[$i];

            if (!$c || !self::isArabic($c)) {
                $out .= self::encode($c);
                $hasPrev = false;
                continue;
            }

            // Diacritics: keep in place, chain unaffected.
            if (in_array($c, self::DIACRITICS, true)) {
                $out .= self::encode($c);
                continue;
            }

            // Tatweel: connecting on both sides, rendered as-is.
            if ($c === 0x0640) {
                $out .= self::encode($c);
                $hasPrev = true;
                continue;
            }

            // Isolated hamza: only one form, breaks the chain.
            if ($c === 0x0621) {
                $out .= self::encode($c);
                $hasPrev = false;
                continue;
            }

            // Lam + alef ligatures.
            if ($c === 0x0644 && $i + 1 < $n) {
                $next = $chars[$i + 1];
                if (isset(self::LAM_ALEF[$next])) {
                    $forms = self::LAM_ALEF[$next];
                    if (count($forms) === 2) {
                        $form = $hasPrev ? $forms[1] : $forms[0]; // isolated / final only
                    } else {
                        $form = $hasPrev
                            ? (self::connectsBack($chars, $i + 2) ? $forms[3] : $forms[1])
                            : (self::connectsBack($chars, $i + 2) ? $forms[2] : $forms[0]);
                    }
                    $out .= self::encode($form);
                    $hasPrev = true; // the ligature joins forward too
                    $i++;
                    continue;
                }
            }

            if (in_array($c, self::DUAL_JOINING, true)) {
                $forms = self::DUAL_FORMS[$c];
                $connects = self::connectsBack($chars, $i + 1);
                $form = $hasPrev
                    ? ($connects ? $forms[3] : $forms[1]) // medial / final
                    : ($connects ? $forms[2] : $forms[0]); // initial / isolated
                $out .= self::encode($form);
                $hasPrev = true;
                continue;
            }

            if (in_array($c, self::RIGHT_JOINING, true)) {
                $out .= self::encode($hasPrev ? self::RIGHT_FORMS[$c] : $c);
                $hasPrev = false;
                continue;
            }

            // Any other Arabic codepoint (unmapped) — keep as-is, break chain.
            $out .= self::encode($c);
            $hasPrev = false;
        }

        return $out;
    }

    /**
     * Does the character at $idx accept a backward connection (so the previous
     * letter must render in its initial/medial form)?
     */
    private static function connectsBack(array $chars, int $idx): bool
    {
        if ($idx >= count($chars)) {
            return false;
        }
        $c = $chars[$idx];
        if (in_array($c, self::DIACRITICS, true)) {
            return self::connectsBack($chars, $idx + 1);
        }
        return $c === 0x0640 || in_array($c, self::DUAL_JOINING, true) || in_array($c, self::RIGHT_JOINING, true);
    }

    private static function isArabic(int $c): bool
    {
        return ($c >= 0x0621 && $c <= 0x0652);
    }

    /** Decode a UTF-8 string to an array of codepoints. */
    private static function decode(string $s): array
    {
        $out = [];
        $len = strlen($s);
        for ($i = 0; $i < $len;) {
            $b = ord($s[$i]);
            if ($b < 0x80) {
                $out[] = $b;
                $i++;
            } elseif (($b & 0xE0) === 0xC0) {
                $out[] = (($b & 0x1F) << 6) | (ord($s[$i + 1]) & 0x3F);
                $i += 2;
            } elseif (($b & 0xF0) === 0xE0) {
                $out[] = (($b & 0x0F) << 12) | ((ord($s[$i + 1]) & 0x3F) << 6) | (ord($s[$i + 2]) & 0x3F);
                $i += 3;
            } elseif (($b & 0xF8) === 0xF0) {
                $out[] = (($b & 0x07) << 18) | ((ord($s[$i + 1]) & 0x3F) << 12)
                    | ((ord($s[$i + 2]) & 0x3F) << 6) | (ord($s[$i + 3]) & 0x3F);
                $i += 4;
            } else {
                $i++; // malformed byte — skip
            }
        }
        return $out;
    }

    /** Encode a single codepoint back to a UTF-8 string. */
    private static function encode(int $c): string
    {
        if ($c < 0x80) {
            return chr($c);
        }
        if ($c < 0x800) {
            return chr(0xC0 | ($c >> 6)) . chr(0x80 | ($c & 0x3F));
        }
        if ($c < 0x10000) {
            return chr(0xE0 | ($c >> 12)) . chr(0x80 | (($c >> 6) & 0x3F)) . chr(0x80 | ($c & 0x3F));
        }
        return chr(0xF0 | ($c >> 18)) . chr(0x80 | (($c >> 12) & 0x3F))
            . chr(0x80 | (($c >> 6) & 0x3F)) . chr(0x80 | ($c & 0x3F));
    }
}