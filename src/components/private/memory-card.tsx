"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, ViewTransition } from "react";
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
import { hasContext, memoryCoverSource } from "@/lib/memories/shared";

// Opening a memory goes one level deeper: the page slides in from the right
// and the cover grows into the photo on the memory page (memory-editor.tsx).
const forward = ["nav-forward"];

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
  const cover = memoryCoverSource(memory.sources);
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
        <ViewTransition
          name={`memory-cover-${memory.id}`}
          share="morph"
          default="none"
        >
          <Link
            href={href}
            transitionTypes={forward}
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
        </ViewTransition>
      ) : null}
      <CardHeader>
        <CardTitle>
          <h2>
            <Link href={href} transitionTypes={forward}>
              {memory.title}
            </Link>
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
          <Link href={href} transitionTypes={forward}>
            Open memory
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
        {memory.sources.length ? (
          <Button asChild variant="ghost">
            <Link
              href={`${base}/stories/new?memory=${memory.id}`}
              transitionTypes={forward}
            >
              Prepare story
            </Link>
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
