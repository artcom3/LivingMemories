"use client";
import Image from "next/image";
import { useState, ViewTransition } from "react";
import { Images } from "lucide-react";
export function AlbumCover({
  src,
  name,
  transitionName,
}: {
  src: string | null;
  name: string;
  /** Grows into the album page's banner (album-index.tsx). */
  transitionName?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <ViewTransition name={transitionName} share="morph" default="none">
      <div className="album-cover">
        {src && src !== failedSrc ? (
          <Image
            src={src}
            alt={`Photo from album ${name}`}
            fill
            unoptimized
            loading="lazy"
            sizes="(max-width: 700px) 100vw, 33vw"
            onError={() => setFailedSrc(src)}
          />
        ) : (
          <div className="album-cover-fallback">
            <Images aria-hidden="true" />
            <span>Your family album</span>
          </div>
        )}
      </div>
    </ViewTransition>
  );
}
