"use client";
import { RevealItem, RevealList } from "@/components/motion/reveal";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Globe,
  Plus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { FormField } from "@/components/private/form-field";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { creationStatusLabels } from "@/lib/creations/shared";
import { readerProfiles, type ReaderProfile } from "@/lib/memories/shared";
import type { MemoryOverview } from "@/lib/memories/service";

type Story = MemoryOverview["preparations"][number];
function stage(story: Story) {
  const status = story.creations[0]?.status;
  if (!status) return "preparation";
  if (status === "READY") return "ready";
  if (status === "REVIEW") return "review";
  if (status === "FAILED") return "failed";
  return "processing";
}
const stages = {
  all: "All stories",
  preparation: "In preparation",
  review: "Ready for review",
  processing: "In progress",
  ready: "Ready",
  failed: "Needs attention",
};

export function StoryIndex({
  familyId,
  familyName,
  role,
  data,
}: {
  familyId: string;
  familyName: string;
  role: string;
  data: MemoryOverview;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const base = `/families/${familyId}`;
  const reader = role === "READER";
  const visible = data.preparations.filter(
    (story) =>
      (filter === "all" || stage(story) === filter) &&
      [story.title, story.memory.title].some((value) =>
        value.toLowerCase().includes(query.trim().toLowerCase()),
      ),
  );
  const reset = () => {
    setQuery("");
    setFilter("all");
  };
  return (
    <section className="stories-index reveal-blocks">
      <div className="memories-heading">
        <div>
          <span className="eyebrow">{familyName} · Private group</span>
          <h1>Your stories</h1>
          <p className="muted">
            Turn the memories you treasure into stories to read and listen to
            together.
          </p>
        </div>
        {!reader && (
          <Button asChild>
            <Link href={`${base}/stories/new`}>
              <Plus aria-hidden="true" />
              Prepare a story
            </Link>
          </Button>
        )}
      </div>
      {reader ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              <h2>Shared stories will live here</h2>
            </EmptyTitle>
            <EmptyDescription>
              Your group can share stories after reviewing them. Memories and
              drafts remain private.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {data.preparations.length > 0 && (
            <>
              <div className="stories-filters">
                <FormField
                  control={
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by story or memory"
                      type="search"
                    />
                  }
                >
                  Search stories
                </FormField>
                <FormField
                  control={
                    <NativeSelect
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                    >
                      {Object.entries(stages).map(([value, label]) => (
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
                {visible.length} {visible.length === 1 ? "story" : "stories"}
                {filter !== "all" || query
                  ? ` of ${data.preparations.length}`
                  : ""}
              </p>
            </>
          )}
          {visible.length ? (
            <RevealList as="div" className="memory-card-grid">
              {visible.map((story) => {
                const latest = story.creations[0];
                const status = latest?.status;
                const preparationHref = `${base}/stories/${story.id}`;
                const storyHref =
                  status === "READY"
                    ? `/story-mode/${familyId}/${latest.id}`
                    : preparationHref;
                const currentStage = stage(story);
                const action =
                  status === "READY"
                    ? "Open story"
                    : status === "REVIEW"
                      ? "Review draft"
                      : currentStage === "processing"
                        ? "View progress"
                        : currentStage === "failed"
                          ? "Review and retry"
                          : "Continue preparation";
                const memory = data.memories.find(
                  (memory) => memory.id === story.memory.id,
                );
                return (
                  <RevealItem as="div" className="reveal-cell" key={story.id}>
                    <Card className="story-card">
                      <CardHeader>
                        <Badge
                          variant={
                            currentStage === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                          className="story-status"
                        >
                          {status
                            ? creationStatusLabels[status]
                            : "In preparation"}
                        </Badge>
                        <CardTitle>
                          <h2>
                            <Link href={storyHref}>{story.title}</Link>
                          </h2>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="story-card-content">
                        <div className="story-origin">
                          <span className="form-hint">
                            Based on your memory
                          </span>
                          <Link href={`${base}/memories/${story.memory.id}`}>
                            {story.memory.title}
                          </Link>
                          {memory?.narrator && (
                            <span className="muted">
                              Told by {memory.narrator.name}
                            </span>
                          )}
                        </div>
                        <dl className="story-facts">
                          <div>
                            <dt>
                              <Users aria-hidden="true" />
                              Reader
                            </dt>
                            <dd>
                              {readerProfiles[
                                story.readerProfile as ReaderProfile
                              ]?.label || story.readerProfile}
                            </dd>
                          </div>
                          <div>
                            <dt>
                              <Globe aria-hidden="true" />
                              Language
                            </dt>
                            <dd>
                              {story.language === "en"
                                ? "English"
                                : story.language === "es"
                                  ? "Spanish"
                                  : story.language}
                            </dd>
                          </div>
                          <div>
                            <dt>
                              <BookOpen aria-hidden="true" />
                              Planned length
                            </dt>
                            <dd>
                              {story.pages}{" "}
                              {story.pages === 1 ? "page" : "pages"}
                            </dd>
                          </div>
                          <div>
                            <dt>
                              <FileText aria-hidden="true" />
                              Selected materials
                            </dt>
                            <dd>{story.sources.length}</dd>
                          </div>
                        </dl>
                      </CardContent>
                      <CardFooter>
                        <Button asChild variant="outline">
                          <Link href={storyHref}>
                            {action}
                            <ArrowRight aria-hidden="true" />
                          </Link>
                        </Button>
                        {status === "READY" && (
                          <Button asChild variant="ghost">
                            <Link href={preparationHref}>Edit preparation</Link>
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
                    {data.preparations.length
                      ? "No stories match your search"
                      : "A story starts with a real memory"}
                  </h2>
                </EmptyTitle>
                <EmptyDescription>
                  {data.preparations.length
                    ? "Try another title or status to find your story."
                    : "Choose a memory and its materials, then shape a story for the people you want to share it with."}
                </EmptyDescription>
              </EmptyHeader>
              {data.preparations.length ? (
                <Button variant="outline" onClick={reset}>
                  Clear filters
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link
                    href={
                      data.memories.length
                        ? `${base}/stories/new`
                        : `${base}/memories/new`
                    }
                  >
                    {data.memories.length ? "Choose a memory" : "Save a memory"}
                  </Link>
                </Button>
              )}
            </Empty>
          )}
          <p className="stories-note muted">
            Preparations and drafts stay private. You can review the story
            before generating illustrations or narration.
          </p>
        </>
      )}
    </section>
  );
}
