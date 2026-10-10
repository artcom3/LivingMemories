import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  BookOpen,
  Plus,
  Music,
  Mic,
  Sparkles,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { AlbumCover } from "@/components/private/album-cover";
import { DashboardRefresh } from "@/components/private/dashboard-refresh";
export default async function DashboardPage({
  params,
}: PageProps<"/families/[familyId]/dashboard">) {
  const { familyId } = await params;
  const { user, view } = await familyPageContext(familyId);
  const data = await familyDashboard(user.id, familyId);
  const base = `/families/${familyId}`;
  return (
    <div className="family-dashboard">
      <DashboardRefresh active={data.hasActiveCreations} />
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow">
            {view.family.name} · Our family archive
          </span>
          <h1>A place to come back to.</h1>
          <p className="muted">
            {data.reader
              ? "The stories your family shares will have a home here."
              : "The people, voices, and memories that bring us together."}
          </p>
        </div>
        {!data.reader ? (
          <Button asChild>
            <Link href={`${base}/memories/new`}>
              <Plus data-icon="inline-start" />
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
            <EmptyTitle>Your family library will grow</EmptyTitle>
            <EmptyDescription>
              Original memories and test versions stay private. Stories will
              appear here when your family can share them.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="dashboard-section-heading">
            <h2>Your albums</h2>
            <Button asChild variant="ghost">
              <Link href={`${base}/albums`}>
                View all
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          {data.albums.length ? (
            <div className="dashboard-albums">
              {data.albums.map((album) => (
                <Card key={album.id}>
                  <AlbumCover src={album.cover} name={album.name} />
                  <CardHeader>
                    <span className="eyebrow">Family album</span>
                    <CardTitle>
                      <h3>{album.name}</h3>
                    </CardTitle>
                    <CardDescription>
                      {album.count} {album.count === 1 ? "memory" : "memories"}
                      {album.description ? ` · ${album.description}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="form-hint">
                      A person, a time, or a place you want to preserve.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild variant="ghost">
                      <Link href={album.href}>
                        Explore album
                        <ArrowUpRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <Image
                  src="/landing/scenes/recuerdos-wide.webp"
                  width={340}
                  height={190}
                  alt=""
                  className="empty-illustration"
                />
                <EmptyTitle>Your first album starts with a memory</EmptyTitle>
                <EmptyDescription>
                  Bring together the photos, letters, and voices of someone in
                  your family.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild variant="secondary">
                  <Link href={`${base}/albums`}>Create my first album</Link>
                </Button>
              </EmptyContent>
            </Empty>
          )}
          {data.preparation ? (
            <Card className="dashboard-resume">
              <CardHeader>
                <span className="eyebrow">Pick up where you left off</span>
                <CardTitle>
                  <h2>{data.preparation.title}</h2>
                </CardTitle>
                <CardDescription>
                  {data.preparation.kind === "stories"
                    ? "Your story"
                    : "Your music"}{" "}
                  · {data.preparation.language === "en" ? "English" : "Spanish"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{data.preparation.status}</Badge>
              </CardContent>
              <CardFooter>
                <Button asChild variant="secondary">
                  <Link href={data.preparation.href}>
                    {data.preparation.kind === "stories" ? (
                      <BookOpen data-icon="inline-start" />
                    ) : (
                      <Music data-icon="inline-start" />
                    )}
                    Continue{" "}
                    {data.preparation.kind === "stories"
                      ? "your story"
                      : "your music"}
                    <ArrowUpRight data-icon="inline-end" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}
          <div className="dashboard-columns">
            <section>
              <div className="dashboard-section-heading">
                <h2>Recent memories</h2>
                <Button asChild variant="ghost">
                  <Link href={base}>View memories</Link>
                </Button>
              </div>
              {data.memories.length ? (
                <div className="dashboard-memory-list">
                  {data.memories.map((memory) => (
                    <Link
                      href={memory.href}
                      className="dashboard-memory"
                      key={memory.id}
                    >
                      <Avatar>
                        <AvatarFallback>
                          {memory.narrator?.slice(0, 1) ||
                            memory.title.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3>{memory.title}</h3>
                        <p className="muted">
                          {memory.narrator || "Storyteller to be added"} ·{" "}
                          {memory.count}{" "}
                          {memory.count === 1 ? "material" : "materials"}
                          {memory.album ? ` · ${memory.album}` : ""}
                        </p>
                      </div>
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  ))}
                </div>
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
                      <Link href={`${base}/memories/new`}>
                        Save my first memory
                      </Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              )}
              <div className="dashboard-section-heading narrator-heading">
                <h2>The voices of your family</h2>
                <Button asChild variant="ghost">
                  <Link href={`${base}/narrators`}>View storytellers</Link>
                </Button>
              </div>
              {data.narrators.length ? (
                <div className="dashboard-narrators">
                  {data.narrators.map((person) => (
                    <Link
                      href={`${base}/narrators`}
                      className="dashboard-narrator"
                      key={person.id}
                    >
                      <Avatar>
                        <AvatarFallback>
                          {person.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3>{person.name}</h3>
                        <p className="form-hint">
                          {person.relationship || "Family storyteller"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  Whose voice would you like to preserve? Add your first
                  storyteller whenever you are ready.
                </p>
              )}
            </section>
            <aside>
              <Card>
                <CardHeader>
                  <span className="eyebrow">One small step further</span>
                  <CardTitle>
                    <h2>Keep going</h2>
                  </CardTitle>
                  <CardDescription>
                    Every detail helps tell your story.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.pending.length ? (
                    data.pending.map((item, index) => (
                      <div className="dashboard-pending" key={item.id}>
                        {index > 0 ? <Separator /> : null}
                        <h3>{item.title}</h3>
                        <p className="form-hint">{item.description}</p>
                        <Button
                          asChild
                          variant={
                            item.kind === "error" ? "destructive" : "ghost"
                          }
                        >
                          <Link href={item.href}>
                            {item.action}
                            <ArrowUpRight data-icon="inline-end" />
                          </Link>
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="muted">
                      Everything is up to date. Revisit a memory or save a new
                      one whenever you like.
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Sparkles aria-hidden="true" />
                  <p className="form-hint">
                    Your family brings the stories. We help you preserve them.
                  </p>
                </CardFooter>
              </Card>
              <div className="dashboard-quicklinks">
                <Button asChild variant="outline">
                  <Link href={`${base}/stories/new`}>
                    <BookOpen data-icon="inline-start" />
                    Prepare a story
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`${base}/music/new`}>
                    <Music data-icon="inline-start" />
                    Prepare music
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href={`${base}/narrators`}>
                    <Mic data-icon="inline-start" />
                    Add a storyteller
                  </Link>
                </Button>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
