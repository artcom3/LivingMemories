import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Plus, Music, Mic } from "lucide-react";
import { familyPageContext } from "@/lib/memories/page-context";
import { familyDashboard } from "@/lib/dashboard/service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { AlbumCover } from "@/components/private/album-cover";
import { DashboardRefresh } from "@/components/private/dashboard-refresh";
import { RevealItem, RevealList } from "@/components/motion/reveal";

// From the overview every link goes one level deeper (template.tsx).
const forward = ["nav-forward"];

export default async function DashboardPage({
  params,
}: PageProps<"/families/[familyId]/dashboard">) {
  const { familyId } = await params;
  const { user, view } = await familyPageContext(familyId);
  const data = await familyDashboard(user.id, familyId);
  const base = `/families/${familyId}`;
  const pending =
    data.pending.find((item) => item.kind === "error") || data.pending[0];
  const emptyMemory = data.memories.find((memory) => memory.count === 0);
  const preparation = data.preparation;
  const nextStep = pending
    ? {
        ...pending,
        eyebrow:
          pending.kind === "error"
            ? "NEEDS YOUR ATTENTION"
            : "PICK UP WHERE YOU LEFT OFF",
      }
    : preparation
      ? {
          title: preparation.title,
          description: `${preparation.kind === "stories" ? "Your story" : "Your music"} · ${preparation.language === "en" ? "English" : "Spanish"} · ${preparation.status}`,
          action:
            preparation.kind === "stories"
              ? "Open your story"
              : "Open your music",
          href: preparation.href,
          kind: "creation",
          eyebrow: "PICK UP WHERE YOU LEFT OFF",
        }
      : emptyMemory
        ? {
            title: `Bring ${emptyMemory.title} to life`,
            description: "Add a photo or a recording to preserve this memory.",
            action: "Add materials",
            href: emptyMemory.href,
            kind: "materials",
            eyebrow: "A SMALL NEXT STEP",
          }
        : {
            title: data.memories.length
              ? "Return to a memory"
              : "Start with what you remember",
            description: data.memories.length
              ? "Revisit the details you have saved, or add something new."
              : "A photo, a voice, or a few words is enough to begin.",
            action: data.memories.length
              ? "Explore memories"
              : "Save your first memory",
            href: data.memories.length ? base : `${base}/memories/new`,
            kind: "memory",
            eyebrow: "A SMALL NEXT STEP",
          };
  const otherPending = data.pending.filter(
    (item) => item.href !== nextStep.href,
  );

  return (
    <div className="family-dashboard reveal-blocks">
      <DashboardRefresh active={data.hasActiveCreations} />
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow">{view.family.name} · Private group</span>
          <h1>Your shared memories</h1>
          <p className="muted">
            {data.reader
              ? "The stories your group shares will have a home here."
              : "Keep the voices, photos and stories that matter."}
          </p>
        </div>
        {!data.reader ? (
          <Button asChild>
            <Link transitionTypes={forward} href={`${base}/memories/new`}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              Save a memory
            </Link>
          </Button>
        ) : null}
      </div>
      {data.reader ? (
        <Empty>
          <EmptyHeader>
            <Image
              src="/landing/scenes/cuento-wide.webp"
              width={400}
              height={225}
              alt=""
              className="empty-illustration"
            />
            <EmptyTitle>Your shared library will grow</EmptyTitle>
            <EmptyDescription>
              Original memories and test versions stay private. Stories will
              appear here when your group can share them.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="dashboard-overview reveal-blocks">
          <section
            className="dashboard-recent-section"
            aria-labelledby="recent-memories-title"
          >
            <div className="dashboard-section-heading">
              <h2 id="recent-memories-title">Recent memories</h2>
              <Button asChild variant="ghost">
                <Link transitionTypes={forward} href={base}>
                  View all
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </div>
            {data.memories.length ? (
              <RevealList className="dashboard-overview-list">
                {data.memories.map((memory) => (
                  <RevealItem key={memory.id}>
                    <Link
                      transitionTypes={forward}
                      href={memory.href}
                      className="dashboard-overview-row"
                    >
                      <Avatar aria-hidden="true">
                        <AvatarFallback>
                          {memory.narrator?.slice(0, 1) ||
                            memory.title.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="dashboard-row-details">
                        <h3>{memory.title}</h3>
                        <p className="muted">
                          {memory.narrator || "Storyteller to be added"} ·{" "}
                          {memory.count === 0
                            ? "No materials yet"
                            : `${memory.count} ${memory.count === 1 ? "material" : "materials"}`}
                          {memory.album ? ` · ${memory.album}` : ""}
                        </p>
                      </div>
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </RevealItem>
                ))}
              </RevealList>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Start with what you remember</EmptyTitle>
                  <EmptyDescription>
                    You do not need every detail. You can continue later.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild variant="secondary">
                    <Link
                      transitionTypes={forward}
                      href={`${base}/memories/new`}
                    >
                      Save my first memory
                    </Link>
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </section>
          <aside className="dashboard-next" aria-label="Your next step">
            <Card>
              <CardHeader>
                <span className="eyebrow">{nextStep.eyebrow}</span>
                <CardTitle>
                  <h2>{nextStep.title}</h2>
                </CardTitle>
                <CardDescription>{nextStep.description}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  asChild
                  variant={
                    nextStep.kind === "error" ? "destructive" : "outline"
                  }
                >
                  <Link transitionTypes={forward} href={nextStep.href}>
                    {nextStep.action}
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Link>
                </Button>
              </CardFooter>
              {otherPending.length ||
              (preparation && preparation.href !== nextStep.href) ? (
                <CardContent className="dashboard-other-pending">
                  {otherPending.map((item) => (
                    <div key={item.id}>
                      <h3>{item.title}</h3>
                      <p className="muted">{item.description}</p>
                      <Button
                        asChild
                        variant={
                          item.kind === "error" ? "destructive" : "ghost"
                        }
                      >
                        <Link transitionTypes={forward} href={item.href}>
                          {item.action}
                          <ArrowRight
                            data-icon="inline-end"
                            aria-hidden="true"
                          />
                        </Link>
                      </Button>
                    </div>
                  ))}
                  {preparation &&
                  preparation.href !== nextStep.href &&
                  !otherPending.some(
                    (item) => item.href === preparation.href,
                  ) ? (
                    <Button asChild variant="ghost">
                      <Link transitionTypes={forward} href={preparation.href}>
                        Continue{" "}
                        {preparation.kind === "stories"
                          ? "your story"
                          : "your music"}
                        <ArrowRight data-icon="inline-end" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              ) : null}
            </Card>
            <div className="dashboard-quicklinks">
              <Button asChild variant="outline">
                <Link transitionTypes={forward} href={`${base}/stories/new`}>
                  <BookOpen data-icon="inline-start" aria-hidden="true" />
                  Create a story
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link transitionTypes={forward} href={`${base}/music/new`}>
                  <Music data-icon="inline-start" aria-hidden="true" />
                  Create music
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </aside>
          <section
            className="dashboard-albums-section"
            aria-labelledby="albums-title"
          >
            <div className="dashboard-section-heading">
              <h2 id="albums-title">Your albums</h2>
              <Button asChild variant="ghost">
                <Link transitionTypes={forward} href={`${base}/albums`}>
                  View albums
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </div>
            {data.albums.length ? (
              <RevealList className="dashboard-overview-list dashboard-compact-albums">
                {data.albums.map((album) => (
                  <RevealItem key={album.id}>
                    <Link
                      transitionTypes={forward}
                      href={album.href}
                      className="dashboard-overview-row dashboard-album-row"
                    >
                      <AlbumCover
                        src={album.cover}
                        name={album.name}
                        transitionName={`album-cover-${album.id}`}
                      />
                      <div className="dashboard-row-details">
                        <h3>{album.name}</h3>
                        <p className="muted">
                          {album.count}{" "}
                          {album.count === 1 ? "memory" : "memories"}
                          {album.description ? ` · ${album.description}` : ""}
                        </p>
                      </div>
                      <span className="dashboard-row-action">
                        <span>Open album</span>
                        <ArrowRight aria-hidden="true" />
                      </span>
                    </Link>
                  </RevealItem>
                ))}
              </RevealList>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Your first album starts with a memory</EmptyTitle>
                  <EmptyDescription>
                    Bring together the photos, letters, and voices you want to
                    preserve.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild variant="secondary">
                    <Link transitionTypes={forward} href={`${base}/albums`}>
                      Create my first album
                    </Link>
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </section>
          <section
            className="dashboard-storytellers-section"
            aria-labelledby="storytellers-title"
          >
            <div className="dashboard-section-heading">
              <h2 id="storytellers-title">Storytellers</h2>
              <Button asChild variant="ghost">
                <Link transitionTypes={forward} href={`${base}/narrators`}>
                  View all
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </div>
            {data.narrators.length ? (
              <RevealList className="dashboard-overview-list">
                {data.narrators.map((person) => (
                  <RevealItem key={person.id}>
                    <Link
                      transitionTypes={forward}
                      href={`${base}/narrators`}
                      className="dashboard-overview-row"
                    >
                      <Avatar aria-hidden="true">
                        <AvatarFallback>
                          {person.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="dashboard-row-details">
                        <h3>{person.name}</h3>
                        <p className="muted">
                          {person.relationship || "Storyteller"}
                        </p>
                      </div>
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </RevealItem>
                ))}
              </RevealList>
            ) : (
              <div className="dashboard-storytellers-empty">
                <p className="muted">Whose voice would you like to preserve?</p>
                <Button asChild variant="ghost">
                  <Link transitionTypes={forward} href={`${base}/narrators`}>
                    <Mic data-icon="inline-start" aria-hidden="true" />
                    Add a storyteller
                  </Link>
                </Button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
