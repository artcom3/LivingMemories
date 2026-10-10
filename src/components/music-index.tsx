"use client";
import { RevealItem, RevealList } from "@/components/motion/reveal";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Clock,
  FileText,
  Globe,
  Music,
  Play,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { FormField } from "@/components/private/form-field";
import { Feedback } from "@/components/private/content-primitives";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  musicStyles,
  creationStatusLabels,
  type Artifact,
} from "@/lib/creations/shared";
import type { musicPreparations } from "@/lib/creations/service";

type Piece = Awaited<ReturnType<typeof musicPreparations>>[number];
const statuses = {
  all: "All music",
  preparation: "In preparation",
  REVIEW: "Ready for review",
  progress: "In progress",
  READY: "Ready to listen",
  FAILED: "Needs attention",
};
function stage(piece: Piece) {
  const status = piece.creations[0]?.status;
  return !status
    ? "preparation"
    : ["REVIEW", "READY", "FAILED"].includes(status)
      ? status
      : "progress";
}

function MusicPlayer({ familyId, piece }: { familyId: string; piece: Piece }) {
  const [asset, setAsset] = useState<string | null>(null);
  const [error, setError] = useState("");
  const creationId = piece.creations[0]?.id;
  useEffect(() => {
    const controller = new AbortController();
    const base = `/api/families/${familyId}/content/creations/${creationId}`;
    async function load() {
      try {
        const response = await fetch(base, { signal: controller.signal });
        if (!response.ok)
          throw new Error(
            "This version is unavailable. A material may have been removed or your access may have changed.",
          );
        const run: { status: string; artifacts: Omit<Artifact, "key">[] } =
          await response.json();
        const audio = run.artifacts.find((item) => item.type === "MUSIC");
        if (run.status !== "READY" || !audio)
          throw new Error(
            "The audio for this version is not available yet. Open the preparation to check its progress.",
          );
        if (!controller.signal.aborted) setAsset(`${base}/assets/${audio.id}`);
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "We could not load this music.",
          );
      }
    }
    void load();
    return () => controller.abort();
  }, [familyId, creationId]);
  return (
    <div className="music-player">
      {error ? (
        <Feedback className="error" role="alert">
          {error}
        </Feedback>
      ) : asset ? (
        <audio
          controls
          preload="metadata"
          src={asset}
          aria-label={`Listen to ${piece.title}`}
          onError={() =>
            setError(
              "We could not play this audio. Open the preparation to check this version.",
            )
          }
        />
      ) : (
        <p className="muted" role="status">
          Loading music…
        </p>
      )}
      <p className="muted">
        {musicStyles[piece.style as keyof typeof musicStyles]?.label} ·{" "}
        {piece.instrumental ? "Instrumental" : "With lyrics"}
      </p>
      <Button asChild variant="outline">
        <Link href={`/families/${familyId}/music/${piece.id}`}>
          Open preparation
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

export function MusicIndex({
  familyId,
  familyName,
  role,
  items,
}: {
  familyId: string;
  familyName: string;
  role: string;
  items: Piece[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [listening, setListening] = useState<Piece | null>(null);
  const base = `/families/${familyId}`;
  const reader = role === "READER";
  const visible = items.filter(
    (item) =>
      (filter === "all" || stage(item) === filter) &&
      [
        item.title,
        musicStyles[item.style as keyof typeof musicStyles]?.label,
      ].some((value) =>
        value?.toLowerCase().includes(query.trim().toLowerCase()),
      ),
  );
  return (
    <section className="reveal-blocks">
      <div className="memories-heading">
        <div>
          <span className="eyebrow">{familyName} · Private group</span>
          <h1>Your music</h1>
          <p className="muted">
            Give the moments you treasure their own melody.
          </p>
        </div>
        {!reader && (
          <Button asChild>
            <Link href={`${base}/music/new`}>
              <Plus aria-hidden="true" />
              Prepare music
            </Link>
          </Button>
        )}
      </div>
      {reader ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              <h2>Shared music will live here</h2>
            </EmptyTitle>
            <EmptyDescription>
              Preparations and test versions stay private until your group can
              share them.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {items.length > 0 && (
            <>
              <div className="stories-filters">
                <FormField
                  control={
                    <Input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by title or style"
                    />
                  }
                >
                  Search music
                </FormField>
                <FormField
                  control={
                    <NativeSelect
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                    >
                      {Object.entries(statuses).map(([value, label]) => (
                        <NativeSelectOption key={value} value={value}>
                          {label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  }
                >
                  Status
                </FormField>
              </div>
              <p className="stories-count muted" role="status">
                {visible.length} {visible.length === 1 ? "piece" : "pieces"}
                {query || filter !== "all" ? ` of ${items.length}` : ""}
              </p>
            </>
          )}
          {visible.length ? (
            <RevealList as="div" className="memory-card-grid">
              {visible.map((piece) => {
                const status = piece.creations[0]?.status;
                const currentStage = stage(piece);
                const href = `${base}/music/${piece.id}`;
                const action =
                  status === "REVIEW"
                    ? "Review proposal"
                    : currentStage === "progress"
                      ? "View progress"
                      : status === "FAILED"
                        ? "Review and retry"
                        : "Continue preparation";
                return (
                  <RevealItem as="div" className="reveal-cell" key={piece.id}>
                    <Card className="story-card music-card">
                      <CardHeader>
                        <Badge
                          variant={
                            status === "FAILED" ? "destructive" : "secondary"
                          }
                          className="story-status"
                        >
                          {status === "READY"
                            ? "Ready to listen"
                            : status
                              ? creationStatusLabels[status]
                              : "In preparation"}
                        </Badge>
                        <CardTitle>
                          <h2>
                            <Link href={href}>{piece.title}</Link>
                          </h2>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="music-style">
                          <Music aria-hidden="true" />
                          {musicStyles[piece.style as keyof typeof musicStyles]
                            ?.label || piece.style}
                        </p>
                        <dl className="story-facts">
                          <div>
                            <dt>
                              <Clock aria-hidden="true" />
                              Planned duration
                            </dt>
                            <dd>{piece.durationSeconds} seconds</dd>
                          </div>
                          <div>
                            <dt>
                              <Music aria-hidden="true" />
                              Format
                            </dt>
                            <dd>
                              {piece.instrumental
                                ? "Instrumental"
                                : "With lyrics"}
                            </dd>
                          </div>
                          {!piece.instrumental && (
                            <div>
                              <dt>
                                <Globe aria-hidden="true" />
                                Lyrics language
                              </dt>
                              <dd>
                                {piece.language === "es"
                                  ? "Spanish"
                                  : piece.language === "en"
                                    ? "English"
                                    : piece.language}
                              </dd>
                            </div>
                          )}
                          <div>
                            <dt>
                              <FileText aria-hidden="true" />
                              Selected materials
                            </dt>
                            <dd>{piece.sources.length}</dd>
                          </div>
                        </dl>
                      </CardContent>
                      <CardFooter>
                        {status === "READY" ? (
                          <>
                            <Button
                              className="w-full"
                              onClick={() => setListening(piece)}
                            >
                              <Play aria-hidden="true" />
                              Listen
                            </Button>
                            <Button asChild variant="ghost">
                              <Link href={href}>Edit preparation</Link>
                            </Button>
                          </>
                        ) : (
                          <Button asChild variant="outline">
                            <Link href={href}>
                              {action}
                              <ArrowRight aria-hidden="true" />
                            </Link>
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  </RevealItem>
                );
              })}
            </RevealList>
          ) : (
            <Empty className="stories-empty">
              <EmptyHeader>
                <EmptyTitle>
                  <h2>
                    {items.length
                      ? "No music matches your search"
                      : "Give a memory its own music"}
                  </h2>
                </EmptyTitle>
                <EmptyDescription>
                  {items.length
                    ? "Try another title, style or status to find your music."
                    : "Choose photos, recordings or written memories you have saved, then create an instrumental piece or a song."}
                </EmptyDescription>
              </EmptyHeader>
              {items.length ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href={`${base}/music/new`}>Choose your materials</Link>
                </Button>
              )}
            </Empty>
          )}
          <p className="stories-note muted">
            Preparations and test versions stay private. Review the musical
            proposal and any lyrics before generating the audio.
          </p>
        </>
      )}
      <Dialog
        open={Boolean(listening)}
        onOpenChange={(open) => {
          if (!open) setListening(null);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:max-w-xl">
          <DialogHeader className="pr-10">
            <DialogTitle>{listening?.title}</DialogTitle>
            <DialogDescription>
              Listen to your music. Playback starts when you press play.
            </DialogDescription>
          </DialogHeader>
          {listening && (
            <MusicPlayer
              key={listening.id}
              familyId={familyId}
              piece={listening}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
