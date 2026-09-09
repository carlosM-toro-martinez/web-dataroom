import { useEffect, useState, type CSSProperties, type MouseEventHandler } from "react";
import {
  authenticatedDataRoomMediaRequest,
  isAuthenticatedDataRoomMedia
} from "@/features/exploraciones/lib/authenticatedMedia";

interface AuthenticatedMediaVideoProps {
  src: string;
  loaded: boolean;
  onLoad: () => void;
  draggable?: boolean;
  onMouseDown?: MouseEventHandler<HTMLVideoElement>;
  className?: string;
  style?: CSSProperties;
}

export function AuthenticatedMediaVideo({
  src,
  loaded,
  onLoad,
  draggable,
  onMouseDown,
  className,
  style
}: AuthenticatedMediaVideoProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isAuthenticatedDataRoomMedia(src)) {
      setObjectUrl(null);
      setFailed(false);
      return;
    }

    const controller = new AbortController();
    let nextObjectUrl: string | null = null;
    setObjectUrl(null);
    setFailed(false);

    const load = async () => {
      try {
        const request = authenticatedDataRoomMediaRequest(src);
        const response = await fetch(request.url, {
          headers: request.headers,
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`Media request failed with ${response.status}`);
        const blob = await response.blob();
        nextObjectUrl = URL.createObjectURL(blob);
        setObjectUrl(nextObjectUrl);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Unable to load authenticated media", error);
          setFailed(true);
        }
      }
    };

    void load();

    return () => {
      controller.abort();
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [src]);

  const shouldUseObjectUrl = isAuthenticatedDataRoomMedia(src);
  const videoSrc = shouldUseObjectUrl ? objectUrl : src;

  return (
    <>
      <video
        src={videoSrc ?? undefined}
        draggable={draggable}
        onMouseDown={onMouseDown}
        onLoadedData={onLoad}
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        className={className}
        style={style}
      />
      {failed ? (
        <div className="absolute inset-x-4 bottom-4 rounded bg-red-950/80 px-3 py-2 text-center text-xs font-semibold text-white">
          No se pudo cargar el modelo
        </div>
      ) : null}
      {shouldUseObjectUrl && !videoSrc && !loaded ? (
        <span className="sr-only">Loading authenticated media</span>
      ) : null}
    </>
  );
}
