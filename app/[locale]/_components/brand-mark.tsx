/**
 * glow-up K monogram — single source of truth for the brand mark.
 *
 * Two variants from the design (GlowUp Logo (standalone).html):
 *   - 'spark' (default): K with three rising sparks. Used at all sizes
 *     above ~24px where the spark is still readable. The mark of
 *     choice for nav lockups, og-images, and the lockup with the
 *     "glow-up" wordmark.
 *   - 'bold': solid K with no sparks. Used at favicon/tiny sizes where
 *     the spark would smudge into the K stem. Also the simpler shape
 *     for monochrome reversed-on-dark contexts.
 *
 * `color` is mapped to `stroke` (the K is line-art); pass any CSS
 * color including the brand `#ff385c` or `#fff` for reversed lockups.
 */
export function BrandMark({
  size = 30,
  color = '#ff385c',
  variant = 'spark',
  className,
  ariaLabel = 'glow-up',
}: {
  size?: number;
  color?: string;
  variant?: 'spark' | 'bold';
  className?: string;
  ariaLabel?: string;
}): JSX.Element {
  const stroke = color;
  if (variant === 'bold') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        className={className}
        aria-label={ariaLabel}
      >
        <path d="M30 16 V84" stroke={stroke} strokeWidth="19" strokeLinecap="round" />
        <path d="M68 16 L33 50 L68 84" stroke={stroke} strokeWidth="19" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // spark (primary)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-label={ariaLabel}
    >
      <path d="M31 16 V84" stroke={stroke} strokeWidth="13" strokeLinecap="round" />
      <path d="M31 51 L70 84" stroke={stroke} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31 51 L66 23" stroke={stroke} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      {/* Three sparks above the upper arm */}
      <path d="M71 13 L79 6" stroke={stroke} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M76 22 L86 19" stroke={stroke} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M62 8 L65 -1" stroke={stroke} strokeWidth="6.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Full lockup: K mark + "glow-up" wordmark, side by side, all in one
 * color. Defaults to brand red on white; pass `color="#fff"` for the
 * reversed-on-dark version (footer, dark hero overlays).
 */
export function BrandLockup({
  height = 30,
  color = '#ff385c',
  gap = 8,
  fontSize,
}: {
  height?: number;
  color?: string;
  gap?: number;
  /** Wordmark size — defaults to ~height × 0.73 for visual balance. */
  fontSize?: number;
}): JSX.Element {
  const wordSize = fontSize ?? Math.round(height * 0.73);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap }}>
      <BrandMark size={height} color={color} variant="spark" />
      <span
        style={{
          fontWeight: 800,
          fontSize: wordSize,
          letterSpacing: '-0.035em',
          color,
          lineHeight: 1,
        }}
      >
        glow-up
      </span>
    </span>
  );
}
