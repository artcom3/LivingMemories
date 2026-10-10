"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, FileText, ImageIcon, Mic, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MemoryOverview } from "@/lib/memories/service";
import { hasContext } from "@/lib/memories/shared";

const resourceTypes = [
  { type: "PHOTO", icon: ImageIcon, singular: "photo", plural: "photos" },
  { type: "AUDIO", icon: Mic, singular: "audio", plural: "audios" },
  { type: "VIDEO", icon: Video, singular: "video", plural: "videos" },
  { type: "TEXT", icon: FileText, singular: "text", plural: "texts" },
] as const;

export function MemoryCard({
  memory,
  familyId,
}: {
  memory: MemoryOverview["memories"][number];
  familyId: string;
}) {
  const base = `/families/${familyId}`;
  const href = `${base}/memories/${memory.id}`;
  const cover = memory.sources.find(
    (source) =>
      source.type === "PHOTO" &&
      ["image/jpeg", "image/png", "image/webp"].includes(source.mimeType || ""),
  );
  const coverSrc = cover
    ? `/api/families/${familyId}/content/memories/${memory.id}/sources/${cover.id}`
    : null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showCover = coverSrc && coverSrc !== failedSrc;
  const missingDetails = memory.sources.filter(
    (source) => !hasContext(source),
  ).length;

  return (
    <Card className="memory-card" data-cover={showCover ? "true" : undefined}>
      {showCover ? (
        <Link
          href={href}
          className="memory-card-cover"
          tabIndex={-1}
          aria-hidden="true"
        >
          <Image
            src={coverSrc}
            alt=""
            fill
            unoptimized
            loading="lazy"
            sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
            onError={() => setFailedSrc(coverSrc)}
          />
        </Link>
      ) : null}
      <CardHeader>
        <CardTitle>
          <h2>
            <Link href={href}>{memory.title}</Link>
          </h2>
        </CardTitle>
        {memory.description?.trim() ? (
          <CardDescription className="memory-card-summary">
            {memory.description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="memory-card-content">
        {memory.collection || memory.narrator ? (
          <dl className="memory-card-meta">
            {memory.collection ? (
              <div>
                <dt>Album:</dt>
                <dd>{memory.collection.name}</dd>
              </div>
            ) : null}
            {memory.narrator ? (
              <div>
                <dt>Storyteller:</dt>
                <dd>{memory.narrator.name}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        {memory.sources.length ? (
          <ul
            className="memory-card-resources"
            aria-label="Materials in this memory"
          >
            {resourceTypes.map(({ type, icon: Icon, singular, plural }) => {
              const count = memory.sources.filter(
                (source) => source.type === type,
              ).length;
              return count ? (
                <li key={type}>
                  <Icon aria-hidden="true" />
                  <span>
                    {count} {count === 1 ? singular : plural}
                  </span>
                </li>
              ) : null;
            })}
          </ul>
        ) : null}
        {missingDetails ? (
          <p className="memory-card-details muted">
            {missingDetails}{" "}
            {missingDetails === 1 ? "material needs" : "materials need"} a
            description
          </p>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline">
          <Link href={href}>
            Open memory
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
        {memory.sources.length ? (
          <Button asChild variant="ghost">
            <Link href={`${base}/stories/new?memory=${memory.id}`}>
              Prepare story
            </Link>
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
