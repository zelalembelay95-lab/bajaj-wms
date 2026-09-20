interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * The GUZO mark: an ascending arrow rising from a departure point — "guzo"
 * (Amharic: journey/trip), read here as a trade route: goods departing,
 * ascending, arriving. Built once as a component (rather than duplicated
 * inline) so every size in the app stays pixel-identical to
 * /public/logo.svg, which is the same mark used for the favicon.
 */
export function Logo({ size = 40, className }: LogoProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label="GUZO">
      <rect x="0" y="0" width="100" height="100" rx="22" fill="#F5A524" />
      <circle cx="18" cy="82" r="8" fill="#2DD4BF" />
      <line x1="30" y1="70" x2="65" y2="35" stroke="#14171A" strokeWidth="12" strokeLinecap="round" />
      <polygon points="79.14,20.86 71.36,41.36 58.64,28.64" fill="#14171A" />
    </svg>
  );
}
