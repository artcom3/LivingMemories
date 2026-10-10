"use client";
import { StorytellerVoice } from "@/components/storyteller-voice";
import { InitialAvatar } from "@/components/private/initial-avatar";
import { Feedback, EmptyState } from "@/components/private/content-primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/private/form-field";
import { FieldGroup } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelectOption,
  NativeSelect,
} from "@/components/ui/native-select";
import { Disclosure } from "@/components/private/disclosure";
import { useConfirmation } from "@/components/private/confirmation-provider";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FamilyView } from "@/lib/families/service";
import { roleLabels, type Role } from "@/lib/families/validation";
import { mutate } from "@/lib/families/client";
export function FamilyWorkspace({
  view,
  userId,
  section,
}: {
  view: FamilyView;
  userId: string;
  section?: "narrators" | "settings";
}) {
  const confirm = useConfirmation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  const [invitationUrl, setInvitationUrl] = useState("");
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<string | null>(null);
  const base = "/api/families/" + view.family.id;
  const isAdmin = view.role === "ADMIN";
  const canWrite = view.role !== "READER";
  async function run(
    path: string,
    method: string,
    input: unknown,
    message: string,
  ) {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await mutate(base + path, method, input);
      if (result.url) setInvitationUrl(result.url);
      setFeedback({
        error: result.invitation?.deliveryStatus === "FAILED",
        text:
          result.invitation?.deliveryStatus === "FAILED"
            ? "The invitation was created, but its email could not be sent. Copy the private link or send it again."
            : message,
      });
      router.refresh();
      return true;
    } catch (error) {
      setFeedback({
        error: true,
        text: error instanceof Error ? error.message : "Try again.",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const profile = view.profiles.find((item) => item.id === editingProfile);
  return (
    <>
      {!section ? (
        <>
          <Link href="/families" className="back-link">
            ← My families
          </Link>
          <div className="page-heading family-heading">
            <div>
              <span className="eyebrow">PRIVATE FAMILY SPACE</span>
              <h1>{view.family.name}</h1>
              <p className="muted">
                Your home for the people and stories that connect you with your
                family.
              </p>
            </div>
            <Badge variant="secondary">{roleLabels[view.role]}</Badge>
          </div>
        </>
      ) : null}
      {feedback ? (
        <Feedback
          className={feedback.error ? "feedback error" : "feedback"}
          role={feedback.error ? "alert" : "status"}
        >
          {feedback.text}
        </Feedback>
      ) : null}
      <div className={section ? "workspace-section" : "workspace-grid"}>
        {section !== "settings" ? (
          <section className="people-section" aria-labelledby="narrators-title">
            <div className="section-heading">
              <span className="eyebrow">THE PEOPLE WHO TELL OUR STORIES</span>
              <h2 id="narrators-title">Our storytellers</h2>
              <p className="muted">
                {canWrite
                  ? "A storyteller can have a profile without an account. You add the profile; their story carries their name."
                  : "As a reader, you can enjoy the stories and excerpts your family publishes. Storyteller management is reserved for people who contribute stories."}
              </p>
            </div>
            {canWrite ? (
              <>
                <div className="profile-list">
                  {view.profiles.length ? (
                    view.profiles.map((item) => (
                      <article className="person-entry" key={item.id}>
                        <InitialAvatar>{item.name.slice(0, 1)}</InitialAvatar>
                        <div className="person-details">
                          <h3>{item.name}</h3>
                          <span className="person-relation">
                            {item.relationship || "Family storyteller"}
                          </span>
                          <span className="profile-caption">
                            Profile without an account
                          </span>
                          {item.biography ? (
                            <p className="profile-biography">
                              {item.biography}
                            </p>
                          ) : null}
                          <p className="form-hint">
                            Added by {item.createdBy.name}
                          </p>
                          {isAdmin || item.createdById === userId ? (
                            <div className="row-actions">
                              <Button
                                disabled={busy}
                                onClick={() => setEditingProfile(item.id)}
                                variant="ghost"
                                type="button"
                              >
                                Edit profile
                              </Button>
                              <Button disabled={busy} type="button" variant="outline" aria-expanded={voiceProfile === item.id}
                                onClick={() => setVoiceProfile(voiceProfile === item.id ? null : item.id)}>
                                {item.voiceStatus === "READY" ? "Listen to voice" : item.voiceStatus === "NONE" ? "Add voice" : "Manage voice"}
                              </Button>
                              <Button
                                disabled={busy}
                                onClick={async () => {
                                  if (
                                    await confirm(
                                      "Archive this profile? Its attribution in stories will be preserved.",
                                    )
                                  )
                                    void run(
                                      "/profiles/" + item.id,
                                      "DELETE",
                                      {},
                                      "Perfil archivado.",
                                    );
                                }}
                                variant="destructive"
                                type="button"
                              >
                                Archive
                              </Button>
                            </div>
                          ) : null}
                          {voiceProfile === item.id && (isAdmin || item.createdById === userId) ? (
                            <StorytellerVoice key={item.id} familyId={view.family.id} profile={item} onClose={() => setVoiceProfile(null)} />
                          ) : null}
                        </div>
                      </article>
                    ))
                  ) : (
                    <EmptyState className="empty-state">
                      <h3>Whose voice would you like to preserve?</h3>
                      <p>
                        Start with someone in your family, such as your
                        grandmother. They do not need an account.
                      </p>
                    </EmptyState>
                  )}
                </div>
                <section
                  className="profile-form-section"
                  aria-labelledby="profile-form-title"
                >
                  <h3 id="profile-form-title">
                    {profile ? "Edit " + profile.name : "Add a storyteller"}
                  </h3>
                  <form
                    className="form-stack"
                    key={profile?.id || "new"}
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const form = event.currentTarget;
                      const data = new FormData(form);
                      if (
                        await run(
                          profile ? "/profiles/" + profile.id : "/profiles",
                          profile ? "PATCH" : "POST",
                          Object.fromEntries(data),
                          profile
                            ? "Perfil actualizado."
                            : "Storyteller added. No account was created.",
                        )
                      ) {
                        setEditingProfile(null);
                        form.reset();
                      }
                    }}
                  >
                    <FieldGroup>
                      <FieldGroup className="form-columns">
                        <FormField
                          control={
                            <Input
                              name="name"
                              defaultValue={profile?.name}
                              placeholder="Elena García"
                              required
                              maxLength={100}
                            />
                          }
                        >
                          Storyteller&apos;s name
                        </FormField>
                        <FormField
                          control={
                            <Input
                              name="relationship"
                              defaultValue={profile?.relationship || ""}
                              placeholder="Maternal grandmother"
                              maxLength={100}
                            />
                          }
                        >
                          Relationship or connection
                        </FormField>
                      </FieldGroup>
                      <FormField
                        control={
                          <Textarea
                            name="biography"
                            defaultValue={profile?.biography || ""}
                            rows={3}
                            placeholder="What you want to remember about this person…"
                            maxLength={2000}
                          />
                        }
                      >
                        A short introduction{" "}
                        <span className="optional">(optional)</span>
                      </FormField>
                      <div className="row-actions">
                        <Button disabled={busy} variant="default">
                          {busy
                            ? "Saving\u2026"
                            : profile
                              ? "Save profile"
                              : "Add storyteller"}
                        </Button>
                        {profile ? (
                          <Button
                            type="button"
                            disabled={busy}
                            onClick={() => setEditingProfile(null)}
                            variant="ghost"
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </FieldGroup>
                  </form>
                </section>
              </>
            ) : (
              <EmptyState className="empty-state">
                <h3>Your family library will grow</h3>
                <p>
                  When your family shares its first story, you can enjoy it
                  here.
                </p>
              </EmptyState>
            )}
          </section>
        ) : null}
        {section !== "narrators" ? (
          <aside className="family-side">
            {isAdmin ? (
              <>
                <section
                  className="side-section"
                  aria-labelledby="invite-title"
                >
                  <span className="eyebrow">SHARE WITH FAMILY</span>
                  <h2 id="invite-title">Invite an adult</h2>
                  <p className="muted">
                    The link arrives by email and is valid for seven days.
                  </p>
                  <form
                    className="form-stack"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const form = event.currentTarget;
                      if (
                        await run(
                          "/invitations",
                          "POST",
                          Object.fromEntries(new FormData(form)),
                          "Invitation sent to the adult's email address.",
                        )
                      )
                        form.reset();
                    }}
                  >
                    <FieldGroup>
                      <FormField
                        control={
                          <Input
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="person@example.com"
                            maxLength={254}
                          />
                        }
                      >
                        Guest email
                      </FormField>
                      <FormField
                        control={
                          <NativeSelect name="role" defaultValue="CONTRIBUTOR">
                            <NativeSelectOption value="ADMIN">
                              Administrator
                            </NativeSelectOption>
                            <NativeSelectOption value="CONTRIBUTOR">
                              Contributor
                            </NativeSelectOption>
                            <NativeSelectOption value="READER">
                              Reader
                            </NativeSelectOption>
                          </NativeSelect>
                        }
                      >
                        Their role
                      </FormField>
                      <p className="form-hint">
                        Administrator: manages the family. Contributor: adds
                        their own stories. Reader: enjoys published content.
                      </p>
                      <Button disabled={busy} variant="outline">
                        {busy ? "Sending\u2026" : "Send invitation"}
                      </Button>
                    </FieldGroup>
                  </form>
                  {invitationUrl ? (
                    <div className="invitation-link">
                      <FormField
                        control={
                          <Input
                            readOnly
                            value={invitationUrl}
                            onFocus={(event) => event.target.select()}
                          />
                        }
                      >
                        Private link for the latest invitation
                      </FormField>
                      <Button
                        disabled={busy}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(invitationUrl);
                            setFeedback({
                              error: false,
                              text: "Link copied. Share it only with its intended recipient.",
                            });
                          } catch {
                            setFeedback({
                              error: true,
                              text: "Select the link to copy it manually.",
                            });
                          }
                        }}
                        variant="ghost"
                        type="button"
                      >
                        Copy link
                      </Button>
                    </div>
                  ) : null}
                </section>
                <section
                  className="side-section"
                  aria-labelledby="members-title"
                >
                  <h2 id="members-title">Adults with access</h2>
                  <p className="form-hint">
                    At least one administrator must remain.
                  </p>
                  <ul className="member-list">
                    {view.members.map((member) => (
                      <li key={member.id}>
                        <div>
                          <strong>
                            {member.user.name}
                            {member.userId === userId ? " (you)" : ""}
                          </strong>
                          <span className="member-email">
                            {member.user.email}
                          </span>
                        </div>
                        <div className="member-controls">
                          <NativeSelect
                            aria-label={"Role for " + member.user.name}
                            value={member.role}
                            disabled={busy}
                            onChange={(event) =>
                              void run(
                                "/members/" + member.id,
                                "PATCH",
                                { role: event.target.value as Role },
                                "Rol actualizado.",
                              )
                            }
                          >
                            <NativeSelectOption value="ADMIN">
                              Administrator
                            </NativeSelectOption>
                            <NativeSelectOption value="CONTRIBUTOR">
                              Contributor
                            </NativeSelectOption>
                            <NativeSelectOption value="READER">
                              Reader
                            </NativeSelectOption>
                          </NativeSelect>
                          <Button
                            disabled={busy}
                            onClick={async () => {
                              if (
                                await confirm(
                                  "Remove access for " + member.user.name + "?",
                                )
                              )
                                void run(
                                  "/members/" + member.id,
                                  "DELETE",
                                  {},
                                  "Access removed.",
                                );
                            }}
                            variant="destructive"
                            type="button"
                          >
                            Remove access
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
                <section
                  className="side-section"
                  aria-labelledby="pending-title"
                >
                  <h2 id="pending-title">Invitations</h2>
                  {view.invitations.length ? (
                    <ul className="invitation-list">
                      {view.invitations.map((invite) => (
                        <li key={invite.id}>
                          <strong>{invite.email}</strong>
                          <span className="form-hint">
                            {roleLabels[invite.role]} ·{" "}
                            {
                              (
                                {
                                  PENDING: "Pending",
                                  ACCEPTED: "Accepted",
                                  REVOKED: "Revoked",
                                  EXPIRED: "Expired",
                                } as Record<string, string>
                              )[invite.status]
                            }
                          </span>
                          <span className="form-hint">
                            Expires on{" "}
                            {new Date(invite.expiresAt).toLocaleDateString(
                              "en-US",
                            )}
                            {invite.deliveryStatus === "FAILED"
                              ? " \u00B7 Email not sent"
                              : ""}
                          </span>
                          {invite.status === "PENDING" ||
                          invite.status === "EXPIRED" ? (
                            <div className="row-actions">
                              <Button
                                disabled={busy}
                                onClick={() =>
                                  void run(
                                    "/invitations",
                                    "POST",
                                    { email: invite.email, role: invite.role },
                                    "A new invitation was sent. The previous link no longer works.",
                                  )
                                }
                                variant="ghost"
                                type="button"
                              >
                                Resend
                              </Button>
                              {invite.status === "PENDING" ? (
                                <Button
                                  disabled={busy}
                                  onClick={() =>
                                    void run(
                                      "/invitations/" + invite.id,
                                      "DELETE",
                                      {},
                                      "Invitation revoked.",
                                    )
                                  }
                                  variant="destructive"
                                  type="button"
                                >
                                  Revoke
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">
                      You have not sent any invitations yet.
                    </p>
                  )}
                </section>
              </>
            ) : (
              <section className="side-section">
                <span className="eyebrow">YOUR PARTICIPATION</span>
                <h2>{roleLabels[view.role]}</h2>
                <p className="muted">
                  {canWrite
                    ? "You can add storytellers and edit profiles you created. An administrator can help you manage access."
                    : "Your access lets you enjoy the stories and excerpts published for your family."}
                </p>
              </section>
            )}
            <section className="side-section family-settings">
              {isAdmin ? (
                <Disclosure title={<>Rename family</>}>
                  <form
                    className="form-stack"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      await run(
                        "",
                        "PATCH",
                        Object.fromEntries(new FormData(event.currentTarget)),
                        "Nombre actualizado.",
                      );
                    }}
                  >
                    <FieldGroup>
                      <FormField
                        control={
                          <Input
                            name="name"
                            defaultValue={view.family.name}
                            required
                            maxLength={100}
                          />
                        }
                      >
                        Name
                      </FormField>
                      <Button disabled={busy} variant="outline">
                        Save name
                      </Button>
                    </FieldGroup>
                  </form>
                </Disclosure>
              ) : null}
              <Button
                disabled={busy}
                onClick={async () => {
                  if (
                    await confirm(
                      "Leave this family? You will need another invitation to return.",
                    )
                  ) {
                    if (
                      await run(
                        "/leave",
                        "POST",
                        {},
                        "You have left the family.",
                      )
                    ) {
                      router.push("/families");
                      router.refresh();
                    }
                  }
                }}
                variant="destructive"
                type="button"
              >
                Leave this family
              </Button>
            </section>
          </aside>
        ) : null}
      </div>
    </>
  );
}
