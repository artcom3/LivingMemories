"use client";
import Image from "next/image";
import { useState } from "react";
import { Images } from "lucide-react";
export function AlbumCover({
  src,
  name,
}: {
  src: string | null;
  name: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
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
  );
}
