import { X } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ClickableImageProps {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
  style?: CSSProperties;
  children?: ReactNode;
}

export default function ClickableImage({
  src,
  alt,
  className = "",
  imageClassName = "",
  loading = "lazy",
  style,
  children
}: ClickableImageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className={`clickable-image block overflow-hidden text-left ${className}`}
        style={style}
        onClick={() => setIsOpen(true)}
        aria-label={`View ${alt}`}
      >
        <img src={src} alt={alt} className={imageClassName} loading={loading} />
        {children}
      </button>

      {isOpen && mounted ? createPortal(
        <div
          className="image-lightbox fixed inset-0 z-[9999] flex items-center justify-center bg-[#061017]/94 p-3 md:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setIsOpen(false)}
        >
          <button
            type="button"
            className="absolute right-3 top-3 z-[10000] flex h-10 w-10 items-center justify-center bg-white text-[#10252d] shadow-xl transition hover:bg-[#f0b35f] md:right-6 md:top-6 md:h-11 md:w-11"
            onClick={(event) => {
              event.stopPropagation();
              setIsOpen(false);
            }}
            aria-label="Close image"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={src}
            alt={alt}
            className="image-lightbox__image max-h-[86vh] max-w-[96vw] object-contain shadow-2xl md:max-h-[88vh] md:max-w-[94vw]"
            onClick={(event) => event.stopPropagation()}
          />
        </div>,
        document.body
      ) : null}
    </>
  );
}
