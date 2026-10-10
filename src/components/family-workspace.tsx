"use client";
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
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  const [invitationUrl, setInvitationUrl] = useState("");
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
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
            ? "La invitación está creada, pero no se pudo enviar el correo. Copia el enlace privado o vuelve a enviarla."
            : message,
      });
      router.refresh();
      return true;
    } catch (error) {
      setFeedback({
        error: true,
        text: error instanceof Error ? error.message : "Inténtalo de nuevo.",
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
            ← Mis familias
          </Link>
          <div className="page-heading family-heading">
            <div>
              <span className="eyebrow">ESPACIO FAMILIAR PRIVADO</span>
              <h1>{view.family.name}</h1>
              <p className="muted">
                Tu lugar para las personas y las historias que te conectan con
                los tuyos.
              </p>
            </div>
            <span className="role-badge">{roleLabels[view.role]}</span>
          </div>
        </>
      ) : null}
      {feedback ? (
        <p
          className={feedback.error ? "feedback error" : "feedback"}
          role={feedback.error ? "alert" : "status"}
        >
          {feedback.text}
        </p>
      ) : null}
      <div className={section ? "workspace-section" : "workspace-grid"}>
        {section !== "settings" ? (
          <section className="people-section" aria-labelledby="narrators-title">
            <div className="section-heading">
              <span className="eyebrow">
                QUIÉNES CUENTAN NUESTRAS HISTORIAS
              </span>
              <h2 id="narrators-title">Voces de la familia</h2>
              <p className="muted">
                {canWrite
                  ? "Un narrador puede tener un perfil sin registrarse en la app. Tú registras el perfil; su historia lleva su nombre."
                  : "Como lector podrás disfrutar de los cuentos y fragmentos que tu familia publique. La gestión de narradores está reservada a quienes aportan historias."}
              </p>
            </div>
            {canWrite ? (
              <>
                <div className="profile-list">
                  {view.profiles.length ? (
                    view.profiles.map((item) => (
                      <article className="person-entry" key={item.id}>
                        <span className="person-initial" aria-hidden="true">
                          {item.name.slice(0, 1)}
                        </span>
                        <div className="person-details">
                          <h3>{item.name}</h3>
                          <span className="person-relation">
                            {item.relationship || "Narrador de la familia"}
                          </span>
                          <span className="profile-caption">
                            Perfil sin cuenta
                          </span>
                          {item.biography ? (
                            <p className="profile-biography">
                              {item.biography}
                            </p>
                          ) : null}
                          <p className="form-hint">
                            Registrado por {item.createdBy.name}
                          </p>
                          {isAdmin || item.createdById === userId ? (
                            <div className="row-actions">
                              <button
                                className="button quiet"
                                disabled={busy}
                                onClick={() => setEditingProfile(item.id)}
                              >
                                Editar perfil
                              </button>
                              <button
                                className="button quiet destructive"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "¿Archivar este perfil? Se conservará su atribución en las historias.",
                                    )
                                  )
                                    void run(
                                      "/profiles/" + item.id,
                                      "DELETE",
                                      {},
                                      "Perfil archivado.",
                                    );
                                }}
                              >
                                Archivar
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state">
                      <h3>¿De quién quieres conservar la voz?</h3>
                      <p>
                        Empieza con una persona de tu familia, como tu abuela.
                        No necesita una cuenta.
                      </p>
                    </div>
                  )}
                </div>
                <section
                  className="profile-form-section"
                  aria-labelledby="profile-form-title"
                >
                  <h3 id="profile-form-title">
                    {profile
                      ? "Editar a " + profile.name
                      : "Añadir un narrador"}
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
                            : "Narrador añadido. No se ha creado una cuenta.",
                        )
                      ) {
                        setEditingProfile(null);
                        form.reset();
                      }
                    }}
                  >
                    <div className="form-columns">
                      <label>
                        Nombre del narrador
                        <input
                          name="name"
                          defaultValue={profile?.name}
                          placeholder="Elena García"
                          required
                          maxLength={100}
                        />
                      </label>
                      <label>
                        Parentesco o vínculo
                        <input
                          name="relationship"
                          defaultValue={profile?.relationship || ""}
                          placeholder="Abuela materna"
                          maxLength={100}
                        />
                      </label>
                    </div>
                    <label>
                      Una breve presentación{" "}
                      <span className="optional">(opcional)</span>
                      <textarea
                        name="biography"
                        defaultValue={profile?.biography || ""}
                        rows={3}
                        placeholder="Lo que quieres recordar de esta persona…"
                        maxLength={2000}
                      />
                    </label>
                    <div className="row-actions">
                      <button className="button primary" disabled={busy}>
                        {busy
                          ? "Guardando…"
                          : profile
                            ? "Guardar perfil"
                            : "Añadir narrador"}
                      </button>
                      {profile ? (
                        <button
                          type="button"
                          className="button quiet"
                          disabled={busy}
                          onClick={() => setEditingProfile(null)}
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </form>
                </section>
              </>
            ) : (
              <div className="empty-state">
                <h3>La biblioteca de tu familia irá creciendo</h3>
                <p>
                  Cuando tu familia comparta su primera historia, podrás
                  disfrutarla aquí.
                </p>
              </div>
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
                  <span className="eyebrow">COMPARTIR EN FAMILIA</span>
                  <h2 id="invite-title">Invitar a un adulto</h2>
                  <p className="muted">
                    El enlace llega por correo y dura siete días.
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
                          "Invitación enviada al correo del adulto.",
                        )
                      )
                        form.reset();
                    }}
                  >
                    <label>
                      Correo del invitado
                      <input
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="persona@example.com"
                        maxLength={254}
                      />
                    </label>
                    <label>
                      Su acceso
                      <select name="role" defaultValue="CONTRIBUTOR">
                        <option value="ADMIN">Administrador</option>
                        <option value="CONTRIBUTOR">Colaborador</option>
                        <option value="READER">Lector</option>
                      </select>
                    </label>
                    <p className="form-hint">
                      Administrador: gestiona la familia. Colaborador: aporta
                      sus historias. Lector: disfruta del contenido publicado.
                    </p>
                    <button className="button secondary" disabled={busy}>
                      {busy ? "Enviando…" : "Enviar invitación"}
                    </button>
                  </form>
                  {invitationUrl ? (
                    <div className="invitation-link">
                      <label>
                        Enlace privado de la última invitación
                        <input
                          readOnly
                          value={invitationUrl}
                          onFocus={(event) => event.target.select()}
                        />
                      </label>
                      <button
                        className="button quiet"
                        disabled={busy}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(invitationUrl);
                            setFeedback({
                              error: false,
                              text: "Enlace copiado. Compártelo solo con su destinatario.",
                            });
                          } catch {
                            setFeedback({
                              error: true,
                              text: "Selecciona el enlace para copiarlo manualmente.",
                            });
                          }
                        }}
                      >
                        Copiar enlace
                      </button>
                    </div>
                  ) : null}
                </section>
                <section
                  className="side-section"
                  aria-labelledby="members-title"
                >
                  <h2 id="members-title">Adultos con acceso</h2>
                  <p className="form-hint">
                    Debe quedar al menos un administrador.
                  </p>
                  <ul className="member-list">
                    {view.members.map((member) => (
                      <li key={member.id}>
                        <div>
                          <strong>
                            {member.user.name}
                            {member.userId === userId ? " (tú)" : ""}
                          </strong>
                          <span className="member-email">
                            {member.user.email}
                          </span>
                        </div>
                        <div className="member-controls">
                          <select
                            aria-label={"Rol de " + member.user.name}
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
                            <option value="ADMIN">Administrador</option>
                            <option value="CONTRIBUTOR">Colaborador</option>
                            <option value="READER">Lector</option>
                          </select>
                          <button
                            className="button quiet destructive"
                            disabled={busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  "¿Retirar el acceso de " +
                                    member.user.name +
                                    "?",
                                )
                              )
                                void run(
                                  "/members/" + member.id,
                                  "DELETE",
                                  {},
                                  "Acceso retirado.",
                                );
                            }}
                          >
                            Retirar acceso
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
                <section
                  className="side-section"
                  aria-labelledby="pending-title"
                >
                  <h2 id="pending-title">Invitaciones</h2>
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
                                  PENDING: "Pendiente",
                                  ACCEPTED: "Aceptada",
                                  REVOKED: "Retirada",
                                  EXPIRED: "Vencida",
                                } as Record<string, string>
                              )[invite.status]
                            }
                          </span>
                          <span className="form-hint">
                            Vence el{" "}
                            {new Date(invite.expiresAt).toLocaleDateString(
                              "es",
                            )}
                            {invite.deliveryStatus === "FAILED"
                              ? " · Correo no enviado"
                              : ""}
                          </span>
                          {invite.status === "PENDING" ||
                          invite.status === "EXPIRED" ? (
                            <div className="row-actions">
                              <button
                                className="button quiet"
                                disabled={busy}
                                onClick={() =>
                                  void run(
                                    "/invitations",
                                    "POST",
                                    { email: invite.email, role: invite.role },
                                    "Se envió una nueva invitación. El enlace anterior ya no funciona.",
                                  )
                                }
                              >
                                Reenviar
                              </button>
                              {invite.status === "PENDING" ? (
                                <button
                                  className="button quiet destructive"
                                  disabled={busy}
                                  onClick={() =>
                                    void run(
                                      "/invitations/" + invite.id,
                                      "DELETE",
                                      {},
                                      "Invitación retirada.",
                                    )
                                  }
                                >
                                  Retirar
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">
                      Todavía no has enviado invitaciones.
                    </p>
                  )}
                </section>
              </>
            ) : (
              <section className="side-section">
                <span className="eyebrow">TU PARTICIPACIÓN</span>
                <h2>{roleLabels[view.role]}</h2>
                <p className="muted">
                  {canWrite
                    ? "Puedes registrar narradores y editar los perfiles que hayas creado. Un administrador puede ayudarte a gestionar el acceso."
                    : "Tu acceso está pensado para disfrutar de los cuentos y fragmentos publicados con tu familia."}
                </p>
              </section>
            )}
            <section className="side-section family-settings">
              {isAdmin ? (
                <details>
                  <summary>Cambiar nombre de la familia</summary>
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
                    <label>
                      Nombre
                      <input
                        name="name"
                        defaultValue={view.family.name}
                        required
                        maxLength={100}
                      />
                    </label>
                    <button className="button secondary" disabled={busy}>
                      Guardar nombre
                    </button>
                  </form>
                </details>
              ) : null}
              <button
                className="button quiet destructive"
                disabled={busy}
                onClick={async () => {
                  if (
                    window.confirm(
                      "¿Salir de esta familia? Necesitarás otra invitación para volver.",
                    )
                  ) {
                    if (
                      await run(
                        "/leave",
                        "POST",
                        {},
                        "Has salido de la familia.",
                      )
                    ) {
                      router.push("/families");
                      router.refresh();
                    }
                  }
                }}
              >
                Salir de esta familia
              </button>
            </section>
          </aside>
        ) : null}
      </div>
    </>
  );
}
