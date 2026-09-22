import { Camera, Phone, Printer } from "lucide-react";
import type { Item } from "../types";
import { done, sectionOf } from "../model";
import { operatorDayOrder } from "../moments";
import { useProject } from "../store";
import { Empty, Row, Screen } from "../ui";
import { itemsOf, MemberAvatar, titleOf } from "./common";

/**
 * Pack individuel d'un cadreur : uniquement ses plans, dans l'ordre réel de sa journée,
 * imprimable et lisible hors ligne — pas besoin de fouiller les 100+ plans du tournage
 * pour retrouver les siens.
 */
export default function MyPack({ operatorId }: { operatorId: string }) {
  const { project: p } = useProject();
  const member = p.items.find((i) => i.id === operatorId && i.module === "team");
  const stages = itemsOf(p, "stages");
  const shots = operatorDayOrder(p, operatorId);

  if (!member)
    return (
      <Screen title="Membre introuvable" backTo="/equipe">
        <Empty title="Ce membre n’existe plus" text="Il a peut-être été retiré de l’équipe." />
      </Screen>
    );

  type Group = { key: string; label: string; sub?: string; shots: Item[] };
  const groups: Group[] = [];
  for (const s of shots) {
    const stage = stages.find((st) => st.id === s.stageId);
    const key = stage?.id ?? sectionOf(s);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.shots.push(s);
    else {
      const venue = stage ? titleOf(p, stage.venueId) : undefined;
      const address = stage ? p.items.find((v) => v.id === stage.venueId)?.address : undefined;
      groups.push({
        key,
        label: stage ? `${String(stage.time || "—:—")} · ${stage.title}` : sectionOf(s),
        sub: [venue, address].filter(Boolean).join(" · ") || undefined,
        shots: [s],
      });
    }
  }

  return (
    <Screen
      title="Mes plans"
      backTo="/equipe"
      actions={
        <button className="icon-btn" aria-label="Imprimer / enregistrer en PDF" onClick={() => window.print()}>
          <Printer size={20} />
        </button>
      }
    >
      <div className="card no-print" style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <MemberAvatar member={member} projectId={p.id} />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{member.title}</h2>
          <p className="muted" style={{ margin: "2px 0 0" }}>
            {[member.role, member.camera].filter(Boolean).join(" · ") || "Rôle à définir"}
          </p>
        </div>
        {member.phone ? (
          <a className="icon-btn" href={"tel:" + String(member.phone).replace(/\s/g, "")} aria-label={"Appeler " + member.title}>
            <Phone size={18} />
          </a>
        ) : null}
      </div>

      <div className="card no-print" style={{ marginTop: 12 }}>
        <div className="section-title" style={{ margin: 0 }}>
          Ses plans
          <span>
            {shots.filter(done).length}/{shots.length} tournés
          </span>
        </div>
        <div className="progress" style={{ marginTop: 8 }}>
          <span style={{ width: `${shots.length ? (shots.filter(done).length / shots.length) * 100 : 0}%` }} />
        </div>
      </div>

      {groups.length ? (
        groups.map((g) => (
          <section key={g.key + g.shots[0].id} className="no-print">
            <div className="section-title">
              {g.label}
              {g.sub && <span>{g.sub}</span>}
            </div>
            <div className="list">
              {g.shots.map((s) => (
                <Row
                  key={s.id}
                  lead={<Camera size={18} />}
                  title={s.title}
                  sub={[s.framing, s.movement].filter(Boolean).join(" · ") || undefined}
                  done={done(s)}
                  trail={s.priority === "MUST HAVE" ? <span className="chip red">MUST HAVE</span> : undefined}
                />
              ))}
            </div>
          </section>
        ))
      ) : (
        <Empty
          icon={<Camera size={32} />}
          title="Aucun plan assigné"
          text={`Affectez ${member.title} à des plans depuis « Plans & scènes » pour qu’ils apparaissent ici.`}
        />
      )}

      <section className="print-report">
        <h1>VISIONNARY · {member.title}</h1>
        <p>
          {p.name} · {p.date}
        </p>
        <p>{[member.role, member.camera, member.phone].filter(Boolean).join(" · ")}</p>
        {groups.map((g) => (
          <div key={g.key + g.shots[0].id}>
            <h2>
              {g.label}
              {g.sub ? ` — ${g.sub}` : ""}
            </h2>
            {g.shots.map((s) => (
              <p key={s.id}>
                [{done(s) ? "x" : " "}] {s.title} — {[s.framing, s.movement].filter(Boolean).join(" · ") || "—"}
                {s.priority === "MUST HAVE" ? " · MUST HAVE" : ""}
              </p>
            ))}
          </div>
        ))}
      </section>
    </Screen>
  );
}
