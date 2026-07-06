import { ImageIcon } from "lucide-react";

interface OrgLogoProps {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
}

export default function OrgLogo({ src, alt = "Organisation logo", size = 160, className = "" }: OrgLogoProps) {
  return (
    <div
      className={`rounded-2xl border-2 border-dashed border-input bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size }}
      data-testid="org-logo-container"
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain p-2"
          style={{ maxWidth: size - 16, maxHeight: size - 16 }}
          data-testid="org-logo-img"
        />
      ) : (
        <div className="text-center text-muted-foreground p-3">
          <ImageIcon className="w-8 h-8 mx-auto mb-2" />
          <p className="text-xs">No logo set</p>
          <p className="text-[10px] mt-1">(default will be used)</p>
        </div>
      )}
    </div>
  );
}
