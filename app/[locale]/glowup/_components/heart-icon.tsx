/**
 * Stylized heart used in card overlays. Filled with semi-transparent
 * black and stroked in white — readable against any photo background.
 */
export function HeartIcon({ size = 22 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="rgba(0,0,0,0.45)" stroke="#fff" strokeWidth="1.8">
      <path d="M12 20s-7-4.5-9.2-8.5C1.3 8.7 2.5 5.5 5.5 5.5c1.8 0 2.9 1 3.5 2 .6-1 1.7-2 3.5-2 3 0 4.2 3.2 2.7 6C19 15.5 12 20 12 20z" />
    </svg>
  );
}

/** Compact 5-star + numeric rating row used on every card. */
export function StarRating({
  value,
  size = 13,
  color = '#222',
}: {
  value: number;
  size?: number;
  color?: string;
}): JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-[3px] text-sm font-medium"
      style={{ color }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
      </svg>
      {value}
    </span>
  );
}
