"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MusicPreparationForm } from "@/components/music-preparation-form";
import { CreationWorkspace } from "@/components/creation-workspace";
import { musicStyles } from "@/lib/creations/shared";
import type { musicPreparation } from "@/lib/creations/service";
import type { MemoryOverview } from "@/lib/memories/service";

type Preparation = Awaited<ReturnType<typeof musicPreparation>>;
export function MusicDetail({
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
  const selected = new Set(
    preparation.sources.map((source) => source.sourceId),
  );
  const origins = memories.filter((memory) =>
    memory.sources.some((source) => selected.has(source.id)),
  );
  const activeCount = origins.reduce(
    (count, memory) =>
      count + memory.sources.filter((source) => selected.has(source.id)).length,
    0,
  );
  return (
    <section className="story-detail">
      <Link className="back-link story-back" href={`${base}/music`}>
        <ArrowLeft aria-hidden="true" />
        All music
      </Link>
      <div className="memories-heading">
        <div>
          <span className="eyebrow">{familyName} · Private music</span>
          <h1>{preparation.title}</h1>
          <p className="muted">
            An original piece inspired by the moments you treasure.
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
          kind="music"
          preparationId={preparation.id}
        />
        <aside className="story-preparation-summary">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Music preparation</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="story-summary-facts">
                <div>
                  <dt>Music style</dt>
                  <dd>
                    {musicStyles[preparation.style as keyof typeof musicStyles]
                      ?.label || preparation.style}
                  </dd>
                </div>
                <div>
                  <dt>Format</dt>
                  <dd>
                    {preparation.instrumental ? "Instrumental" : "With lyrics"}
                  </dd>
                </div>
                <div>
                  <dt>Planned duration</dt>
                  <dd>{preparation.durationSeconds} seconds</dd>
                </div>
                <div>
                  <dt>Proposal language</dt>
                  <dd>
                    {preparation.language === "es"
                      ? "Spanish"
                      : preparation.language === "en"
                        ? "English"
                        : preparation.language}
                  </dd>
                </div>
                <div>
                  <dt>Available selected materials</dt>
                  <dd>
                    {activeCount}
                    {activeCount !== preparation.sources.length && (
                      <p className="form-hint">
                        Some materials were removed. Edit your preparation to
                        review the selection.
                      </p>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Inspired by your memories</dt>
                  <dd>
                    {origins.length ? (
                      <ul className="music-origin-list">
                        {origins.map((memory) => (
                          <li key={memory.id}>
                            <Link href={`${base}/memories/${memory.id}`}>
                              {memory.title}
                            </Link>
                            {memory.collection && (
                              <span className="form-hint">
                                {memory.collection.name}
                              </span>
                            )}
                            {memory.narrator && (
                              <span className="form-hint">
                                Told by {memory.narrator.name}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "No available materials selected"
                    )}
                  </dd>
                </div>
                {preparation.instructions && (
                  <div>
                    <dt>Feeling and direction</dt>
                    <dd className="music-direction">
                      {preparation.instructions}
                    </dd>
                  </div>
                )}
              </dl>
              <p className="form-hint music-summary-note">
                Changes apply to your next draft. Existing versions keep their
                saved proposal and materials.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="preparation-dialog sm:max-w-3xl">
          <DialogHeader className="preparation-dialog-header">
            <DialogTitle>Edit music preparation</DialogTitle>
            <DialogDescription>
              Choose the memories, materials and musical direction for your next
              draft.
            </DialogDescription>
          </DialogHeader>
          <MusicPreparationForm
            familyId={familyId}
            memories={memories}
            preparation={preparation}
            compact
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
