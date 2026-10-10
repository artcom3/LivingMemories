"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Pencil, BookOpen, Mic, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StoryPreparationForm } from "@/components/story-preparation-form";
import { CreationWorkspace } from "@/components/creation-workspace";
import { readerProfiles, type ReaderProfile } from "@/lib/memories/shared";
import { narrativeStyles } from "@/lib/creations/shared";
import type { MemoryOverview, storyPreparation } from "@/lib/memories/service";

type Preparation = Awaited<ReturnType<typeof storyPreparation>>;
export function StoryDetail({
  familyId,
  familyName,
  preparation,
  memories,
}: {
  familyId: string;
  familyName: string;
  preparation: Preparation;
  memories: MemoryOverview["memories"];
}) {
  const [editing, setEditing] = useState(false);
  const base = `/families/${familyId}`;
  const memory = memories.find((item) => item.id === preparation.memoryId);
  return (
    <section className="story-detail">
      <Link className="back-link story-back" href={`${base}/stories`}>
        <ArrowLeft aria-hidden="true" />
        All stories
      </Link>
      <div className="memories-heading">
        <div>
          <span className="eyebrow">{familyName} · Private story</span>
          <h1>{preparation.title}</h1>
          <p className="muted">
            A story shaped from your memories, ready to make your own.
          </p>
        </div>
        <Button variant="outline" onClick={() => setEditing(true)}>
          <Pencil aria-hidden="true" />
          Edit preparation
        </Button>
      </div>
      {preparation.episodeId ? (
        <p className="feedback">
          Based on one reviewed story fragment. The rest of the original material is not included.{' '}
          <Link href={`${base}/stories/discovered#episode-${preparation.episodeId}`}>Review the original fragment</Link>
        </p>
      ) : null}
      <div className="story-detail-layout">
        <CreationWorkspace
          familyId={familyId}
          kind="stories"
          preparationId={preparation.id}
        />
        <aside className="story-preparation-summary">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Story preparation</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="story-summary-facts">
                <div>
                  <dt>Main memory</dt>
                  <dd>
                    {memory ? (
                      <Link href={`${base}/memories/${memory.id}`}>
                        {memory.title}
                      </Link>
                    ) : (
                      "Memory unavailable"
                    )}
                  </dd>
                </div>
                {memory?.narrator && (
                  <div>
                    <dt>Storyteller</dt>
                    <dd>{memory.narrator.name}</dd>
                  </div>
                )}
                {memory?.collection && (
                  <div>
                    <dt>Album</dt>
                    <dd>
                      <Link
                        href={`${base}/albums?album=${memory.collection.id}`}
                      >
                        {memory.collection.name}
                      </Link>
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Reader</dt>
                  <dd>
                    {readerProfiles[preparation.readerProfile as ReaderProfile]
                      ?.label || preparation.readerProfile}
                  </dd>
                </div>
                <div>
                  <dt>Language</dt>
                  <dd>
                    {preparation.language === "es"
                      ? "Spanish"
                      : preparation.language === "en"
                        ? "English"
                        : preparation.language}
                  </dd>
                </div>
                <div>
                  <dt>Planned length</dt>
                  <dd>{preparation.pages} pages</dd>
                </div>
                <div>
                  <dt>Selected materials</dt>
                  <dd>{preparation.sources.length}</dd>
                </div>
                <div>
                  <dt>Story style</dt>
                  <dd>
                    {narrativeStyles[
                      preparation.narrativeStyle as keyof typeof narrativeStyles
                    ]?.label || preparation.narrativeStyle}
                  </dd>
                </div>
              </dl>
              <div className="story-output-options">
                <span>
                  <BookOpen aria-hidden="true" />
                  Text
                </span>
                {preparation.narrate && (
                  <span>
                    <Mic aria-hidden="true" />
                    Narration
                  </span>
                )}
                {preparation.illustrate && (
                  <span>
                    <ImageIcon aria-hidden="true" />
                    Illustrations
                  </span>
                )}
              </div>
              <p className="form-hint">
                Changes apply to your next draft. Existing versions keep their
                saved text and materials.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:max-w-3xl">
          <DialogHeader className="pr-10">
            <DialogTitle>Edit story preparation</DialogTitle>
            <DialogDescription>
              Choose the memories, materials and reading style for your next
              draft.
            </DialogDescription>
          </DialogHeader>
          <StoryPreparationForm
            familyId={familyId}
            memories={memories}
            preparation={preparation}
            compact
            onSaved={() => setEditing(false)}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
