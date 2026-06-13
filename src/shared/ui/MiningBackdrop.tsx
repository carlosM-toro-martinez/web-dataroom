import type { CSSProperties } from "react";
import minerImage from "@/assets/miner.png";

type MiningBackdropVariant = "auth" | "app";

interface MiningBackdropProps {
  variant?: MiningBackdropVariant;
}

const variantStyles: Record<MiningBackdropVariant, { logoOpacity: string; labelOpacity: string; terrainOpacity: string }> = {
  auth: {
    logoOpacity: "opacity-[0.2]",
    labelOpacity: "text-[#f5c988]/70",
    terrainOpacity: "opacity-100"
  },
  app: {
    logoOpacity: "opacity-[0.12]",
    labelOpacity: "text-[#f5c988]/55",
    terrainOpacity: "opacity-80"
  }
};

export function MiningBackdrop({ variant = "app" }: MiningBackdropProps) {
  const palette = variantStyles[variant];

  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,rgba(255,177,75,0.16),transparent_36%),radial-gradient(circle_at_86%_18%,rgba(158,202,255,0.22),transparent_42%),linear-gradient(to_top,rgba(4,14,28,0.76),transparent_46%)]" />
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-[40vh] ${palette.terrainOpacity}`}>
        <div
          className="absolute bottom-0 left-[-8%] h-[36vh] w-[55vw] bg-[#0a1f3e]/80"
          style={{
            clipPath:
              "polygon(0 100%,14% 58%,27% 72%,39% 44%,54% 66%,70% 36%,84% 68%,100% 40%,100% 100%)"
          } as CSSProperties}
        />
        <div
          className="absolute bottom-0 right-[-6%] h-[32vh] w-[50vw] bg-[#0c294f]/75"
          style={{
            clipPath:
              "polygon(0 100%,13% 62%,28% 78%,42% 50%,57% 72%,73% 42%,86% 66%,100% 48%,100% 100%)"
          } as CSSProperties}
        />
      </div>
      <img
        src={minerImage}
        alt=""
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-6 right-6 h-36 w-36 md:h-44 md:w-44 ${palette.logoOpacity} drop-shadow-[0_0_36px_rgba(255,177,75,0.9)]`}
      />
      <p
        className={`pointer-events-none absolute left-6 top-6 text-[18px] font-bold uppercase tracking-[0.22em] md:text-[18px] ${palette.labelOpacity}`}
      >
        JVD Sistema Minero Integral
      </p>
    </>
  );
}
