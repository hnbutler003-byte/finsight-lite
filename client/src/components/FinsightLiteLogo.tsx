import { cn } from "@/lib/utils";

interface FinsightLiteLogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
  "data-testid"?: string;
}

/**
 * Reusable Finsight Lite brand mark rendered as a transparent, scalable SVG.
 * The bars use currentColor (defaulting to the semantic --foreground token) and
 * the accent dot plus the "Lite" wordmark use --secondary, so the logo adapts to
 * light and dark mode automatically. On always dark surfaces pass text-white.
 */
export function FinsightLiteLogo({
  size = 36,
  withWordmark = true,
  className,
  ...rest
}: FinsightLiteLogoProps) {
  const iconWidth = Math.round((200 / 220) * size);
  const finsightSize = Math.round(size * 0.6);
  const liteSize = Math.round(size * 0.46);

  return (
    <span
      className={cn("inline-flex items-end text-foreground", className)}
      style={{ gap: Math.round(size * 0.16) }}
      {...rest}
    >
      <svg
        width={iconWidth}
        height={size}
        viewBox="0 0 200 220"
        fill="none"
        {...(withWordmark
          ? { "aria-hidden": true }
          : { role: "img", "aria-label": "Finsight Lite" })}
        className="shrink-0"
      >
        <rect x="18" y="138" width="44" height="70" rx="22" fill="currentColor" />
        <rect x="84" y="94" width="44" height="114" rx="22" fill="currentColor" />
        <rect x="150" y="40" width="44" height="168" rx="22" fill="currentColor" />
        <circle cx="172" cy="24" r="20" style={{ fill: "hsl(var(--secondary))" }} />
      </svg>
      {withWordmark && (
        <span className="font-display font-extrabold leading-[0.92] text-left">
          <span className="block" style={{ fontSize: finsightSize }}>
            Finsight
          </span>
          <span
            className="block"
            style={{ fontSize: liteSize, color: "hsl(var(--secondary))" }}
          >
            Lite
          </span>
        </span>
      )}
    </span>
  );
}

export default FinsightLiteLogo;
